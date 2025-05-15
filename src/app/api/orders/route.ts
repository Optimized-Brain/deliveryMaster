
import { NextResponse } from 'next/server';
// import { supabase } from '@/lib/supabase'; // Supabase logic bypassed for demo
import type { Order, OrderStatus } from '@/lib/types';
import { SAMPLE_ORDERS } from '@/lib/constants'; // Using sample data for demo

// GET /api/orders
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') as OrderStatus | null;

  // --- Demo mode: Use SAMPLE_ORDERS ---
  let ordersToReturn = [...SAMPLE_ORDERS];

  if (statusFilter) {
    ordersToReturn = ordersToReturn.filter(order => order.status === statusFilter);
  }
  
  // Sort by creationDate descending for consistency
  ordersToReturn.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

  return NextResponse.json(ordersToReturn);
  // --- End Demo mode ---

  /*
  // --- Original Supabase logic ---
  let query = supabase.from('orders').select('*');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  
  query = query.order('created_at', { ascending: false }); // Order by created_at

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
    creationDate: o.created_at, // Map created_at to creationDate
    deliveryAddress: o.delivery_address,
    assignedPartnerId: o.assigned_partner_id,
    orderValue: o.order_value,
  }));

  return NextResponse.json(orders);
  // --- End Original Supabase logic ---
  */
}

// POST /api/orders - Placeholder for creating new orders if needed in the future
export async function POST(request: Request) {
  // In a real application, you would add logic to create a new order in Supabase
  // For now, this is a placeholder
  // If using dummy data, this might add to an in-memory store or just log
  const body = await request.json();
  console.log("POST /api/orders called with body (demo mode, no DB action):", body);
  return NextResponse.json({ message: 'Order creation endpoint hit (demo mode)', order: body }, { status: 201 });
}
