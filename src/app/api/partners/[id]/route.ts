
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
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;
    // created_at should not be updated
    // updated_at is handled by Supabase

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('delivery_partners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating partner with ID ${id}:`, error);
      if (error.code === 'PGRST116') { // PostgREST error for "Resource not found"
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
      currentLoad: data.current_load,
      rating: data.rating,
      avatarUrl: data.avatar_url,
      registrationDate: data.created_at,
    };

    return NextResponse.json({ message: `Partner ${id} updated successfully`, partner: updatedPartner });
  } catch (e) {
    console.error(`Error processing PUT /api/partners/${id} request:`, e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request body or unexpected server error';
    return NextResponse.json({ message: errorMessage, error: e instanceof Error ? String(e) : 'Unknown error' }, { status: 400 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: Request, context: { params: Params }) {
  const { id } = context.params;

  try {
    const { error } = await supabase
      .from('delivery_partners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Supabase error deleting partner with ID ${id}:`, error); // Detailed server log
      // Provide a clear message about the Supabase error to the client
      return NextResponse.json({ 
        message: `Failed to delete partner with ID ${id}. Please check server logs.`, 
        error: `Supabase error: ${error.message} (Code: ${error.code})` 
      }, { status: 500 });
    }

    // Note: Supabase delete doesn't error if ID not found, it just deletes 0 rows.
    // If you need to confirm a row was actually deleted, you could .select().single() before delete
    // or check the 'count' property if it's returned and non-zero (depends on Supabase client version & settings).
    // For simplicity, we assume success if no error.

    return NextResponse.json({ message: `Partner ${id} deleted successfully` });
  } catch (e) {
    // Catch any unexpected errors during the process
    console.error(`Unexpected error in DELETE /api/partners/${id}:`, e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred during deletion.';
    return NextResponse.json({ message: "Server error during partner deletion.", error: errorMessage }, { status: 500 });
  }
}
