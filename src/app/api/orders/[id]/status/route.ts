
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';

interface Params {
  id: string;
}

// PUT /api/orders/[id]/status
export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  try {
    const body = await request.json();
    const { status, assignedPartnerId } = body;

    if (!status) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }
    
    // Validate status if necessary
    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return NextResponse.json({ message: `Invalid status: ${status}` }, { status: 400 });
    }

    const updateData: { status: OrderStatus; assigned_partner_id?: string } = { status };
    if (assignedPartnerId) {
      updateData.assigned_partner_id = assignedPartnerId;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating order ${id} status:`, error);
      if (error.code === 'PGRST116') { // Resource not found
        return NextResponse.json({ message: `Order with ID ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ message: `Error updating order status`, error: error.message }, { status: 500 });
    }
    
    if (!data) {
        return NextResponse.json({ message: `Order with ID ${id} not found after update.` }, { status: 404 });
    }

    return NextResponse.json({ 
        message: `Status for order ${id} updated successfully`, 
        updatedOrder: {
            id: data.id,
            customerName: data.customer_name,
            items: data.items || [],
            status: data.status as OrderStatus,
            area: data.area,
            creationDate: data.creation_date,
            deliveryAddress: data.delivery_address,
            assignedPartnerId: data.assigned_partner_id,
            orderValue: data.order_value,
        }
    });

  } catch (e) {
    console.error('Error processing PUT /api/orders/[id]/status request:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: 'Invalid request body or unexpected server error', error: errorMessage }, { status: 400 });
  }
}
