
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
    | { type: 'decrement_load_and_increment_completed' }
    | { type: 'decrement_load_and_increment_cancelled' }
    | { type: 'decrement_load_only'} // For report failure scenario where order goes back to pending
) {
  console.log(`[API updatePartnerMetrics] Updating metrics for partner ${partnerId} with action:`, metricAction.type);
  
  const { data: partner, error: fetchError } = await supabase
    .from('delivery_partners')
    .select('current_load, completed_orders, cancelled_orders')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    console.error(`[API updatePartnerMetrics] Failed to fetch partner ${partnerId}:`, { code: fetchError.code, message: fetchError.message, details: fetchError.details });
    return { success: false, message: `Failed to fetch partner ${partnerId} for metric update. Supabase: ${fetchError.message}` };
  }
  if (!partner) {
    console.error(`[API updatePartnerMetrics] Partner ${partnerId} not found.`);
    return { success: false, message: `Partner ${partnerId} not found for metric update.` };
  }
  console.log(`[API updatePartnerMetrics] Current metrics for partner ${partnerId}:`, partner);


  const updatePayload: Partial<Pick<Partner, 'current_load' | 'completed_orders' | 'cancelled_orders'>> = {};
  let actionDescription = "";

  switch (metricAction.type) {
    case 'increment_load':
      updatePayload.current_load = (partner.current_load || 0) + 1;
      actionDescription = "load incremented";
      break;
    case 'decrement_load_and_increment_completed':
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      updatePayload.completed_orders = (partner.completed_orders || 0) + 1;
      actionDescription = "load decremented, completed_orders incremented";
      break;
    case 'decrement_load_and_increment_cancelled':
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      updatePayload.cancelled_orders = (partner.cancelled_orders || 0) + 1;
      actionDescription = "load decremented, cancelled_orders incremented";
      break;
    case 'decrement_load_only':
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "load decremented";
      break;
  }
  console.log(`[API updatePartnerMetrics] Calculated update payload for partner ${partnerId}:`, updatePayload);

  if (Object.keys(updatePayload).length === 0) {
    console.log(`[API updatePartnerMetrics] No metric changes required for partner ${partnerId}.`);
    return { success: true, message: 'No metric changes required for partner.' };
  }

  const { error: updateError } = await supabase
    .from('delivery_partners')
    .update(updatePayload)
    .eq('id', partnerId);

  if (updateError) {
    console.error(`[API updatePartnerMetrics] Failed to update partner ${partnerId} metrics (${actionDescription}):`, { code: updateError.code, message: updateError.message, details: updateError.details });
    return { success: false, message: `Failed to update partner ${partnerId.substring(0,8)}... metrics (${actionDescription}). Supabase: ${updateError.message}` };
  }
  console.log(`[API updatePartnerMetrics] Successfully updated metrics for partner ${partnerId} (${actionDescription}).`);
  return { success: true, message: `Partner ${partnerId.substring(0,8)}... metrics updated (${actionDescription}).` };
}


// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params;
  console.log(`[API PUT /api/orders/${orderId}/status] Received request.`);
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    console.error(`[API PUT /api/orders/${orderId}/status] Invalid JSON body:`, e);
    return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: (e as Error).message }, { status: 400 });
  }

  const { status: newOrderStatus, assignedPartnerId } = requestBody;
  console.log(`[API PUT /api/orders/${orderId}/status] Request body parsed: newStatus=${newOrderStatus}, assignedPartnerId=${assignedPartnerId}`);


  if (!newOrderStatus) {
    return NextResponse.json({ message: 'New status is required in the request body.' }, { status: 400 });
  }

  const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
    return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  let originalAssignedPartnerId: string | null = null;

  // Fetch current order details to get originalAssignedPartnerId
  const { data: currentOrderData, error: fetchCurrentOrderError } = await supabase
      .from('orders')
      .select('assigned_to, status')
      .eq('id', orderId)
      .single();

  if (fetchCurrentOrderError) {
      console.error(`[API PUT /api/orders/${orderId}/status] Error fetching current order details:`, { code: fetchCurrentOrderError.code, message: fetchCurrentOrderError.message, details: fetchCurrentOrderError.details });
      if (fetchCurrentOrderError.code === 'PGRST116') { // "Actual num rows 0 differs from expected 1"
          return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ message: `Database error fetching current order details. Supabase: ${fetchCurrentOrderError.message}` }, { status: 500 });
  }
  if (!currentOrderData) { // Should be caught by PGRST116, but as a fallback
      return NextResponse.json({ message: `Order with ID ${orderId} not found (no data returned).` }, { status: 404 });
  }
  originalAssignedPartnerId = currentOrderData.assigned_to;
  console.log(`[API PUT /api/orders/${orderId}/status] Current order details: originalAssignedPartnerId=${originalAssignedPartnerId}, currentStatus=${currentOrderData.status}`);

  // Prepare order update data
  const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    orderUpdateData.assigned_to = assignedPartnerId;
  } else if (newOrderStatus === 'pending' || newOrderStatus === 'cancelled') {
    // When cancelling or reverting to pending, ensure partner is cleared from order
    orderUpdateData.assigned_to = null; 
  }
  console.log(`[API PUT /api/orders/${orderId}/status] Order update payload:`, orderUpdateData);


  // Update Order in database
  const { data: updatedOrderData, error: orderUpdateError } = await supabase
    .from('orders')
    .update(orderUpdateData)
    .eq('id', orderId)
    .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
    .single();

  if (orderUpdateError) {
    console.error(`[API PUT /api/orders/${orderId}/status] Order update failed:`, { code: orderUpdateError.code, message: orderUpdateError.message, details: orderUpdateError.details });
    if (orderUpdateError.code === 'PGRST116') { 
      return NextResponse.json({ message: `Order with ID ${orderId} not found during update.` }, { status: 404 });
    }
    return NextResponse.json({
      message: `Order update failed. Supabase: ${orderUpdateError.message}`,
      error: `Supabase Code: ${orderUpdateError.code}`
    }, { status: 500 });
  }
  if (!updatedOrderData) { // Should be caught by PGRST116, but as a fallback
    return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
  }
  console.log(`[API PUT /api/orders/${orderId}/status] Order ${orderId} successfully updated in 'orders' table.`);
  
  // Handle assignments table and partner metrics
  let partnerMetricsUpdateResult = { success: true, message: "" };

  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    console.log(`[API PUT /api/orders/${orderId}/status] Order assigned to partner ${assignedPartnerId}. Logging assignment and updating partner load.`);
    const assignmentLogData = {
      order_id: orderId,
      partner_id: assignedPartnerId,
      status: 'success', // Default to 'success' for initial assignment log as per current constraints
    };
    const { data: assignmentData, error: assignmentInsertError } = await supabase
      .from('assignments')
      .insert(assignmentLogData)
      .select('*') 
      .single();

    if (assignmentInsertError || !assignmentData) {
      const errorMessage = `Failed to create assignment record for order ${orderId}. Supabase Code: ${assignmentInsertError?.code}. Message: ${assignmentInsertError?.message}. This is a critical issue.`;
      console.error(`[API PUT /api/orders/${orderId}/status] ${errorMessage}`, assignmentInsertError ? { code: assignmentInsertError.code, message: assignmentInsertError.message, details: assignmentInsertError.details } : 'No data returned after insert.');
      return NextResponse.json({ message: `Order status updated to '${newOrderStatus}', but ${errorMessage}`, error: assignmentInsertError?.message }, { status: 500 });
    }
    console.log(`[API PUT /api/orders/${orderId}/status] Successfully created assignment record ${assignmentData.id}.`);
    
    partnerMetricsUpdateResult = await updatePartnerMetrics(assignedPartnerId, { type: 'increment_load' });
    if (!partnerMetricsUpdateResult.success) {
        const errorMessage = `Order assigned and logged, but critical partner metric update (load increment) failed: ${partnerMetricsUpdateResult.message}`;
        console.error(`[API PUT /api/orders/${orderId}/status] ${errorMessage}`);
        return NextResponse.json({ message: errorMessage, error: partnerMetricsUpdateResult.message }, { status: 500 });
    }

  } else if (newOrderStatus === 'delivered' && originalAssignedPartnerId) {
    console.log(`[API PUT /api/orders/${orderId}/status] Order delivered by partner ${originalAssignedPartnerId}. Updating partner metrics and assignment record.`);
    partnerMetricsUpdateResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'decrement_load_and_increment_completed' });
    if (!partnerMetricsUpdateResult.success) {
        const errorMessage = `Order marked delivered, but critical partner metric update failed: ${partnerMetricsUpdateResult.message}`;
        console.error(`[API PUT /api/orders/${orderId}/status] ${errorMessage}`);
        return NextResponse.json({ message: errorMessage, error: partnerMetricsUpdateResult.message }, { status: 500 });
    }
    
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({ status: 'success' }) 
      .eq('order_id', orderId)
      .eq('partner_id', originalAssignedPartnerId) 
      .order('created_at', { ascending: false }) 
      .limit(1); // Update the latest assignment for this order-partner pair to 'success'

    if (updateAssignmentError) {
      // Non-critical for this flow, but good to note
      console.warn(`[API PUT /api/orders/${orderId}/status] Warning: Failed to update assignment record to success for delivered order:`, { code: updateAssignmentError.code, message: updateAssignmentError.message, details: updateAssignmentError.details });
       partnerMetricsUpdateResult.message += ` (Warning: assignment log update failed: ${updateAssignmentError.message})`;
    }

  } else if (newOrderStatus === 'cancelled') { 
    console.log(`[API PUT /api/orders/${orderId}/status] Order cancelled. Updating partner metrics and assignment if applicable.`);
    if (originalAssignedPartnerId) {
      partnerMetricsUpdateResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'decrement_load_and_increment_cancelled' });
      if (!partnerMetricsUpdateResult.success) {
          const errorMessage = `Order marked cancelled, but critical partner metric update failed: ${partnerMetricsUpdateResult.message}`;
          console.error(`[API PUT /api/orders/${orderId}/status] ${errorMessage}`);
          return NextResponse.json({ message: errorMessage, error: partnerMetricsUpdateResult.message }, { status: 500 });
      }

      const { error: updateAssignmentError } = await supabase
        .from('assignments')
        .update({ status: 'failed', reason: 'Order Cancelled' })
        .eq('order_id', orderId)
        .eq('partner_id', originalAssignedPartnerId)
        .order('created_at', { ascending: false })
        .limit(1); // Update the latest assignment for this order-partner pair to 'failed'
      if (updateAssignmentError) {
        console.warn(`[API PUT /api/orders/${orderId}/status] Warning: Failed to update assignment record to failed (cancelled):`, { code: updateAssignmentError.code, message: updateAssignmentError.message, details: updateAssignmentError.details });
        partnerMetricsUpdateResult.message += ` (Warning: assignment log update failed: ${updateAssignmentError.message})`;
      }
    } else {
        partnerMetricsUpdateResult = { success: true, message: "No partner was assigned to this cancelled order." }
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

  let finalMessage = `Status for order ${orderId.substring(0,8)}... updated successfully to ${newOrderStatus}.`;
  if (partnerMetricsUpdateResult.message) {
    finalMessage += ` ${partnerMetricsUpdateResult.message}`;
  }

  console.log(`[API PUT /api/orders/${orderId}/status] Successfully processed request. Sending response: ${finalMessage}`);
  return NextResponse.json({
    message: finalMessage,
    updatedOrder: finalUpdatedOrder
  });
}
