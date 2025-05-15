
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Partner, PartnerStatus } from '@/lib/types';

// GET /api/partners
export async function GET(request: Request) {
  const { data, error } = await supabase
    .from('delivery_partners') // Changed from 'partners'
    .select('*')
    .order('name', { ascending: true });

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
    assignedAreas: p.assigned_areas || [],
    shiftSchedule: p.shift_schedule,
    currentLoad: p.current_load,
    rating: p.rating,
    avatarUrl: p.avatar_url,
    registrationDate: p.registration_date,
  }));

  return NextResponse.json(partners);
}

// POST /api/partners
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate body (basic example, use Zod for robust validation)
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const assignedAreasArray = body.assignedAreas ? body.assignedAreas.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const newPartnerData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      status: body.status || 'active',
      assigned_areas: assignedAreasArray,
      shift_schedule: body.shiftSchedule,
      current_load: body.currentLoad || 0, // Default value
      rating: body.rating || 0, // Default value
      avatar_url: body.avatarUrl, // Optional
      registration_date: new Date().toISOString(), // Set registration date
    };

    const { data, error } = await supabase
      .from('delivery_partners') // Changed from 'partners'
      .insert(newPartnerData)
      .select()
      .single(); // Use .single() if you expect one row back

    if (error) {
      console.error('Error creating partner:', error);
      return NextResponse.json({ message: 'Error creating partner', error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ message: 'Failed to create partner, no data returned' }, { status: 500 });
    }

    const createdPartner: Partner = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status as PartnerStatus,
      assignedAreas: data.assigned_areas || [],
      shiftSchedule: data.shift_schedule,
      currentLoad: data.current_load,
      rating: data.rating,
      avatarUrl: data.avatar_url,
      registrationDate: data.registration_date,
    };

    return NextResponse.json({ message: 'Partner created successfully', partner: createdPartner }, { status: 201 });
  } catch (e) {
    console.error('Error processing request:', e);
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
}
