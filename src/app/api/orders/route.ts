
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { z } from 'zod';

// GET /api/orders
export async function GET(request: Request) {
  console.log('[API GET /api/orders] Received request.');
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as OrderStatus | null;
    const assignedPartnerIdFilter = searchParams.get('assignedPartnerId');
    console.log(`[API GET /api/orders] Filters: status=${statusFilter}, partnerId=${assignedPartnerIdFilter}`);

    let query;

    if (assignedPartnerIdFilter) {
      console.log(`[API GET /api/orders] Applying partner ID filter: ${assignedPartnerIdFilter}`);
      // Step 1: Get all order_ids from assignments for this partner
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('order_id')
        .eq('partner_id', assignedPartnerIdFilter);

      if (assignmentsError) {
        console.error(`[API GET /api/orders] Supabase error fetching assignments for partner ${assignedPartnerIdFilter}:`, assignmentsError);
        return NextResponse.json({ message: 'Error fetching assignments for partner from Supabase.', error: assignmentsError.message, details: assignmentsError.details }, { status: 500 });
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        console.log(`[API GET /api/orders] No assignments found for partner ${assignedPartnerIdFilter}. Returning empty array.`);
        return NextResponse.json([]);
      }

      const orderIds = assignmentsData.map(a => a.order_id);
      console.log(`[API GET /api/orders] Found ${orderIds.length} order IDs for partner ${assignedPartnerIdFilter}:`, orderIds);

      // Step 2: Fetch orders matching these order_ids
      query = supabase
        .from('orders')
        .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
        .in('id', orderIds);
      
      // Apply status filter if also present (though less common when fetching all for a partner)
      if (statusFilter) {
        console.log(`[API GET /api/orders] Applying status filter: ${statusFilter} to partner's orders`);
        query = query.eq('status', statusFilter);
      }

    } else {
      // Original logic for fetching orders without specific partner filter
      query = supabase.from('orders').select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount');
      if (statusFilter) {
        console.log(`[API GET /api/orders] Applying status filter: ${statusFilter}`);
        query = query.eq('status', statusFilter);
      }
    }

    query = query.order('created_at', { ascending: false });

    console.log('[API GET /api/orders] Executing Supabase query for orders.');
    const { data: supabaseData, error: supabaseError } = await query;

    if (supabaseError) {
      console.error('[API GET /api/orders] Supabase error fetching orders:', supabaseError);
      return NextResponse.json({ message: 'Error fetching orders from Supabase.', error: supabaseError.message, details: supabaseError.details }, { status: 500 });
    }

    console.log(`[API GET /api/orders] Supabase query successful. Records fetched: ${supabaseData ? supabaseData.length : 'null'}`);
    if (assignedPartnerIdFilter) {
        console.log(`[API GET /api/orders] Returning ${supabaseData ? supabaseData.length : 0} orders for partner ${assignedPartnerIdFilter}.`);
    }


    if (!supabaseData) {
      console.log('[API GET /api/orders] No data returned from Supabase. Returning empty array.');
      return NextResponse.json([]);
    }

    const orders: Order[] = supabaseData.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone || undefined,
      items: o.items || [],
      status: o.status ? (o.status.toLowerCase() as OrderStatus) : ('pending' as OrderStatus),
      area: o.area,
      creationDate: o.created_at,
      deliveryAddress: o.customer_address,
      assignedPartnerId: o.assigned_to,
      orderValue: Number(o.total_amount) || 0, 
    }));

    console.log(`[API GET /api/orders] Mapped ${orders.length} orders. Sending response.`);
    return NextResponse.json(orders);

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while fetching orders.';
    console.error('[API GET /api/orders] Unexpected server error:', e);
    return NextResponse.json({ message: 'Server error fetching orders.', error: errorMessage }, { status: 500 });
  }
}

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9A-Z]{3}[)])?([-]?[\s]?[0-9A-Z]{3}[-]?[\s]?[0-9A-Z]{4,6})$/
);

const createOrderSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z.string().regex(phoneRegex, 'Invalid phone number, e.g. +91 XXXXX XXXXX').optional().or(z.literal('')),
  itemName: z.string().min(1, "Item name is required"),
  itemQuantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  area: z.string().min(1, "Area is required"),
  deliveryAddress: z.string().min(5, "Delivery address must be at least 5 characters"),
  orderValue: z.coerce.number().positive("Order value must be a positive number"),
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
      // created_at is handled by Supabase default
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrderSupabaseData)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (error) {
      console.error('[API POST /api/orders] Supabase error creating order:', error);
      return NextResponse.json({
        message: 'Error creating order in Supabase.',
        error: error.message,
        details: String(error.details ?? '')
      }, { status: 500 });
    }

    if (!data) {
      console.error('[API POST /api/orders] Failed to create order, no data returned from Supabase after insert.');
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
      orderValue: Number(data.total_amount) || 0, 
    };

    return NextResponse.json({ message: 'Order created successfully', order: createdOrder }, { status: 201 });

  } catch (e: unknown) {
    let errorMessage = 'Invalid request body or unexpected server error.';
     if (e instanceof SyntaxError && e.message.includes('JSON')) {
        errorMessage = 'Invalid request body: Malformed JSON.';
        console.error('[API POST /api/orders] Malformed JSON in request body:', e);
        return NextResponse.json({ message: errorMessage, error: e.message }, { status: 400 });
    } else if (e instanceof Error) {
        errorMessage = e.message;
    }
    console.error('[API POST /api/orders] Unexpected server error:', e);
    return NextResponse.json({
      message: 'Failed to create order due to unexpected server error.',
      error: String(errorMessage)
    }, { status: 500 });
  }
}
