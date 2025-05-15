
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
) {
  const { data: partner, error: fetchError } = await supabase
    .from('delivery_partners')
    .select('current_load, completed_orders, cancelled_orders')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    console.error(`[API updatePartnerMetrics] Failed to fetch partner ${partnerId}:`, { code: fetchError.code, message: fetchError.message, details: fetchError.details });
    return { success: false, message: `Failed to fetch partner ${partnerId} for metric update.` };
  }
  if (!partner) {
    console.error(`[API updatePartnerMetrics] Partner ${partnerId} not found.`);
    return { success: false, message: `Partner ${partnerId} not found for metric update.` };
  }

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
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, message: 'No metric changes required for partner.' };
  }

  const { error: updateError } = await supabase
    .from('delivery_partners')
    .update(updatePayload)
    .eq('id', partnerId);

  if (updateError) {
    console.error(`[API updatePartnerMetrics] Failed to update partner ${partnerId} metrics (${actionDescription}):`, { code: updateError.code, message: updateError.message, details: updateError.details });
    return { success: false, message: `Failed to update partner ${partnerId.substring(0,8)}... metrics (${actionDescription}). Check server logs.` };
  }
  return { success: true, message: `Partner ${partnerId.substring(0,8)}... metrics updated (${actionDescription}).` };
}


// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id: orderId } = context.params;
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: (e as Error).message }, { status: 400 });
  }

  const { status: newOrderStatus, assignedPartnerId } = requestBody;

  if (!newOrderStatus) {
    return NextResponse.json({ message: 'New status is required in the request body.' }, { status: 400 });
  }

  const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
    return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  let originalAssignedPartnerId: string | null = null;

  const { data: currentOrderData, error: fetchCurrentOrderError } = await supabase
      .from('orders')
      .select('assigned_to, status')
      .eq('id', orderId)
      .single();

  if (fetchCurrentOrderError) {
      console.error(`[API PUT /api/orders/${orderId}/status] Error fetching current order details:`, { code: fetchCurrentOrderError.code, message: fetchCurrentOrderError.message, details: fetchCurrentOrderError.details });
      if (fetchCurrentOrderError.code === 'PGRST116') {
          return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ message: `Database error fetching current order details. Check server logs.` }, { status: 500 });
  }
  if (currentOrderData) {
      originalAssignedPartnerId = currentOrderData.assigned_to;
  } else {
      return NextResponse.json({ message: `Order with ID ${orderId} not found (no data returned).` }, { status: 404 });
  }

  // Update Order
  const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    orderUpdateData.assigned_to = assignedPartnerId;
  } else if (newOrderStatus === 'pending' || newOrderStatus === 'cancelled') {
    orderUpdateData.assigned_to = null; 
  }

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
      message: `Order update failed. Check server logs.`,
      error: `Supabase Code: ${orderUpdateError.code}`
    }, { status: 500 });
  }
  if (!updatedOrderData) {
    return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
  }
  
  // Handle assignments table and partner metrics
  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    const assignmentLogData = {
      order_id: orderId,
      partner_id: assignedPartnerId,
      status: 'success', // Default to 'success' to satisfy NOT NULL and CHECK constraints
    };
    const { data: assignmentData, error: assignmentInsertError } = await supabase
      .from('assignments')
      .insert(assignmentLogData)
      .select('*') 
      .single();

    if (assignmentInsertError || !assignmentData) {
      console.error(`[API PUT /api/orders/${orderId}/status] FAILED to create assignment record:`, assignmentInsertError ? { code: assignmentInsertError.code, message: assignmentInsertError.message, details: assignmentInsertError.details } : 'No data returned after insert.');
      return NextResponse.json({ message: `Order status updated, but FAILED to log assignment record. Please check server logs for details. Supabase Code: ${assignmentInsertError?.code}`, error: assignmentInsertError?.message }, { status: 500 });
    }
    
    const partnerLoadResult = await updatePartnerMetrics(assignedPartnerId, { type: 'increment_load' });
    if (!partnerLoadResult.success) {
        return NextResponse.json({ message: `Order assigned and logged, but partner metric update failed: ${partnerLoadResult.message}`, error: partnerLoadResult.message }, { status: 500 });
    }

  } else if (newOrderStatus === 'delivered' && originalAssignedPartnerId) {
    const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'decrement_load_and_increment_completed' });
    if (!partnerMetricsResult.success) {
        return NextResponse.json({ message: `Order marked delivered, but partner metric update failed: ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
    }
    
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({ status: 'success' }) 
      .eq('order_id', orderId)
      .eq('partner_id', originalAssignedPartnerId) 
      .order('created_at', { ascending: false }) 
      .limit(1);

    if (updateAssignmentError) {
      console.warn(`[API PUT /api/orders/${orderId}/status] Warning: Failed to update assignment record to success:`, { code: updateAssignmentError.code, message: updateAssignmentError.message, details: updateAssignmentError.details });
      // Non-critical, proceed but warn
    }

  } else if (newOrderStatus === 'cancelled') { // Explicitly handle cancelled
    if (originalAssignedPartnerId) {
      const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'decrement_load_and_increment_cancelled' });
      if (!partnerMetricsResult.success) {
          return NextResponse.json({ message: `Order marked cancelled, but partner metric update failed: ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
      }

      const { error: updateAssignmentError } = await supabase
        .from('assignments')
        .update({ status: 'failed', reason: 'Order Cancelled' })
        .eq('order_id', orderId)
        .eq('partner_id', originalAssignedPartnerId)
        .order('created_at', { ascending: false })
        .limit(1); 
      if (updateAssignmentError) {
        console.warn(`[API PUT /api/orders/${orderId}/status] Warning: Failed to update assignment record to failed (cancelled):`, { code: updateAssignmentError.code, message: updateAssignmentError.message, details: updateAssignmentError.details });
        // Non-critical, proceed but warn
      }
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

  return NextResponse.json({
    message: `Status for order ${orderId.substring(0,8)}... updated successfully to ${newOrderStatus}.`,
    updatedOrder: finalUpdatedOrder
  });
}
