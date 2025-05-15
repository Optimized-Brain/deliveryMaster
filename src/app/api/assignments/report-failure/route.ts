
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

    // Step 1: Find the latest assignment for the orderId
    // Assuming 'assigned_at' or 'timestamp' column exists for ordering. Using 'created_at' if 'assignments' table has it.
    // If your assignments table has a 'timestamp' or 'assigned_at', use that. Here, 'created_at' is a common default.
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .select('id')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }) // Get the most recent assignment
      .limit(1)
      .single();

    if (assignmentError || !assignmentData) {
      console.error(`Error fetching assignment for order ${orderId}:`, assignmentError);
      return NextResponse.json({ message: `Could not find an assignment record for order ID ${orderId} to update.`, error: assignmentError?.message }, { status: 404 });
    }

    const assignmentId = assignmentData.id;

    // Step 2: Update the assignment record
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({
        status: 'failed', // Set assignment status to 'failed'
        reason: reason,   // Set the failure reason
      })
      .eq('id', assignmentId);

    if (updateAssignmentError) {
      console.error(`Error updating assignment ${assignmentId} for order ${orderId}:`, updateAssignmentError);
      return NextResponse.json({ message: 'Failed to update assignment record.', error: updateAssignmentError.message }, { status: 500 });
    }

    // Step 3: Update the order status to 'pending' and clear assigned partner
    const newOrderStatus: OrderStatus = 'pending';
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: newOrderStatus,
        assigned_to: null, // Clear the assigned partner
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateOrderError) {
      console.error(`Error updating order ${orderId} status to pending:`, updateOrderError);
      // Note: Assignment was updated, but order status update failed. This is a partial success scenario.
      // Depending on business logic, you might want to attempt to roll back the assignment update or log this inconsistency.
      return NextResponse.json({ message: 'Assignment issue reported, but failed to revert order status to pending.', error: updateOrderError.message }, { status: 500 });
    }
    
    if (!updatedOrder) {
         console.warn(`Order ${orderId} not found during status revert, though assignment was updated.`);
         // This case should ideally not happen if the orderId was valid for an assignment.
         return NextResponse.json({ message: 'Assignment issue reported, but order not found for status revert.' }, { status: 404 });
    }


    return NextResponse.json({ message: 'Assignment issue reported successfully. Order status set to pending.' });

  } catch (e) {
    console.error('Unexpected error in /api/assignments/report-failure:', e);
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: e.message }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ message: 'Failed to report assignment issue.', error: errorMessage }, { status: 500 });
  }
}
