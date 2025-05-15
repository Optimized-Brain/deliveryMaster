
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params;
  console.log(`[API PUT /api/orders/${orderId}/status] Received request.`);

  try {
    const body = await request.json();
    const { status: newOrderStatus, assignedPartnerId } = body;
    console.log(`[API PUT /api/orders/${orderId}/status] Received status: '${newOrderStatus}', assignedPartnerId: '${assignedPartnerId}'`);

    if (!newOrderStatus) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
      return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
    }
    
    // --- Logic for 'cancelled' status ---
    if (newOrderStatus === 'cancelled') {
      console.log(`[API PUT /api/orders/${orderId}/status] Processing 'cancelled' status.`);
      let currentAssignedPartnerId: string | null = null;

      // 1. Fetch current order to see if it's assigned
      const { data: currentOrderData, error: fetchOrderError } = await supabase
        .from('orders')
        .select('assigned_to')
        .eq('id', orderId)
        .single();
      
      if (fetchOrderError && fetchOrderError.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay if order doesn't exist
         console.error(`[API PUT /api/orders/${orderId}/status] Error fetching current order details for cancellation:`, fetchOrderError);
         return NextResponse.json({ message: `Failed to fetch current order details before cancellation: ${fetchOrderError.message}`, error: fetchOrderError.message }, { status: 500 });
      }
      if (currentOrderData) {
        currentAssignedPartnerId = currentOrderData.assigned_to;
      }
      console.log(`[API PUT /api/orders/${orderId}/status] Current assigned partner for cancellation: ${currentAssignedPartnerId}`);

      // 2. Update order status to 'cancelled' and clear assigned_to
      const { data: cancelledOrder, error: cancelOrderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', assigned_to: null })
        .eq('id', orderId)
        .select('id') // Just select id to confirm update
        .single();

      if (cancelOrderError) {
        console.error(`[API PUT /api/orders/${orderId}/status] Error updating order to 'cancelled':`, cancelOrderError);
        if (cancelOrderError.code === 'PGRST116') {
          return NextResponse.json({ message: `Order with ID ${orderId} not found for cancellation.` }, { status: 404 });
        }
        return NextResponse.json({ message: `Failed to cancel order: ${cancelOrderError.message}`, error: cancelOrderError.message }, { status: 500 });
      }
      if (!cancelledOrder) {
         console.error(`[API PUT /api/orders/${orderId}/status] Order not found after attempting to cancel (PGRST116 or no data returned).`);
         return NextResponse.json({ message: `Order with ID ${orderId} not found after cancellation attempt.` }, { status: 404 });
      }
      console.log(`[API PUT /api/orders/${orderId}/status] Order ${orderId} successfully marked as 'cancelled'.`);

      let partnerLoadUpdateMessage = "";
      let assignmentUpdateMessage = "";

      // 3. If a partner was assigned, decrement their load and update assignment record
      if (currentAssignedPartnerId) {
        // Decrement partner load
        try {
          const { data: partnerData, error: partnerFetchError } = await supabase
            .from('delivery_partners')
            .select('current_load')
            .eq('id', currentAssignedPartnerId)
            .single();

          if (partnerFetchError) {
            partnerLoadUpdateMessage = `Warning: Failed to fetch partner ${currentAssignedPartnerId} for load decrement: ${partnerFetchError.message}.`;
          } else if (!partnerData) {
            partnerLoadUpdateMessage = `Warning: Partner ${currentAssignedPartnerId} not found for load decrement.`;
          } else {
            const newLoad = Math.max(0, (partnerData.current_load || 0) - 1); 
            const { error: partnerUpdateError } = await supabase
              .from('delivery_partners')
              .update({ current_load: newLoad })
              .eq('id', currentAssignedPartnerId);
            if (partnerUpdateError) {
              partnerLoadUpdateMessage = `Warning: Failed to decrement partner ${currentAssignedPartnerId} load: ${partnerUpdateError.message}.`;
            } else {
              partnerLoadUpdateMessage = `Partner ${currentAssignedPartnerId.substring(0,8)}... load decremented.`;
            }
          }
        } catch (e) {
            partnerLoadUpdateMessage = `Warning: Unexpected error during partner load decrement for cancellation: ${(e as Error).message}.`;
        }
        console.log(`[API PUT /api/orders/${orderId}/status] Partner load update status: ${partnerLoadUpdateMessage}`);

        // Update assignment record status to 'failed' with reason 'Order Cancelled'
        const { error: updateAssignmentError } = await supabase
          .from('assignments')
          .update({ status: 'failed', reason: 'Order Cancelled' })
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }) 
          .limit(1) // Ensure only the latest assignment for this order is updated
          .select(); // Add select to check if a row was affected
        
        if (updateAssignmentError) {
            assignmentUpdateMessage = `Warning: Failed to update assignment record for cancelled order: ${updateAssignmentError.message}.`;
        } else {
            assignmentUpdateMessage = `Assignment record updated due to cancellation.`;
        }
        console.log(`[API PUT /api/orders/${orderId}/status] Assignment record update status: ${assignmentUpdateMessage}`);
      }
      
      let finalMessage = `Order ${orderId.substring(0,8)}... successfully cancelled.`;
      if (partnerLoadUpdateMessage) finalMessage += ` ${partnerLoadUpdateMessage}`;
      if (assignmentUpdateMessage) finalMessage += ` ${assignmentUpdateMessage}`;
      
      return NextResponse.json({ message: finalMessage });
    }

    // --- Logic for other status updates (pending, assigned, picked, delivered) ---
    const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (newOrderStatus === 'pending') { // Reverting to pending should clear partner
      orderUpdateData.assigned_to = null; 
    }
    // For 'picked' and 'delivered', assigned_to is not changed by status update alone.

    const { data: updatedOrderData, error: orderUpdateError } = await supabase
      .from('orders')
      .update(orderUpdateData)
      .eq('id', orderId)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (orderUpdateError) {
      console.error(`[API PUT /api/orders/${orderId}/status] Error updating order:`, orderUpdateError);
      if (orderUpdateError.code === 'PGRST116') {
        return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ 
        message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}`, 
        error: orderUpdateError.message 
      }, { status: 500 });
    }

    if (!updatedOrderData) {
      console.error(`[API PUT /api/orders/${orderId}/status] Order not found after update attempt (PGRST116 or no data).`);
      return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
    }
    console.log(`[API PUT /api/orders/${orderId}/status] Order ${orderId} status updated to '${newOrderStatus}'.`);

    let partnerLoadUpdateMessage = "";
    let assignmentLoggedMessage = "";

    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      // Create base assignment record
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        status: 'success', // To satisfy NOT NULL and CHECK (status IN ('success', 'failed'))
      };
      console.log(`[API PUT /api/orders/${orderId}/status] Attempting to create base assignment record:`, assignmentLogData);
      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('*') 
        .single();

      if (assignmentInsertError) {
        console.error(`[API PUT /api/orders/${orderId}/status] CRITICAL: Failed to create assignment record:`, assignmentInsertError);
        return NextResponse.json({
          message: `Order status updated to '${newOrderStatus}', but FAILED to log assignment record: ${assignmentInsertError.message}. This is a critical issue. Supabase Code: ${assignmentInsertError.code}`,
          error: assignmentInsertError.message,
          details: String(assignmentInsertError.details ?? '')
        }, { status: 500 });
      } else if (!assignmentData) {
          console.error(`[API PUT /api/orders/${orderId}/status] CRITICAL: Failed to confirm assignment record creation (no data returned).`);
           return NextResponse.json({
              message: `Order status updated to '${newOrderStatus}', but FAILED to confirm assignment record creation (no data returned). This could be an RLS issue or other misconfiguration. This is a critical issue.`,
              error: 'Failed to confirm assignment record creation (no data returned).'
          }, { status: 500 });
      } else {
        assignmentLoggedMessage = `Assignment successfully logged (ID: ${assignmentData.id}).`;
        console.log(`[API PUT /api/orders/${orderId}/status] ${assignmentLoggedMessage}`);
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
            partnerLoadUpdateMessage = `Warning: Failed to update partner ${assignedPartnerId} load: ${partnerUpdateError.message}.`;
          } else {
            partnerLoadUpdateMessage = `Partner ${assignedPartnerId.substring(0,8)}... load incremented.`;
          }
        }
      } catch (e) {
          partnerLoadUpdateMessage = `Warning: Unexpected error during partner load update: ${(e as Error).message}.`;
      }
      console.log(`[API PUT /api/orders/${orderId}/status] Partner load update status: ${partnerLoadUpdateMessage}`);
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
      orderValue: Number(updatedOrderData.total_amount) || 0,
    };

    let successMessage = `Status for order ${orderId.substring(0,8)}... updated successfully to ${newOrderStatus}.`;
    if (assignmentLoggedMessage) successMessage += ` ${assignmentLoggedMessage}`;
    if (partnerLoadUpdateMessage) successMessage += ` ${partnerLoadUpdateMessage}`;

    return NextResponse.json({
      message: successMessage,
      updatedOrder: finalUpdatedOrder
    });

  } catch (e) {
    const errorInstance = e as Error;
    let errorMessage = 'Unexpected server error during order update.';
     if (errorInstance instanceof SyntaxError && errorInstance.message.includes('JSON')) {
        console.error(`[API PUT /api/orders/${orderId}/status] Invalid JSON in request body:`, e);
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: errorInstance.message }, { status: 400 });
    }
    const responseErrorMessage = errorInstance.message || String(e);
    console.error(`[API PUT /api/orders/${orderId}/status] Unexpected server error:`, e);
    return NextResponse.json({ message: errorMessage, error: responseErrorMessage }, { status: 500 });
  }
}
