
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
    const { status, assignedPartnerId } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered'];
    if (!validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json({ message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const orderUpdateData: { status: OrderStatus; assigned_to?: string | null } = { status: status as OrderStatus };
    if (assignedPartnerId && status === 'assigned') {
      orderUpdateData.assigned_to = assignedPartnerId;
    } else if (status === 'pending') { 
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

    if (status === 'assigned' && assignedPartnerId) {
      // Attempt to log the assignment
      const assignmentLogData = {
        order_id: orderId,
        partner_id: assignedPartnerId,
        status: 'assigned', // Set initial status for the assignment record
        // 'reason' is left to DB default (NULL)
      };
      
      const { data: assignmentData, error: assignmentInsertError } = await supabase
        .from('assignments')
        .insert(assignmentLogData)
        .select('id') // Select some field to confirm insert
        .single(); 

      if (assignmentInsertError) {
        assignmentLoggedSuccessfully = false;
        assignmentLogError = `Failed to create assignment record: ${assignmentInsertError.message}. This is a critical issue.`;
        // If logging the assignment is critical, return an error
        return NextResponse.json({ 
          message: `Order status updated to '${status}', but FAILED to log assignment record. Please check server logs for details. Supabase: ${assignmentLogError}`, 
          error: assignmentLogError 
        }, { status: 500 });
      }
      
      if (!assignmentData && assignmentLoggedSuccessfully) { // Should not happen if insert error is caught, but as a safeguard
          assignmentLoggedSuccessfully = false; 
          assignmentLogError = 'Failed to confirm assignment record creation (no data returned after insert). This is a critical issue.';
          return NextResponse.json({
              message: `Order status updated to '${status}', but FAILED to confirm assignment record creation. Please check server logs.`,
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

        if (partnerFetchError || !partnerData) {
          partnerLoadUpdatedSuccessfully = false;
        } else {
          const newLoad = (partnerData.current_load || 0) + 1;
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            partnerLoadUpdatedSuccessfully = false;
          }
        }
      } catch (e) {
          // Catch any unexpected error during partner load update
          partnerLoadUpdatedSuccessfully = false;
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
    
    let successMessage = `Status for order ${orderId.substring(0,8)}... updated successfully to ${status}.`;
    if (status === 'assigned' && assignedPartnerId) {
        if (assignmentLoggedSuccessfully) {
            successMessage += ` Assignment logged.`;
        }
        // Warning for partner load update failure is kept separate, as assignment logging is more critical
        if (!partnerLoadUpdatedSuccessfully) {
            successMessage += ` WARNING: Failed to update partner load. Please check server logs.`;
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
