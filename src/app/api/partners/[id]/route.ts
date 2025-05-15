
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/partners/[id]
export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  console.log(`[API PUT /api/partners/${id}] Received request to update partner.`);
  try {
    const body = await request.json();
    console.log(`[API PUT /api/partners/${id}] Request body:`, body);

    const assignedAreasArray = body.assignedAreas ?
      (Array.isArray(body.assignedAreas) ? body.assignedAreas : body.assignedAreas.split(',').map((s: string) => s.trim()).filter(Boolean))
      : undefined;

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.status !== undefined) updateData.status = body.status;
    if (assignedAreasArray !== undefined) updateData.areas = assignedAreasArray;
    if (body.shiftStart !== undefined) updateData.shift_start = body.shiftStart;
    if (body.shiftEnd !== undefined) updateData.shift_end = body.shiftEnd;
    if (body.currentLoad !== undefined) updateData.current_load = body.currentLoad;
    if (body.rating !== undefined) updateData.rating = body.rating;
    // completed_orders and cancelled_orders are updated via order status changes, not directly here.

    if (Object.keys(updateData).length === 0) {
      console.log(`[API PUT /api/partners/${id}] No fields to update.`);
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }
    console.log(`[API PUT /api/partners/${id}] Update data for Supabase:`, updateData);

    const { data, error } = await supabase
      .from('delivery_partners')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders')
      .single();

    if (error) {
      console.error(`[API PUT /api/partners/${id}] Supabase error:`, error);
      if (error.code === 'PGRST116') { // Partner not found by Supabase
        return NextResponse.json({ message: `Partner with ID ${id} not found.`, error: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: `Error updating partner with ID ${id}. Supabase error: ${error.message}`, error: error.message }, { status: 500 });
    }

    if (!data) { // Should be caught by .single() if not found, but as a fallback
      console.error(`[API PUT /api/partners/${id}] No data returned from Supabase after update, though no error was thrown by Supabase. Partner ID: ${id}`);
      return NextResponse.json({ message: `Partner with ID ${id} not found after update, or no data returned.` }, { status: 404 });
    }
    console.log(`[API PUT /api/partners/${id}] Successfully updated partner. Returning data:`, data);

    const updatedPartner: Partner = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status as PartnerStatus,
      assignedAreas: data.areas || [],
      shiftStart: data.shift_start,
      shiftEnd: data.shift_end,
      currentLoad: data.current_load ?? 0,
      rating: data.rating ?? 0,
      registrationDate: data.created_at,
      completedOrders: data.completed_orders ?? 0,
      cancelledOrders: data.cancelled_orders ?? 0,
    };

    return NextResponse.json({ message: `Partner ${id} updated successfully`, partner: updatedPartner });
  } catch (e) {
    let errorMessage = 'Invalid request body or unexpected server error';
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    console.error(`[API PUT /api/partners/${id}] Catch block error:`, errorMessage, e);
    return NextResponse.json({ message: 'Failed to update partner.', error: errorMessage }, { status: 500 }); // Changed to 500 for unexpected
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: Request, context: { params: Params }) {
  const { id } = context.params;
  console.log(`[API DELETE /api/partners/${id}] Received request to delete partner with ID: ${id}`);

  try {
    console.log(`[API DELETE /api/partners/${id}] Attempting to delete from Supabase...`);
    const { error, count } = await supabase
      .from('delivery_partners')
      .delete({ count: 'exact' })
      .eq('id', id);

    console.log(`[API DELETE /api/partners/${id}] Supabase delete result - Error:`, error, `Count:`, count);

    if (error) {
      console.error(`[API DELETE /api/partners/${id}] Supabase error during delete:`, error);
      if (error.code === '23503') { // Foreign key violation
        const responseBody = {
          message: `Failed to delete partner ${id.substring(0,8)}... because they are still referenced in other records (e.g., assigned orders). Please reassign or complete their orders first.`,
          error: "Foreign key constraint violation: " + error.message,
          details: String(error.details ?? ''),
          code: error.code
        };
        console.log(`[API DELETE /api/partners/${id}] Returning 409 Conflict:`, responseBody);
        return NextResponse.json(responseBody, { status: 409 });
      }
      const responseBody = {
        message: `Failed to delete partner with ID ${id}. Supabase error occurred.`,
        error: error.message,
        details: String(error.details ?? ''),
        code: error.code
      };
      console.log(`[API DELETE /api/partners/${id}] Returning 500 Internal Server Error:`, responseBody);
      return NextResponse.json(responseBody, { status: 500 });
    }

    if (count === 0) {
      console.log(`[API DELETE /api/partners/${id}] Partner not found, count is 0.`);
      const responseBody = {
        message: `Partner with ID ${id.substring(0,8)}... not found. No rows were deleted.`,
        error: "Partner not found"
      };
      console.log(`[API DELETE /api/partners/${id}] Returning 404 Not Found:`, responseBody);
      return NextResponse.json(responseBody, { status: 404 });
    }
    
    // If count > 0 and no error
    const successMessage = `Partner ${id.substring(0,8)}... deleted successfully. ${count} row(s) affected.`;
    console.log(`[API DELETE /api/partners/${id}] ${successMessage}. Returning 200 OK.`);
    return NextResponse.json({ message: successMessage }, { status: 200 });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred during deletion.';
    console.error(`[API DELETE /api/partners/${id}] Catch block error during deletion:`, e);
    return NextResponse.json({ message: "Server error during partner deletion.", error: errorMessage }, { status: 500 });
  }
}
