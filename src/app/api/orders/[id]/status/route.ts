
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params;

  try {
    const body = await request.json();
    const { status: newOrderStatus, assignedPartnerId } = body;

    if (!newOrderStatus) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered'];
    if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
      return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const orderUpdateData: { status: OrderStatus; assigned_to?: string | null } = { status: newOrderStatus as OrderStatus };
    if (assignedPartnerId && newOrderStatus === 'assigned') {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (newOrderStatus === 'pending') {
      orderUpdateData.assigned_to = null;
    }

    const { data: updatedOrderData, error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', orderId)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (orderUpdateError) {
      if (orderUpdateError.code === 'PGRST116') {
        return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}` }, { status: 500 });
    }

    if (!updatedOrderData) {
      return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
    }

    let partnerLoadUpdateMessage = "";
    let assignmentLoggedSuccessfully = true;
    let assignmentLogError = "";


    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      // Create base assignment record
      // The `status` and `reason` fields in the `assignments` table
      // are intended for later updates (e.g., by an admin after delivery outcome).
      // The database `CHECK (status IN ('success', 'failed'))` and potential `NOT NULL`
      // constraint on `status` mean we cannot set an intermediate system status here.
      // This insert will rely on the database schema:
      // - If `assignments.status` is nullable, it will be NULL.
      // - If `assignments.status` is NOT NULL and has a DEFAULT, that default will be used.
      // - If `assignments.status` is NOT NULL and has NO DEFAULT, this insert will fail,
      //   which is the correct behavior as the application cannot satisfy the constraint.
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        // DO NOT set `status` here if it's constrained to 'success'/'failed'
        // and the outcome isn't known yet.
      };

      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('id')
        .single();

      if (assignmentInsertError) {
        assignmentLoggedSuccessfully = false;
        assignmentLogError = `Failed to create assignment record: ${assignmentInsertError.message}. This is a critical issue. Supabase Code: ${assignmentInsertError.code}`;
        return NextResponse.json({
          message: `Order status updated to '${newOrderStatus}', but FAILED to log assignment record. Please check server logs for details. Supabase: ${assignmentLogError}`,
          error: assignmentLogError
        }, { status: 500 });
      }

      if (!assignmentData && assignmentLoggedSuccessfully) {
          assignmentLoggedSuccessfully = false;
          assignmentLogError = 'Failed to confirm assignment record creation (no data returned after insert despite no error). This is a critical issue.';
          return NextResponse.json({
              message: `Order status updated to '${newOrderStatus}', but FAILED to confirm assignment record creation. Please check server logs.`,
              error: assignmentLogError
          }, { status: 500 });
      }

      // Attempt to update partner load (auxiliary task)
      try {
        const { data: partnerData, error: partnerFetchError } = await supabase
          .from('delivery_partners')
          .select('current_load')
          .eq('id', assignedPartnerId)
          .single();

        if (partnerFetchError) {
          partnerLoadUpdateMessage = `Warning: Failed to fetch partner ${assignedPartnerId} for load update: ${partnerFetchError.message}.`;
        } else if (!partnerData) {
          partnerLoadUpdateMessage = `Warning: Partner ${assignedPartnerId} not found for load update.`;
        } else {
          const newLoad = (partnerData.current_load || 0) + 1;
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            partnerLoadUpdateMessage = `Warning: Failed to update partner ${assignedPartnerId} load: ${partnerUpdateError.message}`;
          } else {
            partnerLoadUpdateMessage = `Partner ${assignedPartnerId.substring(0,8)}... load incremented.`;
          }
        }
      } catch (e) {
          partnerLoadUpdateMessage = `Warning: Unexpected error during partner load update: ${(e as Error).message}`;
      }
    }

    const finalUpdatedOrder: Order = {
      id: updatedOrderData.id,
      customerName: updatedOrderData.customer_name,
      customerPhone: updatedOrderData.customer_phone || undefined,
      items: updatedOrderData.items || [],
      status: updatedOrderData.status as OrderStatus,
      area: updatedOrderData.area,
      creationDate: updatedOrderData.created_at,
      deliveryAddress: updatedOrderData.customer_address,
      assignedPartnerId: updatedOrderData.assigned_to,
      orderValue: updatedOrderData.total_amount,
    };

    let successMessage = `Status for order ${orderId.substring(0,8)}... updated successfully to ${newOrderStatus}.`;
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
        if (assignmentLoggedSuccessfully) {
            successMessage += ` Assignment logged successfully.`;
        }
        if (partnerLoadUpdateMessage) { // Append warning if partner load update had issues
            successMessage += ` ${partnerLoadUpdateMessage}`;
        }
    }

    return NextResponse.json({
      message: successMessage,
      updatedOrder: finalUpdatedOrder
    });

  } catch (e) {
    const errorInstance = e as Error;
    let errorMessage = 'Unexpected server error during order update.';
     if (errorInstance instanceof SyntaxError && errorInstance.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: errorInstance.message }, { status: 400 });
    }
    const responseErrorMessage = errorInstance.message || String(e);
    return NextResponse.json({ message: errorMessage, error: responseErrorMessage }, { status: 500 });
  }
}
