
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FailedAssignmentInfo } from '@/lib/types';

// GET /api/assignments
// Supports query param: ?status=failed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    if (statusFilter === 'failed') {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          id, 
          reason, 
          created_at, 
          orders (
            id, 
            customer_name, 
            area
          )
        `)
        .eq('status', 'failed')
        .order('created_at', { ascending: false }); // Changed from updated_at to created_at

      if (error) {
        return NextResponse.json({ message: 'Error fetching failed assignments from Supabase.', error: error.message, details: error.details }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json([]);
      }

      const failedAssignments: FailedAssignmentInfo[] = data
        .map((a: any) => {
          if (!a.orders) return null; // Skip if order data is missing due to RLS or other issues
          return {
            assignmentId: a.id,
            orderId: a.orders.id,
            customerName: a.orders.customer_name,
            area: a.orders.area,
            failureReason: a.reason || 'No reason provided',
            reportedAt: a.created_at, // Changed from updated_at to created_at
          };
        })
        .filter(Boolean) as FailedAssignmentInfo[]; // Filter out nulls

      return NextResponse.json(failedAssignments);
    }

    // Default: if no specific status or other filters are implemented, return empty or error
    return NextResponse.json({ message: 'Invalid or missing query parameters. Supported: ?status=failed' }, { status: 400 });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while fetching assignments.';
    return NextResponse.json({ message: 'Server error fetching assignments.', error: errorMessage }, { status: 500 });
  }
}
