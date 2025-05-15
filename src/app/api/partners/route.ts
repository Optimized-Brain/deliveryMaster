
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';
import { PARTNER_STATUSES } from '@/lib/constants';

// GET /api/partners
export async function GET(request: Request) {
  console.log("/api/partners GET: NEXT_PUBLIC_SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Exists" : "MISSING_OR_EMPTY");
  console.log("/api/partners GET: NEXT_PUBLIC_SUPABASE_ANON_KEY =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "MISSING_OR_EMPTY");
  console.log("/api/partners GET: Direct access process.env.NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);


  console.log("GET /api/partners received request");

  const supabaseUrlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKeyPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log(`Supabase URL Present (from GET /api/partners): ${supabaseUrlPresent}, Supabase Anon Key Present (from GET /api/partners): ${supabaseAnonKeyPresent}`);

  if (!supabaseUrlPresent || !supabaseAnonKeyPresent) {
    console.error("API Route /api/partners: Supabase environment variables are missing according to direct process.env check!");
    return NextResponse.json({ 
        message: 'Server configuration error: Supabase environment variables are missing (checked in API route).', 
        error: 'Supabase environment variables are missing (checked in API route).' 
    }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as PartnerStatus | null;
    console.log(`Filtering by status: ${statusFilter || 'None'}`);

    let query = supabase
      .from('delivery_partners')
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at');

    if (statusFilter) {
      if (PARTNER_STATUSES.includes(statusFilter)) {
        console.log(`Applying status filter: ${statusFilter}`);
        query = query.eq('status', statusFilter);
      } else {
        console.warn(`Invalid status filter received: ${statusFilter}. Fetching all partners.`);
      }
    }
    
    query = query.order('name', { ascending: true });
    console.log('Executing Supabase query for delivery_partners');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching partners from Supabase:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        message: 'Error fetching partners from Supabase.', 
        error: error.message, 
        details: String(error.details ?? '') 
      }, { status: 500 });
    }

    if (!data) {
      console.log('No partners found or data is null.');
      return NextResponse.json([]);
    }

    console.log(`Successfully fetched ${data.length} partners.`);
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
      registrationDate: p.created_at, 
    }));

    return NextResponse.json(partners);

  } catch (e: unknown) {
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
  console.log("POST /api/partners received request");
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
    };
    console.log('Attempting to insert new partner:', newPartnerData);

    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(newPartnerData)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at')
      .single(); 

    if (error) {
      console.error('Error creating partner in Supabase:', JSON.stringify(error, null, 2));
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

    console.log('Partner created successfully:', data.id);
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
      registrationDate: data.created_at,
    };

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e: unknown) {
    console.error('Unexpected error in POST /api/partners:', e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request body or unexpected server error.';
    return NextResponse.json({ 
      message: 'Failed to create partner due to unexpected server error.', 
      error: String(errorMessage) 
    }, { status: 500 });
  }
}
