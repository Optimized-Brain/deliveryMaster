
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export type PartnerStatus = 'active' | 'inactive' | 'on-break';

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  assignedAreas: string[];
  shiftStart: string; // e.g., "09:00"
  shiftEnd: string;   // e.g., "17:00"
  currentLoad: number;
  rating: number; // e.g., 4.5
  registrationDate: string; // ISO string (maps to created_at from Supabase)
}

// Database constraint: status = ANY (ARRAY['pending'::text, 'assigned'::text, 'picked'::text, 'delivered'::text])
export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered';

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; quantity: number }[];
  status: OrderStatus;
  area: string;
  creationDate: string; // ISO string
  deliveryAddress: string;
  assignedPartnerId?: string; // In Supabase: assigned_to (UUID)
  orderValue: number; // In Supabase: total_amount
}

export interface Metric {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

// status in assignments table is 'success' or 'failed' (outcome) or 'active' (initial)
// or NULL depending on schema for initial state.
// The CHECK constraint in DB for assignments.status is `status = ANY (ARRAY['success'::text, 'failed'::text])`
// And it's NOT NULL. So initial must be 'success' or 'failed'. We chose 'success'.
export type AssignmentStatus = 'success' | 'failed';

export type Assignment = {
  id: string; // assignment id
  orderId: string;
  partnerId: string;
  timestamp: string; // Supabase created_at
  status: AssignmentStatus; // Outcome status: 'success' or 'failed'
  reason?: string; // Reason for failure, if status is 'failed'
};

export interface FailedAssignmentInfo {
  assignmentId: string;
  orderId: string;
  customerName: string;
  area: string;
  failureReason: string;
  reportedAt: string; // Timestamp of when the failure was reported (assignments.updated_at)
}


export type AssignmentMetrics = {
  totalAssigned: number;
  successRate: number; // e.g., 0.95 for 95%
  averageTime: number; // e.g., in minutes or seconds
  failureReasons: {
    reason: string;
    count: number;
  }[];
};

// Type for chart data
export interface DailyOrdersChartData {
  date: string; // Format: "MMM d"
  orders: number;
}

