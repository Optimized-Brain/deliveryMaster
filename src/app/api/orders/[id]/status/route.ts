
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params; // Renamed for clarity
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
    if (assignedPartnerId) {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (status === 'pending') {
      orderUpdateData.assigned_to = null; // Clear partner if order moved to pending
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
      if (orderUpdateError.code === 'PGRST116') {
        return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}` }, { status: 500 });
    }

    if (!updatedOrderData) {
      console.warn(`PUT /api/orders/${orderId}/status: Order not found after update attempt (no data returned).`);
      return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
    }

    console.log(`PUT /api/orders/${orderId}/status: Order ${orderId} updated successfully to status ${status}.`);

    // If order is assigned, update partner load and create assignment record
    if (status === 'assigned' && assignedPartnerId) {
      console.log(`PUT /api/orders/${orderId}/status: Order assigned to partner ${assignedPartnerId}. Updating partner load and creating assignment record.`);

      // 1. Increment Partner Load
      try {
        const { data: partnerData, error: partnerFetchError } = await supabase
          .from('delivery_partners')
          .select('current_load')
          .eq('id', assignedPartnerId)
          .single();

        if (partnerFetchError || !partnerData) {
          console.error(`PUT /api/orders/${orderId}/status: Error fetching partner ${assignedPartnerId} for load update:`, partnerFetchError);
          // Continue, but log that partner load wasn't updated. The main order update succeeded.
          // Or, you could choose to return an error here if partner load update is critical.
        } else {
          const newLoad = (partnerData.current_load || 0) + 1;
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            console.error(`PUT /api/orders/${orderId}/status: Error updating partner ${assignedPartnerId} load:`, partnerUpdateError);
            // Log error, but don't fail the entire operation if order update and assignment creation succeed.
          } else {
            console.log(`PUT /api/orders/${orderId}/status: Partner ${assignedPartnerId} load updated to ${newLoad}.`);
          }
        }
      } catch (e) {
          console.error(`PUT /api/orders/${orderId}/status: Unexpected error during partner load update for partner ${assignedPartnerId}:`, e);
      }


      // 2. Create Assignment Record
      try {
        const assignmentData = {
          order_id: orderId,
          partner_id: assignedPartnerId,
          assigned_at: new Date().toISOString(),
        };
        const { error: assignmentInsertError } = await supabase
          .from('assignments')
          .insert(assignmentData);

        if (assignmentInsertError) {
          console.error(`PUT /api/orders/${orderId}/status: Error creating assignment record:`, assignmentInsertError);
          // Log error, but don't fail the entire operation if order update itself succeeded.
        } else {
          console.log(`PUT /api/orders/${orderId}/status: Assignment record created for order ${orderId} and partner ${assignedPartnerId}.`);
        }
      } catch (e) {
        console.error(`PUT /api/orders/${orderId}/status: Unexpected error during assignment record creation for order ${orderId}:`, e);
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
