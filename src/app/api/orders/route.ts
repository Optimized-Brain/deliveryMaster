import { NextResponse } from 'next/server';

// GET /api/orders
export async function GET(request: Request) {
  // In a real application, you would fetch orders from a database
  const orders = [
    { id: '101', customer: 'Customer X', status: 'pending' },
    { id: '102', customer: 'Customer Y', status: 'delivered' },
  ];
  return NextResponse.json(orders);
}
