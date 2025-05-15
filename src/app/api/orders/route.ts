
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';

// GET /api/orders
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  let query = supabase.from('orders').select('*');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  
  query = query.order('creation_date', { ascending: false });


  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ message: 'Error fetching orders', error: error.message }, { status: 500 });
  }

  const orders: Order[] = data.map((o: any) => ({
    id: o.id,
    customerName: o.customer_name,
    items: o.items || [], // Assuming items is stored as JSONB
    status: o.status as OrderStatus,
    area: o.area,
    creationDate: o.creation_date,
    deliveryAddress: o.delivery_address,
    assignedPartnerId: o.assigned_partner_id,
    orderValue: o.order_value,
  }));

  return NextResponse.json(orders);
}

// POST /api/orders - Placeholder for creating new orders if needed in the future
export async function POST(request: Request) {
  // In a real application, you would add logic to create a new order in Supabase
  // For now, this is a placeholder
  const body = await request.json();
  return NextResponse.json({ message: 'Order creation endpoint hit', order: body }, { status: 201 });
}
