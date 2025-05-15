import { NextResponse } from 'next/server';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  const body = await request.json();
  // In a real application, you would update the order status for the given id
  return NextResponse.json({ message: `Status for order ${id} updated successfully`, newStatus: body.status });
}
