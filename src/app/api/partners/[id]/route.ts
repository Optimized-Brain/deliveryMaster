
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/partners/[id]
export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  try {
    const body = await request.json();
    
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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('delivery_partners')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { 
        return NextResponse.json({ message: `Partner with ID ${id} not found.`, error: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: `Error updating partner with ID ${id}. Supabase error: ${error.message}`, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: `Partner with ID ${id} not found after update, or no data returned.` }, { status: 404 });
    }
    
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
    };

    return NextResponse.json({ message: `Partner ${id} updated successfully`, partner: updatedPartner });
  } catch (e) {
    let errorMessage = 'Invalid request body or unexpected server error';
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    return NextResponse.json({ message: 'Failed to update partner.', error: errorMessage }, { status: 400 });
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

    console.log(`[API DELETE /api/partners/${id}] Supabase delete result - Error: ${JSON.stringify(error)}, Count: ${count}`);

    if (error) {
      console.error(`[API DELETE /api/partners/${id}] Supabase error occurred:`, error);
      // Check for foreign key violation (code 23503)
      if (error.code === '23503') {
        return NextResponse.json({ 
          message: `Failed to delete partner ${id.substring(0,8)}... because they are still referenced in other records (e.g., assigned orders). Please reassign or complete their orders first.`, 
          error: "Foreign key constraint violation: " + error.message,
          details: String(error.details ?? ''),
          code: error.code 
        }, { status: 409 }); // 409 Conflict is appropriate here
      }
      return NextResponse.json({ 
        message: `Failed to delete partner with ID ${id}. Supabase error occurred.`, 
        error: error.message,
        details: String(error.details ?? ''),
        code: error.code 
      }, { status: 500 });
    }

    if (count === 0) {
      console.log(`[API DELETE /api/partners/${id}] Partner not found (count is 0). Returning 404.`);
      return NextResponse.json({
        message: `Partner with ID ${id.substring(0,8)}... not found. No rows were deleted.`,
        error: "Partner not found"
      }, { status: 404 });
    }
    
    // Only if count > 0 and no error, we consider it a success
    console.log(`[API DELETE /api/partners/${id}] Partner deleted successfully (count: ${count}). Returning 200.`);
    return NextResponse.json({ message: `Partner ${id.substring(0,8)}... deleted successfully. ${count} row(s) affected.` }, { status: 200 });

  } catch (e) {
    // Catch any other unexpected errors
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred during deletion.';
    console.error(`[API DELETE /api/partners/${id}] Unexpected server error:`, e);
    return NextResponse.json({ message: "Server error during partner deletion.", error: errorMessage }, { status: 500 });
  }
}
