
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

export type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered';

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; quantity: number }[];
  status: OrderStatus;
  area: string;
  creationDate: string; // ISO string maps to orders.created_at
  deliveryAddress: string; // maps to orders.customer_address
  assignedPartnerId?: string; // maps to orders.assigned_to (UUID)
  orderValue: number; // maps to orders.total_amount
}

export type AssignmentStatus = 'success' | 'failed' | 'active' ; // 'active' for initial state

export type Assignment = {
  id: string; // assignment id
  orderId: string;
  partnerId: string;
  timestamp: string; // Supabase created_at for the assignment record
  status: AssignmentStatus; 
  reason?: string; // Reason for failure, if status is 'failed'
};

export interface FailedAssignmentInfo {
  assignmentId: string;
  orderId: string;
  customerName: string;
  area: string;
  failureReason: string;
  reportedAt: string; // Timestamp of when the assignment record was created/updated (assignments.created_at or assignments.updated_at)
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
