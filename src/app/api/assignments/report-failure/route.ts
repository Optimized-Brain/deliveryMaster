
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
    // Assuming 'created_at' is the timestamp column in your 'assignments' table
    console.log(`POST /api/assignments/report-failure: Querying for latest assignment for orderId: ${orderId}`);
    const { data: latestAssignment, error: latestAssignmentError } = await supabase
      .from('assignments')
      .select('*') // Select all columns to ensure RLS doesn't hide it based on selected columns
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestAssignmentError) {
      const errorMessage = `Error fetching assignment record for order ID ${orderId}. Supabase error: ${latestAssignmentError.message}`;
      console.error(`POST /api/assignments/report-failure: ${errorMessage}`, latestAssignmentError);
      // If the error indicates "0 rows", it means the record wasn't found, which is not necessarily a query execution error.
      if (latestAssignmentError.code === 'PGRST116') { // PGRST116: "Actual num rows 0 differs from expected 1"
         const notFoundMessage = `Could not find an assignment record for order ID ${orderId} to update. (PGRST116)`;
         console.warn(`POST /api/assignments/report-failure: ${notFoundMessage}`);
         return NextResponse.json({ message: notFoundMessage }, { status: 404 });
      }
      return NextResponse.json({ message: 'Database error while fetching assignment record.', error: latestAssignmentError.message }, { status: 500 });
    }
    
    if (!latestAssignment) {
      const errorMessage = `Could not find an assignment record for order ID ${orderId} to update. (No data returned from query)`;
      console.warn(`POST /api/assignments/report-failure: ${errorMessage}`);
      return NextResponse.json({ message: errorMessage }, { status: 404 });
    }

    const assignmentIdToUpdate = latestAssignment.id;
    console.log(`POST /api/assignments/report-failure: Found latest assignment record with ID: ${assignmentIdToUpdate} for orderId: ${orderId}`);

    // Step 2: Update the assignment record
    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({
        status: 'failed', // As per the Assignment type
        reason: reason,
      })
      .eq('id', assignmentIdToUpdate);

    if (updateAssignmentError) {
      console.error(`POST /api/assignments/report-failure: Error updating assignment ${assignmentIdToUpdate} for order ${orderId}:`, updateAssignmentError);
      return NextResponse.json({ message: 'Failed to update assignment record.', error: updateAssignmentError.message }, { status: 500 });
    }
    console.log(`POST /api/assignments/report-failure: Successfully updated assignment ${assignmentIdToUpdate} to status 'failed'.`);

    // Step 3: Update the order status to 'pending' and clear assigned_to (partner)
    const newOrderStatus: OrderStatus = 'pending';
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: newOrderStatus,
        assigned_to: null, // Clear the assigned partner
      })
      .eq('id', orderId)
      .select('id') // Select minimal data for confirmation
      .single();

    if (updateOrderError) {
      console.error(`POST /api/assignments/report-failure: Error updating order ${orderId} status to pending and clearing partner:`, updateOrderError);
      return NextResponse.json({ message: 'Assignment issue reported and assignment record updated, but failed to revert order status/clear partner.', error: updateOrderError.message }, { status: 500 });
    }
    
    if (!updatedOrder) {
         console.warn(`POST /api/assignments/report-failure: Order ${orderId} not found during status revert, though assignment was updated.`);
         return NextResponse.json({ message: 'Assignment issue reported, but order not found for status revert.' }, { status: 404 });
    }
    console.log(`POST /api/assignments/report-failure: Successfully reverted order ${orderId} to 'pending' status and cleared assigned partner.`);

    return NextResponse.json({ message: 'Assignment issue reported successfully. Order status set to pending and assignment record updated.' });

  } catch (e) {
    console.error('POST /api/assignments/report-failure: Unexpected error:', e);
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: e.message }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ message: 'Failed to report assignment issue.', error: errorMessage }, { status: 500 });
  }
}
