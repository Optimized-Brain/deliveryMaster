
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { SAMPLE_ORDERS } from '@/lib/constants'; // Using sample data for demo
import { z } from 'zod';

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
  // --- Original Supabase logic (Uncomment to switch to live data) ---
  console.log("GET /api/orders - Using Supabase logic");
  let query = supabase.from('orders').select('*');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  
  query = query.order('created_at', { ascending: false }); // Order by created_at

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders from Supabase:', error);
    return NextResponse.json({ message: 'Error fetching orders', error: error.message }, { status: 500 });
  }

  const orders: Order[] = data.map((o: any) => ({
    id: o.id,
    customerName: o.customer_name,
    items: o.items || [], 
    status: o.status as OrderStatus,
    area: o.area,
    creationDate: o.created_at, 
    deliveryAddress: o.customer_address,
    assignedPartnerId: o.assigned_to, 
    orderValue: o.total_amount, // Mapped from total_amount
  }));

  return NextResponse.json(orders);
  // --- End Original Supabase logic ---
  */
}

// Zod schema for validating new order data
const createOrderSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
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

    // Validate incoming data
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid order data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const validatedData = validation.data;

    const newOrderSupabaseData = {
      customer_name: validatedData.customerName,
      items: [{ name: validatedData.itemName, quantity: validatedData.itemQuantity }], // Simplified items structure
      status: 'pending' as OrderStatus, // Default status
      area: validatedData.area,
      customer_address: validatedData.deliveryAddress,
      total_amount: validatedData.orderValue, // Mapped to total_amount
      // Supabase will auto-generate 'id' (UUID) and 'created_at'
    };

    console.log('Attempting to insert new order into Supabase:', newOrderSupabaseData);

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrderSupabaseData)
      .select()
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
      items: data.items || [],
      status: data.status as OrderStatus,
      area: data.area,
      creationDate: data.created_at,
      deliveryAddress: data.customer_address,
      assignedPartnerId: data.assigned_to,
      orderValue: data.total_amount, // Mapped from total_amount
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
