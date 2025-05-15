
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
      currentLoad: data.current_load,
      rating: data.rating,
      registrationDate: data.created_at,
    };

    return NextResponse.json({ message: `Partner ${id} updated successfully`, partner: updatedPartner });
  } catch (e) {
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
      return NextResponse.json({ 
        message: `Failed to delete partner with ID ${id}. Please check server logs.`, 
        error: `Supabase error: ${error.message} (Code: ${error.code})` 
      }, { status: 500 });
    }
    return NextResponse.json({ message: `Partner ${id} deleted successfully` });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred during deletion.';
    return NextResponse.json({ message: "Server error during partner deletion.", error: errorMessage }, { status: 500 });
  }
}
