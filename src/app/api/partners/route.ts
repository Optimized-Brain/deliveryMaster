
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';
import { PARTNER_STATUSES } from '@/lib/constants';

// GET /api/partners
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') as PartnerStatus | null;

  let query = supabase
    .from('delivery_partners')
    .select('*');

  if (statusFilter) {
    if (PARTNER_STATUSES.includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    } else {
      // Optional: return an error for invalid status, or just ignore
      console.warn(`Invalid status filter received: ${statusFilter}. Fetching all partners.`);
      // Or: return NextResponse.json({ message: `Invalid status filter: ${statusFilter}` }, { status: 400 });
    }
  }
  
  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ message: 'Error fetching partners', error: error.message }, { status: 500 });
  }

  const partners: Partner[] = data.map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    status: p.status as PartnerStatus,
    assignedAreas: p.areas || [], // maps 'areas' from DB to 'assignedAreas'
    shiftStart: p.shift_start, // maps 'shift_start' from DB
    shiftEnd: p.shift_end,     // maps 'shift_end' from DB
    currentLoad: p.current_load,
    rating: p.rating,
    avatarUrl: p.avatar_url,
    registrationDate: p.created_at, // Mapped from created_at
  }));

  return NextResponse.json(partners);
}

// POST /api/partners
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate body (basic example, use Zod for robust validation on API routes if needed)
    if (!body.name || !body.email || !body.phone || !body.shiftStart || !body.shiftEnd) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const assignedAreasArray = body.assignedAreas ? body.assignedAreas.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const newPartnerData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      status: body.status || 'active',
      areas: assignedAreasArray, 
      shift_start: body.shiftStart, 
      shift_end: body.shiftEnd,     
      current_load: body.currentLoad || 0,
      rating: body.rating || 0,
      avatar_url: body.avatarUrl,
      // created_at and updated_at are handled by Supabase
    };

    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(newPartnerData)
      .select()
      .single(); 

    if (error) {
      console.error('Error creating partner:', error);
      // Return the Supabase error message for better client-side diagnostics
      return NextResponse.json({ message: 'Error creating partner', error: error.message }, { status: 500 });
    }
    
    if (!data) {
      console.error('Failed to create partner, no data returned after insert.');
      return NextResponse.json({ message: 'Failed to create partner, no data returned. RLS issue?' }, { status: 500 });
    }

    const createdPartner: Partner = {
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

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e) {
    console.error('Error processing POST /api/partners request:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    // Ensure the error from this catch block also gets to the client if it's not a Supabase error from the .insert()
    return NextResponse.json({ message: 'Invalid request body or unexpected server error', error: errorMessage }, { status: 400 });
  }
}
