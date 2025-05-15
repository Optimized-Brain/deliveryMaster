
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';
import { PARTNER_STATUSES } from '@/lib/constants';

// GET /api/partners
export async function GET(request: Request) {
  const supabaseUrlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKeyPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrlPresent || !supabaseAnonKeyPresent) {
    return NextResponse.json({
        message: 'Server configuration error: Supabase environment variables are missing.',
        error: 'Supabase environment variables are missing.'
    }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as PartnerStatus | null;

    let query = supabase
      .from('delivery_partners')
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders');

    if (statusFilter) {
      if (PARTNER_STATUSES.includes(statusFilter)) {
        query = query.eq('status', statusFilter);
      }
    }

    query = query.order('name', { ascending: true });

    const { data: supabaseData, error: supabaseError } = await query;

    if (supabaseError) {
      return NextResponse.json({
        message: 'Error fetching partners from Supabase.',
        error: supabaseError.message,
        details: String(supabaseError.details ?? '')
      }, { status: 500 });
    }

    if (!supabaseData) {
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

    return NextResponse.json(partners);

  } catch (e: unknown) {
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
      completed_orders: 0, // Initialize new counters
      cancelled_orders: 0, // Initialize new counters
    };

    const { data, error } = await supabase
      .from('delivery_partners')
      .insert(newPartnerData)
      .select('id, name, email, phone, status, areas, shift_start, shift_end, current_load, rating, created_at, completed_orders, cancelled_orders')
      .single();

    if (error) {
      return NextResponse.json({
        message: 'Error creating partner in Supabase.',
        error: error.message,
        details: String(error.details ?? '')
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'Failed to create partner, no data returned after insert from Supabase. Possible RLS issue or misconfiguration.' }, { status: 500 });
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
      registrationDate: data.created_at,
      completedOrders: data.completed_orders ?? 0,
      cancelledOrders: data.cancelled_orders ?? 0,
    };

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e: unknown) {
    let errorMessage = 'Invalid request body or unexpected server error.';
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    return NextResponse.json({
      message: 'Failed to create partner due to unexpected server error.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}
