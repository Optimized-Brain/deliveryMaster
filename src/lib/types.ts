
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

// Updated OrderStatus to match database constraint
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
  assignedPartnerId?: string;
  orderValue: number;
}

export interface Metric {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string; // e.g., "+5%" or "-2"
  changeType?: 'positive' | 'negative' | 'neutral';
}

export type Assignment = {
  orderId: string;
  partnerId: string;
  timestamp: Date;
  status: 'success' | 'failed';
  reason?: string;
};

export type AssignmentMetrics = {
  totalAssigned: number;
  successRate: number; // e.g., 0.95 for 95%
  averageTime: number; // e.g., in minutes or seconds
  failureReasons: {
    reason: string;
    count: number;
  }[];
};
