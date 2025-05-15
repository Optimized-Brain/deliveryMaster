
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
  completedOrders: number;
  cancelledOrders: number;
}

export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; quantity: number }[];
  status: OrderStatus;
  area: string;
  creationDate: string; // ISO string maps to orders.created_at
  deliveryAddress: string; // maps to orders.customer_address
  assignedPartnerId?: string | null; // maps to orders.assigned_to (UUID)
  orderValue: number; // maps to orders.total_amount
}

// This type describes the state of an assignment *after* an outcome
// or issue has potentially been recorded.
export type Assignment = {
  id: string; // assignment id
  orderId: string;
  partnerId: string;
  timestamp: string; // Supabase created_at for the assignment record
  status: 'success' | 'failed' | 'active'; // 'active' is the initial state
  reason?: string; // Reason for failure, if status is 'failed'
};

export interface FailedAssignmentInfo {
  assignmentId: string;
  orderId: string;
  customerName: string;
  area: string;
  failureReason: string;
  reportedAt: string; // Timestamp of when the assignment record was created (assignments.created_at)
}


export interface Metric {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

// Type for chart data
export interface DailyOrdersChartData {
  date: string; // Format: "MMM d"
  orders: number;
}
