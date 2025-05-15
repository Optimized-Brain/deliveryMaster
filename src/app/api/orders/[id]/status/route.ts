
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params;
  console.log(`PUT /api/orders/${orderId}/status: Received request for order ID: ${orderId}`);

  try {
    const body = await request.json();
    const { status, assignedPartnerId } = body;

    console.log(`PUT /api/orders/${orderId}/status: Received status: '${status}', assignedPartnerId: '${assignedPartnerId}'`);

    if (!status) {
      console.warn(`PUT /api/orders/${orderId}/status: Status is required in request body.`);
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered'];
    if (!validStatuses.includes(status as OrderStatus)) {
      console.warn(`PUT /api/orders/${orderId}/status: Invalid status provided: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
      return NextResponse.json({ message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Main update data for the order
    const orderUpdateData: { status: OrderStatus; assigned_to?: string | null } = { status: status as OrderStatus };
    if (assignedPartnerId && status === 'assigned') { // Only set assigned_to if status is 'assigned'
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (status === 'pending') { // if moving to pending, clear partner
      orderUpdateData.assigned_to = null;
    }


    console.log(`PUT /api/orders/${orderId}/status: Attempting to update order with data:`, orderUpdateData);
    const { data: updatedOrderData, error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', orderId)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (orderUpdateError) {
      console.error(`PUT /api/orders/${orderId}/status: Error updating order in Supabase:`, orderUpdateError);
      if (orderUpdateError.code === 'PGRST116') { // "Resource not found"
        return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      // For other errors, include Supabase message
      return NextResponse.json({ message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}` }, { status: 500 });
    }

    if (!updatedOrderData) {
      console.warn(`PUT /api/orders/${orderId}/status: Order not found after update attempt (no data returned).`);
      return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
    }

    console.log(`PUT /api/orders/${orderId}/status: Order ${orderId} updated successfully to status ${status}.`);

    // If order is assigned, update partner load and create a base assignment record
    if (status === 'assigned' && assignedPartnerId) {
      console.log(`PUT /api/orders/${orderId}/status: Order assigned to partner ${assignedPartnerId}. Processing partner load and assignment log.`);

      // 1. Attempt to Increment Partner Load
      try {
        const { data: partnerData, error: partnerFetchError } = await supabase
          .from('delivery_partners')
          .select('current_load')
          .eq('id', assignedPartnerId)
          .single();

        if (partnerFetchError || !partnerData) {
          const errorMsg = `Failed to fetch partner ${assignedPartnerId} for load update: ${partnerFetchError?.message || 'Partner not found.'}`;
          console.error(`PUT /api/orders/${orderId}/status: ${errorMsg}`);
          // Continue to log assignment even if partner load update fails, but log this issue.
        } else {
          const newLoad = (partnerData.current_load || 0) + 1;
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            const errorMsg = `Error updating partner ${assignedPartnerId} load: ${partnerUpdateError.message}`;
            console.error(`PUT /api/orders/${orderId}/status: ${errorMsg}`);
          } else {
            console.log(`PUT /api/orders/${orderId}/status: Partner ${assignedPartnerId} load updated to ${newLoad}.`);
          }
        }
      } catch (e) {
          const errorMsg = `Unexpected error during partner load update for partner ${assignedPartnerId}: ${(e as Error).message}`;
          console.error(`PUT /api/orders/${orderId}/status: ${errorMsg}`);
      }

      // 2. Create Base Assignment Record
      // 'status' and 'reason' in the 'assignments' table are for admin input regarding delivery/pickup outcome.
      // They are not set by the system during initial assignment.
      try {
        const assignmentLogData = {
          order_id: orderId,
          partner_id: assignedPartnerId,
          // timestamp is likely set by database default 'now()'
        };
        const { error: assignmentInsertError } = await supabase
          .from('assignments')
          .insert(assignmentLogData)
          .select(); // Add select if you need the created record's ID, e.g.

        if (assignmentInsertError) {
          console.error(`PUT /api/orders/${orderId}/status: Error creating base assignment record:`, assignmentInsertError);
          // This is a failure to log, but the primary order assignment might have succeeded.
        } else {
          console.log(`PUT /api/orders/${orderId}/status: Base assignment record created for order ${orderId}, partner ${assignedPartnerId}.`);
        }
      } catch (e) {
        console.error(`PUT /api/orders/${orderId}/status: Unexpected error during base assignment record creation for order ${orderId}:`, e);
      }
    }

    const finalUpdatedOrder: Order = {
      id: updatedOrderData.id,
      customerName: updatedOrderData.customer_name,
      customerPhone: updatedOrderData.customer_phone,
      items: updatedOrderData.items || [],
      status: updatedOrderData.status as OrderStatus,
      area: updatedOrderData.area,
      creationDate: updatedOrderData.created_at,
      deliveryAddress: updatedOrderData.customer_address,
      assignedPartnerId: updatedOrderData.assigned_to,
      orderValue: updatedOrderData.total_amount,
    };

    return NextResponse.json({
      message: `Status for order ${orderId} updated successfully to ${status}. Associated tasks (partner load, assignment log) processed.`,
      updatedOrder: finalUpdatedOrder
    });

  } catch (e) {
    console.error(`PUT /api/orders/${orderId}/status: Unexpected error processing request:`, e);
    const errorInstance = e as Error;
    let errorMessage = 'Unexpected server error during order update.';
     if (errorInstance instanceof SyntaxError && errorInstance.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: errorInstance.message }, { status: 400 });
    }
    return NextResponse.json({ message: errorMessage, error: errorInstance.message || String(e) }, { status: 500 });
  }
}
