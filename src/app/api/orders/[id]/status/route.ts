
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

    let partnerLoadUpdatedSuccessfully = true;
    let assignmentLoggedSuccessfully = true;
    let assignmentLogError = "";
    let partnerLoadUpdateError = "";

    if (newOrderStatus === 'assigned' && assignedPartnerId) {
      // Create base assignment record
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        status: 'active', // Using 'active' as a placeholder for an initial assignment status.
                           // Ensure 'active' is allowed by your 'assignments_status_check' constraint
                           // and that the 'status' column in 'assignments' is NOT NULL.
      };
      
      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('id') 
        .single(); 

      if (assignmentInsertError) {
        assignmentLoggedSuccessfully = false;
        assignmentLogError = `Failed to create assignment record: ${assignmentInsertError.message}. This is a critical issue. Supabase Code: ${assignmentInsertError.code}`;
        // This is a critical failure, so return a 500 error.
        return NextResponse.json({ 
          message: `Order status updated to '${newOrderStatus}', but FAILED to log assignment record. Please check server logs for details. Supabase: ${assignmentLogError}`, 
          error: assignmentLogError 
        }, { status: 500 });
      }
      
      if (!assignmentData && assignmentLoggedSuccessfully) { 
          // This case should ideally not happen if insert was successful and no error was thrown,
          // but as a safeguard:
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
          partnerLoadUpdatedSuccessfully = false;
          partnerLoadUpdateError = `Failed to fetch partner ${assignedPartnerId} for load update: ${partnerFetchError.message}`;
        } else if (!partnerData) {
          partnerLoadUpdatedSuccessfully = false;
          partnerLoadUpdateError = `Partner ${assignedPartnerId} not found for load update.`;
        } else {
          const newLoad = (partnerData.current_load || 0) + 1;
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            partnerLoadUpdatedSuccessfully = false;
            partnerLoadUpdateError = `Failed to update partner ${assignedPartnerId} load: ${partnerUpdateError.message}`;
          }
        }
      } catch (e) {
          partnerLoadUpdatedSuccessfully = false;
          partnerLoadUpdateError = `Unexpected error during partner load update: ${(e as Error).message}`;
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
        if (assignmentLoggedSuccessfully) { // This will be true if we haven't errored out before this point
            successMessage += ` Assignment logged successfully.`;
        }
        if (!partnerLoadUpdatedSuccessfully) {
            successMessage += ` WARNING: Partner load update failed: ${partnerLoadUpdateError}. Please check server logs.`;
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
