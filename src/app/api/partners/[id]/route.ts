
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
    if (body.shiftSchedule !== undefined) updateData.shift_schedule = body.shiftSchedule;
    if (body.currentLoad !== undefined) updateData.current_load = body.currentLoad;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;
    // created_at should not be updated
    // updated_at is typically handled by Supabase automatically

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
      console.error(`Error updating partner ${id}:`, error);
      if (error.code === 'PGRST116') { // PGRST116: Row to update not found
        return NextResponse.json({ message: `Partner with ID ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ message: `Error updating partner ${id}`, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: `Partner with ID ${id} not found or no data returned after update` }, { status: 404 });
    }
    
    const updatedPartner: Partner = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status as PartnerStatus,
      assignedAreas: data.areas || [],
      shiftSchedule: data.shift_schedule,
      currentLoad: data.current_load,
      rating: data.rating,
      avatarUrl: data.avatar_url,
      registrationDate: data.created_at, // Mapped from created_at
    };

    return NextResponse.json({ message: `Partner ${id} updated successfully`, partner: updatedPartner });
  } catch (e) {
    console.error('Error processing request:', e);
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: Request, context: { params: Params }) {
  const { id } = context.params;

  const { error } = await supabase
    .from('delivery_partners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting partner ${id}:`, error);
    return NextResponse.json({ message: `Error deleting partner ${id}`, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Partner ${id} deleted successfully` });
}
