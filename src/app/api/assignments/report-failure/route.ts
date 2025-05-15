
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId || !reason) {
      return NextResponse.json({ message: 'Order ID and reason are required.' }, { status: 400 });
    }

    if (typeof reason !== 'string' || reason.length < 10) {
      return NextResponse.json({ message: 'Reason must be at least 10 characters long.' }, { status: 400 });
    }

    console.log(`POST /api/assignments/report-failure: Attempting to report failure for orderId: ${orderId}`);

    // Step 1: Find the latest assignment for the orderId
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .select('id')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (assignmentError || !assignmentData) {
      const errorMessage = `Could not find an assignment record for order ID ${orderId} to update.`;
      console.error(`POST /api/assignments/report-failure: ${errorMessage} Supabase error (if any):`, assignmentError?.message);
      return NextResponse.json({ message: errorMessage, error: assignmentError?.message }, { status: 404 });
    }

    const assignmentId = assignmentData.id;
    console.log(`POST /api/assignments/report-failure: Found assignment record with ID: ${assignmentId} for orderId: ${orderId}`);

    // Step 2: Update the assignment record
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({
        status: 'failed', 
        reason: reason,   
      })
      .eq('id', assignmentId);

    if (updateAssignmentError) {
      console.error(`POST /api/assignments/report-failure: Error updating assignment ${assignmentId} for order ${orderId}:`, updateAssignmentError);
      return NextResponse.json({ message: 'Failed to update assignment record.', error: updateAssignmentError.message }, { status: 500 });
    }
    console.log(`POST /api/assignments/report-failure: Successfully updated assignment ${assignmentId} to failed.`);

    // Step 3: Update the order status to 'pending' and clear assigned partner
    const newOrderStatus: OrderStatus = 'pending';
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: newOrderStatus,
        assigned_to: null, 
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateOrderError) {
      console.error(`POST /api/assignments/report-failure: Error updating order ${orderId} status to pending:`, updateOrderError);
      return NextResponse.json({ message: 'Assignment issue reported, but failed to revert order status to pending.', error: updateOrderError.message }, { status: 500 });
    }
    
    if (!updatedOrder) {
         console.warn(`POST /api/assignments/report-failure: Order ${orderId} not found during status revert, though assignment was updated.`);
         return NextResponse.json({ message: 'Assignment issue reported, but order not found for status revert.' }, { status: 404 });
    }
    console.log(`POST /api/assignments/report-failure: Successfully reverted order ${orderId} to pending status.`);

    return NextResponse.json({ message: 'Assignment issue reported successfully. Order status set to pending.' });

  } catch (e) {
    console.error('POST /api/assignments/report-failure: Unexpected error:', e);
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: e.message }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ message: 'Failed to report assignment issue.', error: errorMessage }, { status: 500 });
  }
}
