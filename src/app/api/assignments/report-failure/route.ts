
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

    const { data: latestAssignment, error: latestAssignmentError } = await supabase
      .from('assignments')
      .select('*') 
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestAssignmentError) {
      const errorMessage = `Error fetching assignment record for order ID ${orderId}. Supabase error: ${latestAssignmentError.message}`;
      if (latestAssignmentError.code === 'PGRST116') { 
         const notFoundMessage = `Could not find an assignment record for order ID ${orderId} to update. (PGRST116)`;
         return NextResponse.json({ message: notFoundMessage }, { status: 404 });
      }
      return NextResponse.json({ message: 'Database error while fetching assignment record.', error: latestAssignmentError.message }, { status: 500 });
    }
    
    if (!latestAssignment) { 
      const errorMessage = `Could not find an assignment record for order ID ${orderId} to update. (No data returned from query, though no direct Supabase error was reported for the query itself). This could indicate an RLS issue silently filtering the record.`;
      return NextResponse.json({ message: errorMessage }, { status: 404 });
    }

    const assignmentIdToUpdate = latestAssignment.id;

    const { error: updateAssignmentError } = await supabase
      .from('assignments')
      .update({
        status: 'failed', 
        reason: reason,
      })
      .eq('id', assignmentIdToUpdate);

    if (updateAssignmentError) {
      return NextResponse.json({ message: 'Failed to update assignment record.', error: updateAssignmentError.message }, { status: 500 });
    }

    const newOrderStatus: OrderStatus = 'pending';
    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: newOrderStatus,
        assigned_to: null, 
      })
      .eq('id', orderId)
      .select('id') 
      .single();

    if (updateOrderError) {
      return NextResponse.json({ message: 'Assignment issue reported and assignment record updated, but failed to revert order status/clear partner.', error: updateOrderError.message }, { status: 500 });
    }
    
    if (!updatedOrder) { 
         return NextResponse.json({ message: 'Assignment issue reported, but order not found for status revert.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Assignment issue reported successfully. Order status set to pending and assignment record updated.' });

  } catch (e) {
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: e.message }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ message: 'Failed to report assignment issue.', error: errorMessage }, { status: 500 });
  }
}
