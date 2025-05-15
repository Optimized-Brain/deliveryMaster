
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
    | { type: 'decrement_load_generic' } 
    | { type: 'order_delivered' }
    | { type: 'order_cancelled' }
) {
  const { data: partner, error: fetchError } = await supabase
    .from('delivery_partners')
    .select('current_load, completed_orders, cancelled_orders')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    console.error(`[API updatePartnerMetrics] Failed to fetch partner ${partnerId}: ${fetchError.message}`);
    return { success: false, message: `Failed to fetch partner ${partnerId} for metric update: ${fetchError.message}` };
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
    case 'decrement_load_generic': // Used by 'report-failure' which already handles reverting to pending
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "load decremented (generic)";
      break;
    case 'order_delivered':
      updatePayload.completed_orders = (partner.completed_orders || 0) + 1;
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1);
      actionDescription = "completed_orders incremented, load decremented";
      break;
    case 'order_cancelled':
      updatePayload.cancelled_orders = (partner.cancelled_orders || 0) + 1;
      updatePayload.current_load = Math.max(0, (partner.current_load || 0) - 1); // Decrement load if cancelled while assigned
      actionDescription = "cancelled_orders incremented, load decremented";
      break;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { success: true, message: 'No metric changes required for partner.' };
  }
  console.log(`[API updatePartnerMetrics] Partner ${partnerId} payload:`, updatePayload);

  const { error: updateError } = await supabase
    .from('delivery_partners')
    .update(updatePayload)
    .eq('id', partnerId);

  if (updateError) {
    console.error(`[API updatePartnerMetrics] Failed to update partner ${partnerId} metrics (${actionDescription}): ${updateError.message}`);
    return { success: false, message: `Failed to update partner ${partnerId.substring(0,8)}... metrics (${actionDescription}): ${updateError.message}` };
  }
  console.log(`[API updatePartnerMetrics] Partner ${partnerId} metrics updated successfully (${actionDescription}).`);
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
  console.log(`[API PUT /api/orders/${orderId}/status] Received status: '${newOrderStatus}', assignedPartnerId: '${assignedPartnerId}'`);

  if (!newOrderStatus) {
    return NextResponse.json({ message: 'New status is required in the request body.' }, { status: 400 });
  }

  const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newOrderStatus as OrderStatus)) {
    return NextResponse.json({ message: `Invalid status: ${newOrderStatus}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Fetch current order to get original assigned_to if status changes that impact partner metrics
  let originalAssignedPartnerId: string | null = null;
  let currentOrderStatus: OrderStatus | null = null;

  const { data: currentOrderData, error: fetchCurrentOrderError } = await supabase
      .from('orders')
      .select('assigned_to, status')
      .eq('id', orderId)
      .single();

  if (fetchCurrentOrderError) {
      if (fetchCurrentOrderError.code === 'PGRST116') {
          return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
      }
      console.error(`[API PUT /api/orders/${orderId}/status] Critical error fetching current order details: ${fetchCurrentOrderError.message}`);
      return NextResponse.json({ message: `Critical error fetching current order details: ${fetchCurrentOrderError.message}` }, { status: 500 });
  }
  if (currentOrderData) {
      originalAssignedPartnerId = currentOrderData.assigned_to;
      currentOrderStatus = currentOrderData.status as OrderStatus;
  } else {
      // Should have been caught by PGRST116 but as a safeguard
      return NextResponse.json({ message: `Order with ID ${orderId} not found (no data returned).` }, { status: 404 });
  }

  // Update Order
  const orderUpdateData: Record<string, any> = { status: newOrderStatus as OrderStatus };
  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    orderUpdateData.assigned_to = assignedPartnerId;
  } else if (newOrderStatus === 'pending' || newOrderStatus === 'cancelled') {
    orderUpdateData.assigned_to = null; 
  }
  console.log(`[API PUT /api/orders/${orderId}/status] Order update data for Supabase:`, orderUpdateData);

  const { data: updatedOrderData, error: orderUpdateError } = await supabase
    .from('orders')
    .update(orderUpdateData)
    .eq('id', orderId)
    .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
    .single();

  if (orderUpdateError) {
    console.error(`[API PUT /api/orders/${orderId}/status] Order update failed: ${orderUpdateError.message}. Code: ${orderUpdateError.code}`);
    if (orderUpdateError.code === 'PGRST116') { // Should not happen if initial fetch worked, but defensively.
      return NextResponse.json({ message: `Order with ID ${orderId} not found during update.` }, { status: 404 });
    }
    return NextResponse.json({
      message: `Order update failed: ${orderUpdateError.message || 'Unknown Supabase error while updating order'}. Supabase Code: ${orderUpdateError.code}`,
      error: orderUpdateError.message
    }, { status: 500 });
  }
  if (!updatedOrderData) {
    // This case should ideally be covered by the .single() error handling above.
    console.error(`[API PUT /api/orders/${orderId}/status] Order with ID ${orderId} not found after update attempt (no data).`);
    return NextResponse.json({ message: `Order with ID ${orderId} not found after update attempt.` }, { status: 404 });
  }
  console.log(`[API PUT /api/orders/${orderId}/status] Order ${orderId} updated successfully in DB.`);

  let partnerMetricUpdateMessage = "";
  let assignmentLogMessage = "";
  let partnerMetricUpdateSuccess = true;
  let assignmentLogSuccess = true;

  // Handle assignments table and partner metrics
  if (newOrderStatus === 'assigned' && assignedPartnerId) {
    console.log(`[API PUT /api/orders/${orderId}/status] Processing 'assigned' status with partner ${assignedPartnerId}.`);
    // Log assignment
    const assignmentLogData = {
      order_id: orderId,
      partner_id: assignedPartnerId,
      status: 'success', // Per previous requirement to satisfy NOT NULL and CHECK constraint
    };
    console.log(`[API PUT /api/orders/${orderId}/status] Assignment log data for Supabase:`, assignmentLogData);
    const { data: assignmentData, error: assignmentInsertError } = await supabase
      .from('assignments')
      .insert(assignmentLogData)
      .select('*') 
      .single();

    if (assignmentInsertError || !assignmentData) {
      assignmentLogSuccess = false;
      assignmentLogMessage = `FAILED to create assignment record: ${assignmentInsertError?.message || 'No data returned after insert.'}. Supabase Code: ${assignmentInsertError?.code}`;
      console.error(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);
      // Return critical error if assignment logging fails
      return NextResponse.json({ message: `Order status updated to 'assigned', but ${assignmentLogMessage} This is a critical issue.`, error: assignmentLogMessage }, { status: 500 });
    }
    assignmentLogMessage = `Assignment successfully logged (ID: ${assignmentData.id}).`;
    console.log(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);

    // Increment partner load
    const partnerLoadResult = await updatePartnerMetrics(assignedPartnerId, { type: 'increment_load' });
    partnerMetricUpdateSuccess = partnerLoadResult.success;
    partnerMetricUpdateMessage = partnerLoadResult.message;
    if (!partnerLoadResult.success) {
        // If partner load update fails, we consider the overall operation failed for consistency
        return NextResponse.json({ message: `Order assigned and logged, but ${partnerLoadResult.message}`, error: partnerLoadResult.message }, { status: 500 });
    }


  } else if (newOrderStatus === 'delivered' && originalAssignedPartnerId) {
    console.log(`[API PUT /api/orders/${orderId}/status] Processing 'delivered' status for original partner ${originalAssignedPartnerId}.`);
    const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'order_delivered' });
    partnerMetricUpdateSuccess = partnerMetricsResult.success;
    partnerMetricUpdateMessage = partnerMetricsResult.message;
    if (!partnerMetricsResult.success) {
        return NextResponse.json({ message: `Order marked delivered, but ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
    }
    
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({ status: 'success' }) // Update the assignment to 'success'
      .eq('order_id', orderId)
      .eq('partner_id', originalAssignedPartnerId) 
      .order('created_at', { ascending: false }) // Target the latest assignment for this order-partner pair
      .limit(1);
    if (updateAssignmentError) {
      assignmentLogSuccess = false;
      assignmentLogMessage = `Warning: Failed to update assignment record to success: ${updateAssignmentError.message}.`;
      console.warn(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);
    } else {
      assignmentLogMessage = "Assignment record updated to success.";
      console.log(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);
    }

  } else if (newOrderStatus === 'cancelled' && originalAssignedPartnerId) {
    console.log(`[API PUT /api/orders/${orderId}/status] Processing 'cancelled' status for original partner ${originalAssignedPartnerId}.`);
    const partnerMetricsResult = await updatePartnerMetrics(originalAssignedPartnerId, { type: 'order_cancelled' });
    partnerMetricUpdateSuccess = partnerMetricsResult.success;
    partnerMetricUpdateMessage = partnerMetricsResult.message;
     if (!partnerMetricsResult.success) {
        return NextResponse.json({ message: `Order marked cancelled, but ${partnerMetricsResult.message}`, error: partnerMetricsResult.message }, { status: 500 });
    }

    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({ status: 'failed', reason: 'Order Cancelled' })
      .eq('order_id', orderId)
      .eq('partner_id', originalAssignedPartnerId)
      .order('created_at', { ascending: false })
      .limit(1); 
    if (updateAssignmentError) {
      assignmentLogSuccess = false;
      assignmentLogMessage = `Warning: Failed to update assignment record to failed (cancelled): ${updateAssignmentError.message}.`;
      console.warn(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);
    } else {
      assignmentLogMessage = "Assignment record updated to failed (cancelled).";
      console.log(`[API PUT /api/orders/${orderId}/status] ${assignmentLogMessage}`);
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
  if (!assignmentLogSuccess) successMessage += ` ${assignmentLogMessage}`; // Append warning if assignment log part failed
  if (!partnerMetricUpdateSuccess) successMessage += ` ${partnerMetricUpdateMessage}`; // Append warning if partner metric part failed

  console.log(`[API PUT /api/orders/${orderId}/status] Final success message: "${successMessage}"`);
  return NextResponse.json({
    message: successMessage,
    updatedOrder: finalUpdatedOrder
  });
}
