import { NextResponse } from 'next/server';

// GET /api/partners
export async function GET(request: Request) {
  // In a real application, you would fetch partners from a database
  const partners = [
    { id: '1', name: 'Partner A' },
    { id: '2', name: 'Partner B' },
  ];
  return NextResponse.json(partners);
}

// POST /api/partners
export async function POST(request: Request) {
  // In a real application, you would create a new partner in a database
  const body = await request.json();
  return NextResponse.json({ message: 'Partner created successfully', partner: body }, { status: 201 });
}
