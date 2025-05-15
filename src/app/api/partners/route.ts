
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';
import { PARTNER_STATUSES } from '@/lib/constants';

// GET /api/partners
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as PartnerStatus | null;

    let query = supabase
      .from('delivery_partners')
      .select('*');

    if (statusFilter) {
      if (PARTNER_STATUSES.includes(statusFilter)) {
        query = query.eq('status', statusFilter);
      } else {
        console.warn(`Invalid status filter received: ${statusFilter}. Fetching all partners.`);
      }
    }
    
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching partners from Supabase:', error);
      return NextResponse.json({ 
        message: 'Error fetching partners from Supabase.', 
        error: error.message, 
        details: String(error.details ?? '') 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    const partners: Partner[] = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      status: p.status as PartnerStatus,
      assignedAreas: p.areas || [],
      shiftStart: p.shift_start, 
      shiftEnd: p.shift_end,     
      currentLoad: p.current_load ?? 0,
      rating: p.rating ?? 0,
      avatarUrl: p.avatar_url,
      registrationDate: p.created_at, 
    }));

    return NextResponse.json(partners);

  } catch (e) {
    console.error('Unexpected error in GET /api/partners:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected server error occurred.';
    return NextResponse.json({ 
      message: 'Unexpected server error while fetching partners.', 
      error: String(errorMessage) 
    }, { status: 500 });
  }
}

// POST /api/partners
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.email || !body.phone || !body.shiftStart || !body.shiftEnd) {
      return NextResponse.json({ message: 'Missing required fields (name, email, phone, shiftStart, shiftEnd)' }, { status: 400 });
    }
    
    const assignedAreasArray = body.assignedAreas ? 
        (Array.isArray(body.assignedAreas) ? body.assignedAreas : body.assignedAreas.split(',').map((s: string) => s.trim()).filter(Boolean)) 
        : [];

    const newPartnerData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      status: body.status || 'active',
      areas: assignedAreasArray, 
      shift_start: body.shiftStart, 
      shift_end: body.shiftEnd,     
      current_load: body.currentLoad ?? 0,
      rating: body.rating ?? 0,
      avatar_url: body.avatarUrl,
    };

    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(newPartnerData)
      .select()
      .single(); 

    if (error) {
      console.error('Error creating partner in Supabase:', error);
      return NextResponse.json({ 
        message: 'Error creating partner in Supabase.', 
        error: error.message, 
        details: String(error.details ?? '') 
      }, { status: 500 });
    }
    
    if (!data) {
      console.error('Failed to create partner, no data returned after insert from Supabase.');
      return NextResponse.json({ message: 'Failed to create partner, no data returned. Possible RLS issue or misconfiguration.' }, { status: 500 });
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
      currentLoad: data.current_load ?? 0,
      rating: data.rating ?? 0,
      avatarUrl: data.avatar_url,
      registrationDate: data.created_at,
    };

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e) {
    console.error('Unexpected error in POST /api/partners:', e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request body or unexpected server error.';
    // Changed status to 500 for unexpected server errors
    return NextResponse.json({ 
      message: 'Failed to create partner due to unexpected server error.', 
      error: String(errorMessage) 
    }, { status: 500 });
  }
}
