
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
    if (body.completedOrders !== undefined) updateData.completed_orders = body.completedOrders;
    if (body.cancelledOrders !== undefined) updateData.cancelled_orders = body.cancelledOrders;


    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('delivery_partners')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders')
      .single();

    if (error) {
      console.error(`[API PUT /api/partners/${id}] Supabase error updating partner:`, { code: error.code, message: error.message, details: error.details });
      if (error.code === 'PGRST116') { 
        return NextResponse.json({ message: `Partner with ID ${id} not found.`, error: error.message }, { status: 404 });
      }
      return NextResponse.json({ message: `Error updating partner with ID ${id}.`, error: error.message }, { status: 500 });
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
    return NextResponse.json({ message: 'Failed to update partner.', error: errorMessage }, { status: 500 });
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
      console.error(`[API DELETE /api/partners/${id}] Supabase error during delete:`, { code: error.code, message: error.message, details: error.details });
      if (error.code === '23503') { // Foreign key violation
        const responseBody = {
          message: `Cannot delete partner. This partner is still referenced by existing orders or assignments. Please reassign or resolve these first.`,
          error: "Foreign key constraint violation." 
        };
        console.log(`[API DELETE /api/partners/${id}] Returning 409 Conflict:`, responseBody);
        return NextResponse.json(responseBody, { status: 409 });
      }
      const responseBody = {
        message: `Failed to delete partner due to a database error.`,
        error: `Supabase error code: ${error.code}`
      };
      console.log(`[API DELETE /api/partners/${id}] Returning 500 Internal Server Error:`, responseBody);
      return NextResponse.json(responseBody, { status: 500 });
    }

    if (count === 0) {
      console.log(`[API DELETE /api/partners/${id}] Partner not found, count is 0.`);
      const responseBody = {
        message: `Partner with ID ${id.substring(0,8)}... not found. No partner was deleted.`,
        error: "Partner not found"
      };
      console.log(`[API DELETE /api/partners/${id}] Returning 404 Not Found:`, responseBody);
      return NextResponse.json(responseBody, { status: 404 });
    }
    
    const successMessage = `Partner ${id.substring(0,8)}... deleted successfully.`;
    console.log(`[API DELETE /api/partners/${id}] ${successMessage}. Affected rows: ${count}. Returning 200 OK.`);
    return NextResponse.json({ message: successMessage }, { status: 200 });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred during deletion.';
    console.error(`[API DELETE /api/partners/${id}] Catch block error during deletion:`, e);
    return NextResponse.json({ message: "Server error during partner deletion.", error: errorMessage }, { status: 500 });
  }
}
