
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
      .select('id, partner_id') // Select partner_id for load decrement
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestAssignmentError) {
      const errorMessage = `Error fetching assignment record for order ID ${orderId}. Supabase error: ${latestAssignmentError.message}`;
      if (latestAssignmentError.code === 'PGRST116') { // "Actual num rows 0 differs from expected 1"
         const notFoundMessage = `Could not find an assignment record for order ID ${orderId} to update. (PGRST116)`;
         return NextResponse.json({ message: notFoundMessage, error: latestAssignmentError.details || latestAssignmentError.message }, { status: 404 });
      }
      return NextResponse.json({ message: 'Database error while fetching assignment record.', error: latestAssignmentError.message }, { status: 500 });
    }
    
    if (!latestAssignment) { // Should be caught by .single() and PGRST116, but as a fallback
      const errorMessage = `Could not find an assignment record for order ID ${orderId} to update (no data returned). This could indicate an RLS issue or the record genuinely not existing.`;
      return NextResponse.json({ message: errorMessage }, { status: 404 });
    }

    const assignmentIdToUpdate = latestAssignment.id;
    const assignedPartnerId = latestAssignment.partner_id; 

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

    let partnerLoadUpdateMessage = "";
    if (assignedPartnerId) {
      try {
        const { data: partnerData, error: partnerFetchError } = await supabase
          .from('delivery_partners')
          .select('current_load')
          .eq('id', assignedPartnerId)
          .single();

        if (partnerFetchError) {
          partnerLoadUpdateMessage = `Warning: Failed to fetch partner ${assignedPartnerId} for load decrement: ${partnerFetchError.message}.`;
        } else if (!partnerData) {
          partnerLoadUpdateMessage = `Warning: Partner ${assignedPartnerId} not found for load decrement.`;
        } else {
          const newLoad = Math.max(0, (partnerData.current_load || 0) - 1);
          const { error: partnerUpdateError } = await supabase
            .from('delivery_partners')
            .update({ current_load: newLoad })
            .eq('id', assignedPartnerId);

          if (partnerUpdateError) {
            partnerLoadUpdateMessage = `Warning: Failed to decrement partner ${assignedPartnerId} load: ${partnerUpdateError.message}.`;
          } else {
            partnerLoadUpdateMessage = `Partner ${assignedPartnerId.substring(0,8)}... load decremented.`;
          }
        }
      } catch (e) {
          partnerLoadUpdateMessage = `Warning: Unexpected error during partner load decrement: ${(e as Error).message}.`;
      }
    }

    let finalMessage = 'Assignment issue reported successfully. Order status set to pending and assignment record updated.';
    if (partnerLoadUpdateMessage) {
      finalMessage += ` ${partnerLoadUpdateMessage}`;
    }

    return NextResponse.json({ message: finalMessage });

  } catch (e) {
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: e.message }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ message: 'Failed to report assignment issue.', error: errorMessage }, { status: 500 });
  }
}
