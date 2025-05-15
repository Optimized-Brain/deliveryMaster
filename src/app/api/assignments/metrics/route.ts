import { NextResponse } from 'next/server';

// GET /api/assignments/metrics
export async function GET(request: Request) {
  // In a real application, you would fetch or calculate assignment metrics
  const metrics = {
    totalAssignments: 150,
    avgAssignmentTime: '15 mins',
    successfulAssignments: 145,
  };
  return NextResponse.json(metrics);
}
