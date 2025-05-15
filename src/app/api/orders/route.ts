
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { z } from 'zod';

// GET /api/orders
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') as OrderStatus | null;
  const assignedPartnerIdFilter = searchParams.get('assignedPartnerId');

  console.log("GET /api/orders - Using Supabase logic");
  let query = supabase.from('orders').select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (assignedPartnerIdFilter) {
    query = query.eq('assigned_to', assignedPartnerIdFilter);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders from Supabase:', error);
    return NextResponse.json({ message: 'Error fetching orders', error: error.message }, { status: 500 });
  }

  const orders: Order[] = (data || []).map((o: any) => ({
    id: o.id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    items: o.items || [],
    status: o.status.toLowerCase() as OrderStatus,
    area: o.area,
    creationDate: o.created_at,
    deliveryAddress: o.customer_address,
    assignedPartnerId: o.assigned_to,
    orderValue: o.total_amount,
  }));

  return NextResponse.json(orders);
}

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9A-Z]{3}[)])?([-]?[\s]?[0-9A-Z]{3}[-]?[\s]?[0-9A-Z]{4,6})$/
);

const createOrderSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  itemName: z.string().min(1, "Item name is required"),
  itemQuantity: z.number().int().min(1, "Quantity must be at least 1"),
  area: z.string().min(1, "Area is required"),
  deliveryAddress: z.string().min(5, "Delivery address must be at least 5 characters"),
  orderValue: z.number().positive("Order value must be a positive number"),
});


// POST /api/orders - Create a new order
export async function POST(request: Request) {
  console.log("POST /api/orders received request");
  try {
    const body = await request.json();

    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid order data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const validatedData = validation.data;

    const newOrderSupabaseData = {
      customer_name: validatedData.customerName,
      customer_phone: validatedData.customerPhone || null,
      items: [{ name: validatedData.itemName, quantity: validatedData.itemQuantity }],
      status: 'pending' as OrderStatus, 
      area: validatedData.area,
      customer_address: validatedData.deliveryAddress,
      total_amount: validatedData.orderValue,
    };

    console.log('Attempting to insert new order into Supabase:', newOrderSupabaseData);

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrderSupabaseData)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (error) {
      console.error('Error creating order in Supabase:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        message: 'Error creating order in Supabase.',
        error: error.message,
        details: String(error.details ?? '')
      }, { status: 500 });
    }

    if (!data) {
      console.error('Failed to create order, no data returned after insert from Supabase.');
      return NextResponse.json({ message: 'Failed to create order, no data returned. Possible RLS issue or misconfiguration.' }, { status: 500 });
    }

    console.log('Order created successfully in Supabase:', data.id);
    const createdOrder: Order = {
      id: data.id,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      items: data.items || [],
      status: data.status.toLowerCase() as OrderStatus,
      area: data.area,
      creationDate: data.created_at,
      deliveryAddress: data.customer_address,
      assignedPartnerId: data.assigned_to,
      orderValue: data.total_amount,
    };

    return NextResponse.json({ message: 'Order created successfully', order: createdOrder }, { status: 201 });

  } catch (e: unknown) {
    console.error('Unexpected error in POST /api/orders:', e);
    let errorMessage = 'Invalid request body or unexpected server error.';
    if (e instanceof Error && e.name === 'SyntaxError' && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    return NextResponse.json({
      message: 'Failed to create order due to unexpected server error.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}
