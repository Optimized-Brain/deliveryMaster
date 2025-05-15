
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, Order } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  console.log(`PUT /api/orders/${id}/status: Received request for order ID: ${id}`);

  try {
    const body = await request.json();
    const { status, assignedPartnerId } = body;

    if (!status) {
      console.warn(`PUT /api/orders/${id}/status: Status is required in request body.`);
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }
    
    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'in transit', 'delivered', 'cancelled']; // Changed 'in-transit'
    if (!validStatuses.includes(status)) {
        console.warn(`PUT /api/orders/${id}/status: Invalid status provided: ${status}.`);
        return NextResponse.json({ message: `Invalid status: ${status}` }, { status: 400 });
    }

    const updateData: { status: OrderStatus; assigned_to?: string | null } = { status };
    if (assignedPartnerId) {
      updateData.assigned_to = assignedPartnerId;
    } else if (status === 'pending' || status === 'cancelled') {
      // If moving to pending or cancelled, explicitly nullify assigned_to
      updateData.assigned_to = null;
    }


    console.log(`PUT /api/orders/${id}/status: Attempting to update order with data:`, updateData);
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('id, customer_name, customer_phone, items, status, area, created_at, customer_address, assigned_to, total_amount')
      .single();

    if (error) {
      console.error(`PUT /api/orders/${id}/status: Error updating order in Supabase:`, error);
      if (error.code === 'PGRST116') { // PostgREST code for "Resource not found"
        return NextResponse.json({ message: `Order with ID ${id} not found.` }, { status: 404 });
      }
      // For other Supabase errors, provide a more specific message
      return NextResponse.json({ message: `Order update failed: ${error.message || 'Unknown Supabase error'}` }, { status: 500 });
    }
    
    if (!data) {
        console.warn(`PUT /api/orders/${id}/status: Order not found after update attempt (no data returned).`);
        return NextResponse.json({ message: `Order with ID ${id} not found after update attempt.` }, { status: 404 });
    }

    console.log(`PUT /api/orders/${id}/status: Order updated successfully.`);
    const updatedOrder: Order = {
        id: data.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        items: data.items || [],
        status: data.status as OrderStatus,
        area: data.area,
        creationDate: data.created_at,
        deliveryAddress: data.customer_address,
        assignedPartnerId: data.assigned_to, 
        orderValue: data.total_amount,
    };

    return NextResponse.json({ 
        message: `Status for order ${id} updated successfully to ${status}.`, 
        updatedOrder: updatedOrder
    });

  } catch (e) {
    console.error(`PUT /api/orders/${id}/status: Unexpected error processing request:`, e);
    const errorInstance = e as Error;
    // Distinguish client error (bad JSON) from other server errors
    if (errorInstance.name === 'SyntaxError' && errorInstance.message.includes('JSON')) {
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.', error: errorInstance.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unexpected server error during order update.', error: errorInstance.message }, { status: 500 });
  }
}
