
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { z } from 'zod';

// GET /api/orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as OrderStatus | null;
    const assignedPartnerIdFilter = searchParams.get('assignedPartnerId');

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
      console.error('Supabase error fetching orders:', error);
      return NextResponse.json({ message: 'Error fetching orders from Supabase.', error: error.message, details: error.details }, { status: 500 });
    }

    if (!data) {
      // If data is null even without an error (e.g., RLS), return empty array
      return NextResponse.json([]);
    }

    const orders: Order[] = data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone || undefined, // Ensure optional fields are handled
      items: o.items || [], // Default to empty array if items is null/undefined
      status: o.status.toLowerCase() as OrderStatus,
      area: o.area,
      creationDate: o.created_at,
      deliveryAddress: o.customer_address,
      assignedPartnerId: o.assigned_to,
      orderValue: o.total_amount,
    }));

    return NextResponse.json(orders);

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while fetching orders.';
    console.error('Unexpected error in GET /api/orders:', e);
    return NextResponse.json({ message: 'Server error fetching orders.', error: errorMessage }, { status: 500 });
  }
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

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrderSupabaseData)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (error) {
      console.error('Supabase error creating order:', error);
      return NextResponse.json({
        message: 'Error creating order in Supabase.',
        error: error.message,
        details: String(error.details ?? '')
      }, { status: 500 });
    }

    if (!data) {
      // This case should ideally be caught by the error above, but as a safeguard
      console.error('Failed to create order, no data returned from Supabase after insert.');
      return NextResponse.json({ message: 'Failed to create order, no data returned. Possible RLS issue or misconfiguration.' }, { status: 500 });
    }

    const createdOrder: Order = {
      id: data.id,
      customerName: data.customer_name,
      customerPhone: data.customer_phone || undefined,
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
    let errorMessage = 'Invalid request body or unexpected server error.';
     if (e instanceof SyntaxError && e.message.includes('JSON')) { // Specifically catch JSON parsing errors from request body
        errorMessage = 'Invalid request body: Malformed JSON.';
        console.error('Malformed JSON in POST /api/orders request body:', e);
        return NextResponse.json({ message: errorMessage, error: e.message }, { status: 400 });
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    console.error('Unexpected error in POST /api/orders:', e);
    return NextResponse.json({
      message: 'Failed to create order due to unexpected server error.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}
