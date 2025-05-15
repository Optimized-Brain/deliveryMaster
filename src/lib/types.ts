
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
  avatarUrl?: string;
  registrationDate: string; // ISO string (maps to created_at from Supabase)
}

export type OrderStatus = 'pending' | 'assigned' | 'in-transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string; // Added customer phone
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
