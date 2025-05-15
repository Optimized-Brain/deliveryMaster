
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

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
      return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Fetch current order details if cancelling, to get assigned_partner_id for load decrement
    let currentOrderAssignedTo: string | null = null;
    if (newOrderStatus === 'cancelled') {
      const { data: currentOrderData, error: fetchError } = await supabase
        .from('orders')
        .select('assigned_to')
        .eq('id', orderId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore if order not found, proceed to update
         return NextResponse.json({ message: `Failed to fetch current order details before cancellation: ${fetchError.message}` }, { status: 500 });
      }
      if (currentOrderData) {
        currentOrderAssignedTo = currentOrderData.assigned_to;
      }
    }


    const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (newOrderStatus === 'pending' || newOrderStatus === 'cancelled') {
      orderUpdateData.assigned_to = null; // Clear partner assignment for pending or cancelled
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
    let assignmentLoggedSuccessfully = false;
    let assignmentLogError = "";

    // Logic for 'assigned' status
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        status: 'success', // To satisfy NOT NULL and CHECK (status IN ('success', 'failed'))
      };

      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('*')
        .single();

      if (assignmentInsertError) {
        assignmentLoggedSuccessfully = false;
        assignmentLogError = `Failed to create assignment record: ${assignmentInsertError.message}. This is a critical issue. Supabase Code: ${assignmentInsertError.code}`;
        return NextResponse.json({
          message: `Order status updated to '${newOrderStatus}', but FAILED to log assignment record. Please check server logs for details. Supabase error: ${assignmentLogError}`,
          error: assignmentLogError
        }, { status: 500 });
      } else if (!assignmentData) {
          assignmentLoggedSuccessfully = false;
          assignmentLogError = 'Failed to confirm assignment record creation (no data returned after insert despite no error). This could be an RLS issue. This is a critical issue.';
           return NextResponse.json({
              message: `Order status updated to '${newOrderStatus}', but FAILED to confirm assignment record creation (no data returned). Please check server logs. Error: ${assignmentLogError}`,
              error: assignmentLogError
          }, { status: 500 });
      } else {
        assignmentLoggedSuccessfully = true;
      }

      // Increment partner load
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
    // Logic for 'cancelled' status
    else if (newOrderStatus === 'cancelled' && currentOrderAssignedTo) {
      // Decrement partner load
      try {
        const { data: partnerData, error: partnerFetchError } = await supabase
          .from('delivery_partners')
          .select('current_load')
          .eq('id', currentOrderAssignedTo)
          .single();

        if (partnerFetchError) {
          partnerLoadUpdateMessage = `Warning: Failed to fetch partner ${currentOrderAssignedTo} for load decrement: ${partnerFetchError.message}.`;
        } else if (!partnerData) {
          partnerLoadUpdateMessage = `Warning: Partner ${currentOrderAssignedTo} not found for load decrement.`;
        } else {
          const newLoad = Math.max(0, (partnerData.current_load || 0) - 1); // Ensure load doesn't go below 0
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', currentOrderAssignedTo);

          if (partnerUpdateError) {
            partnerLoadUpdateMessage = `Warning: Failed to decrement partner ${currentOrderAssignedTo} load: ${partnerUpdateError.message}`;
          } else {
            partnerLoadUpdateMessage = `Partner ${currentOrderAssignedTo.substring(0,8)}... load decremented.`;
          }
        }
      } catch (e) {
          partnerLoadUpdateMessage = `Warning: Unexpected error during partner load decrement for cancellation: ${(e as Error).message}`;
      }
      
      // Update assignment record status to 'failed' with reason 'Order Cancelled'
      const { error: updateAssignmentError } = await supabase
        .from('assignments')
        .update({ status: 'failed', reason: 'Order Cancelled' })
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }) // Target the latest assignment for this order
        .limit(1); // Update only the latest one
      
      if (updateAssignmentError) {
          partnerLoadUpdateMessage += ` Warning: Failed to update assignment record for cancelled order: ${updateAssignmentError.message}.`;
      } else {
          partnerLoadUpdateMessage += ` Assignment record updated for cancellation.`;
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
        if (partnerLoadUpdateMessage) {
            successMessage += ` ${partnerLoadUpdateMessage}`;
        }
    } else if (newOrderStatus === 'cancelled' && partnerLoadUpdateMessage) {
        successMessage += ` ${partnerLoadUpdateMessage}`;
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
