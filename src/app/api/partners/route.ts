
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';
import { PARTNER_STATUSES } from '@/lib/constants';

// GET /api/partners
export async function GET(request: Request) {
  console.log('[API GET /api/partners] Received request.');
  const supabaseUrlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKeyPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrlPresent || !supabaseAnonKeyPresent) {
    console.error('[API GET /api/partners] Supabase environment variables are missing.');
    return NextResponse.json({
        message: 'Server configuration error: Supabase environment variables are missing.',
        error: 'Supabase environment variables are missing.'
    }, { status: 500 });
  }
  console.log('[API GET /api/partners] Supabase environment variables detected.');

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as PartnerStatus | null;
    console.log(`[API GET /api/partners] Status filter: ${statusFilter}`);

    let query = supabase
      .from('delivery_partners')
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders');

    if (statusFilter) {
      if (PARTNER_STATUSES.includes(statusFilter)) {
        console.log(`[API GET /api/partners] Applying status filter: ${statusFilter}`);
        query = query.eq('status', statusFilter);
      } else {
        console.warn(`[API GET /api/partners] Invalid status filter received: ${statusFilter}. Ignoring filter.`);
      }
    }

    query = query.order('name', { ascending: true });
    console.log('[API GET /api/partners] Executing Supabase query for partners.');
    const { data: supabaseData, error: supabaseError } = await query;

    if (supabaseError) {
      console.error('[API GET /api/partners] Supabase error fetching partners:', supabaseError);
      return NextResponse.json({
        message: 'Error fetching partners from Supabase.',
        error: supabaseError.message,
        details: String(supabaseError.details ?? '')
      }, { status: 500 });
    }

    console.log(`[API GET /api/partners] Supabase query successful. Records fetched: ${supabaseData ? supabaseData.length : 'null'}`);

    if (!supabaseData) {
      console.log('[API GET /api/partners] No data returned from Supabase. Returning empty array.');
      return NextResponse.json([]);
    }

    const partners: Partner[] = supabaseData.map((p: any) => ({
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
      completedOrders: p.completed_orders ?? 0,
      cancelledOrders: p.cancelled_orders ?? 0,
    }));

    console.log(`[API GET /api/partners] Mapped ${partners.length} partners. Sending response.`);
    return NextResponse.json(partners);

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('[API GET /api/partners] Unexpected server error:', e);
    return NextResponse.json({
      message: 'Unexpected server error while fetching partners.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}

// POST /api/partners
export async function POST(request: Request) {
  console.log('[API POST /api/partners] Received request to create partner.');
  try {
    const body = await request.json();
    console.log('[API POST /api/partners] Request body:', body);

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
      completed_orders: 0, // Initialize new counters
      cancelled_orders: 0, // Initialize new counters
    };
    console.log('[API POST /api/partners] New partner data for Supabase:', newPartnerData);

    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(newPartnerData)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders')
      .single();

    if (error) {
      console.error('[API POST /api/partners] Supabase error creating partner:', error);
      return NextResponse.json({
        message: 'Error creating partner in Supabase.',
        error: error.message,
        details: String(error.details ?? '')
      }, { status: 500 });
    }

    if (!data) {
      console.error('[API POST /api/partners] Failed to create partner, no data returned from Supabase after insert.');
      return NextResponse.json({ message: 'Failed to create partner, no data returned. Possible RLS issue or misconfiguration.' }, { status: 500 });
    }
    console.log('[API POST /api/partners] Successfully created partner. Data:', data);

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
      completedOrders: data.completed_orders ?? 0,
      cancelledOrders: data.cancelled_orders ?? 0,
    };

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e: unknown) {
    let errorMessage = 'Invalid request body or unexpected server error.';
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
        console.error('[API POST /api/partners] Malformed JSON in request body:', e);
        return NextResponse.json({ message: errorMessage, error: e.message }, { status: 400 });
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    console.error('[API POST /api/partners] Unexpected server error:', e);
    return NextResponse.json({
      message: 'Failed to create partner due to unexpected server error.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}
