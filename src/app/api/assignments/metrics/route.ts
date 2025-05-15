
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { AssignmentMetrics } from '@/lib/types';

export async function GET(request: Request) {
  try {
    // Fetch total assignments
    const { count: totalAssignments, error: totalError } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      return NextResponse.json({ message: 'Error fetching total assignments count.', error: totalError.message }, { status: 500 });
    }

    // Fetch successful assignments
    const { count: successfulAssignments, error: successError } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');

    if (successError) {
      return NextResponse.json({ message: 'Error fetching successful assignments count.', error: successError.message }, { status: 500 });
    }
    
    const successRate = totalAssignments && totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;

    // Fetch failure reasons
    const { data: failedAssignmentsData, error: failureReasonsError } = await supabase
      .from('assignments')
      .select('reason')
      .eq('status', 'failed')
      .not('reason', 'is', null); // Only consider assignments where a reason is provided

    if (failureReasonsError) {
      return NextResponse.json({ message: 'Error fetching failure reasons.', error: failureReasonsError.message }, { status: 500 });
    }

    const failureReasonsMap = new Map<string, number>();
    if (failedAssignmentsData) {
        failedAssignmentsData.forEach(item => {
            if(item.reason) { // Ensure reason is not null or empty
                failureReasonsMap.set(item.reason, (failureReasonsMap.get(item.reason) || 0) + 1);
            }
        });
    }
    
    const failureReasons = Array.from(failureReasonsMap.entries()).map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    const metrics: AssignmentMetrics = {
      totalAssignments: totalAssignments || 0,
      successfulAssignments: successfulAssignments || 0,
      successRate: parseFloat(successRate.toFixed(1)), // Rounded to one decimal place
      failureReasons: failureReasons,
    };

    return NextResponse.json(metrics);

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while fetching assignment metrics.';
    return NextResponse.json({ message: 'Server error fetching assignment metrics.', error: errorMessage }, { status: 500 });
  }
}
