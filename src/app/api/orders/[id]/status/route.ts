
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order, Partner } from '@/lib/types';

interface Params {
  id: string;
}

async function updatePartnerMetrics(
  partnerId: string,
  metricAction:
    | { type: 'increment_load' }
    | { type: 'decrement_load_generic' } // For general load decrement like issue reporting
    | { type: 'order_delivered' }
    | { type: 'order_cancelled' }
) {
  const { data: partner, error: fetchError } = await supabase
    .from('delivery_partners')
    .select('current_load, completed_orders, cancelled_orders')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    return { success: false, message: `Failed to fetch partner ${partnerId} for metric update: ${fetchError.message}` };
  }
  if (!partner) {
    return { success: false, message: `Partner ${partnerId} not found for metric update.` };
  }

  const updatePayload: Partial<Pick<Partner, 'current_load' | 'completed_orders' | 'cancelled_orders'>> = {};
  let actionDescription = "";

  switch (metricAction.type) {
    case 'increment_load':
      updatePayload.current_load = (partner.current_load || 0) + 1;
      actionDescription = "load incremented";
      break;
    case 'decrement_load_generic':
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "load decremented";
      break;
    case 'order_delivered':
      updatePayload.completed_orders = (partner.completed_orders || 0) + 1;
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "completed_orders incremented, load decremented";
      break;
    case 'order_cancelled':
      updatePayload.cancelled_orders = (partner.cancelled_orders || 0) + 1;
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "cancelled_orders incremented, load decremented";
      break;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, message: 'No metric changes required for partner.' };
  }

  const { error: updateError } = await supabase
    .from('delivery_partners')
    .update(updatePayload)
    .eq('id', partnerId);

  if (updateError) {
    return { success: false, message: `Failed to update partner ${partnerId.substring(0,8)}... metrics (${actionDescription}): ${updateError.message}` };
  }
  return { success: true, message: `Partner ${partnerId.substring(0,8)}... metrics updated (${actionDescription}).` };
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

    // Fetch current order to get original assigned_to if status changes that impact partner metrics
    let originalAssignedPartnerId: string | null = null;
    const { data: currentOrderData, error: fetchCurrentOrderError } = await supabase
        .from('orders')
        .select('assigned_to, status')
        .eq('id', orderId)
        .single();

    if (fetchCurrentOrderError && fetchCurrentOrderError.code !== 'PGRST116') { // PGRST116 = 0 rows, which is fine if order is new
        return NextResponse.json({ message: `Critical error fetching current order details: ${fetchCurrentOrderError.message}` }, { status: 500 });
    }
    if (currentOrderData) {
        originalAssignedPartnerId = currentOrderData.assigned_to;
    }


    // Update Order
    const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (newOrderStatus === 'pending' || newOrderStatus === 'cancelled') {
      orderUpdateData.assigned_to = null; // Clear assignment if cancelled or reverted to pending
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
      return NextResponse.json({
        message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}. Supabase Code: ${orderUpdateError.code}`,
        error: orderUpdateError.message
      }, { status: 500 });
    }
    if (!updatedOrderData) {
      return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
    }

    let partnerMetricUpdateMessage = "";
    let assignmentLogMessage = "";


    // Handle assignments table and partner metrics
    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        status: 'success', // Default to 'success' to satisfy NOT NULL and CHECK constraints.
      };
      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('*') 
        .single();

      if (assignmentInsertError || !assignmentData) {
        return NextResponse.json({
          message: `Order status updated to '${newOrderStatus}', but FAILED to create assignment record: ${assignmentInsertError?.message || 'No data returned after insert.'}. This is a critical issue. Supabase Code: ${assignmentInsertError?.code}`,
          error: assignmentInsertError?.message || 'Failed to confirm assignment record creation (no data returned).'
        }, { status: 500 });
      }
      assignmentLogMessage = `Assignment successfully logged (ID: ${assignmentData.id}).`;

      const partnerLoadResult = await updatePartnerMetrics(assignedPartnerId, { type: 'increment_load' });
      if (!partnerLoadResult.success) {
        return NextResponse.json({ message: `Order assigned and logged, but ${partnerLoadResult.message}`, error: partnerLoadResult.message }, { status: 500 });
      }
      partnerMetricUpdateMessage = partnerLoadResult.message;

    } else if (newOrderStatus === 'delivered' && originalAssignedPartnerId) {
      const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'order_delivered' });
      if (!partnerMetricsResult.success) {
        return NextResponse.json({ message: `Order marked delivered, but ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
      }
      partnerMetricUpdateMessage = partnerMetricsResult.message;
      
      const { error: updateAssignmentError } = await supabase
        .from('assignments')
        .update({ status: 'success' })
        .eq('order_id', orderId)
        .eq('partner_id', originalAssignedPartnerId) 
        .order('created_at', { ascending: false })
        .limit(1); // Update latest assignment for this order-partner pair
      if (updateAssignmentError) {
        assignmentLogMessage = `Warning: Failed to update assignment record to success: ${updateAssignmentError.message}.`;
      } else {
        assignmentLogMessage = "Assignment record updated to success.";
      }

    } else if (newOrderStatus === 'cancelled' && originalAssignedPartnerId) {
      const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'order_cancelled' });
       if (!partnerMetricsResult.success) {
        return NextResponse.json({ message: `Order marked cancelled, but ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
      }
      partnerMetricUpdateMessage = partnerMetricsResult.message;

      const { error: updateAssignmentError } = await supabase
        .from('assignments')
        .update({ status: 'failed', reason: 'Order Cancelled' })
        .eq('order_id', orderId)
        .eq('partner_id', originalAssignedPartnerId)
        .order('created_at', { ascending: false })
        .limit(1); 
      if (updateAssignmentError) {
        assignmentLogMessage = `Warning: Failed to update assignment record to failed (cancelled): ${updateAssignmentError.message}.`;
      } else {
        assignmentLogMessage = "Assignment record updated to failed (cancelled).";
      }
    }

    const finalUpdatedOrder: Order = {
      id: updatedOrderData.id,
      customerName: updatedOrderData.customer_name,
      customerPhone: updatedOrderData.customer_phone || undefined,
      items: updatedOrderData.items || [],
      status: updatedOrderData.status.toLowerCase() as OrderStatus,
      area: updatedOrderData.area,
      creationDate: updatedOrderData.created_at,
      deliveryAddress: updatedOrderData.customer_address,
      assignedPartnerId: updatedOrderData.assigned_to,
      orderValue: Number(updatedOrderData.total_amount) || 0,
    };

    let successMessage = `Status for order ${orderId.substring(0,8)}... updated successfully to ${newOrderStatus}.`;
    if (assignmentLogMessage) successMessage += ` ${assignmentLogMessage}`;
    if (partnerMetricUpdateMessage) successMessage += ` ${partnerMetricUpdateMessage}`;


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
