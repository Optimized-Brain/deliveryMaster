
import type { NavItem, Partner, Order, Metric, PartnerStatus, OrderStatus } from '@/lib/types';
import { LayoutDashboard, ListOrdered, Users, Shuffle, Activity, Star, MapPin } from 'lucide-react';

export const APP_NAME = "SwiftRoute";

export const NAV_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/partners', label: 'Partners', icon: Users },
  { href: '/assignment', label: 'Smart Assignment', icon: Shuffle },
];

// TODO: Replace SAMPLE_PARTNERS with data fetched from Supabase /api/partners
// This sample data is still used by SmartAssignmentForm.tsx and potentially other places.
/*
export const SAMPLE_PARTNERS: Partner[] = [
  {
    id: 'partner-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '555-1234',
    status: 'active' as PartnerStatus,
    assignedAreas: ['Downtown', 'North End'],
    shiftSchedule: 'Mon-Fri 9am-5pm',
    currentLoad: 2,
    rating: 4.8,
    avatarUrl: 'https://placehold.co/100x100.png',
    registrationDate: new Date('2023-01-15T10:00:00Z').toISOString(),
  },
  // ... other sample partners
];
*/

// TODO: Replace SAMPLE_ORDERS with data fetched from Supabase /api/orders
// This sample data is still used by SmartAssignmentForm.tsx, OrdersPage.tsx (initially), and potentially other places.
/*
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'order-101',
    customerName: 'Alice Wonderland',
    items: [{ name: 'Pizza', quantity: 1 }, { name: 'Soda', quantity: 2 }],
    status: 'pending' as OrderStatus,
    area: 'Downtown',
    creationDate: '2024-05-15T10:30:00Z',
    deliveryAddress: '123 Main St, Downtown',
    orderValue: 25.99,
  },
  // ... other sample orders
];
*/
// Fallback sample data for components that might still rely on it during transition
export const SAMPLE_PARTNERS: Partner[] = []; // Empty array, actual data should be fetched
export const SAMPLE_ORDERS: Order[] = []; // Empty array, actual data should be fetched


export const DASHBOARD_METRICS: Metric[] = [
  {
    id: 'metric-partners',
    title: 'Total Active Partners',
    // value: SAMPLE_PARTNERS.filter(p => p.status === 'active').length, // Old calculation
    value: "N/A", // TODO: Fetch this from API / Supabase
    icon: Users,
    change: '...', // TODO: Calculate or fetch
    changeType: 'neutral',
  },
  {
    id: 'metric-rating',
    title: 'Average Partner Rating',
    // value: (SAMPLE_PARTNERS.reduce((sum, p) => sum + p.rating, 0) / (SAMPLE_PARTNERS.length || 1)).toFixed(1), // Old calculation
    value: "N/A", // TODO: Fetch this from API / Supabase
    icon: Star,
    change: '...', // TODO: Calculate or fetch
    changeType: 'neutral',
  },
  {
    id: 'metric-orders',
    title: 'Pending Orders',
    // value: SAMPLE_ORDERS.filter(o => o.status === 'pending').length, // Old calculation
    value: "N/A", // TODO: Fetch this from API / Supabase
    icon: ListOrdered,
    changeType: 'neutral',
  },
  {
    id: 'metric-areas',
    title: 'Top Performing Area',
    value: 'Downtown', // This would be dynamically calculated
    icon: MapPin,
    changeType: 'neutral',
  },
];

export const AVAILABLE_AREAS: string[] = ['Downtown', 'North End', 'Westside', 'Eastside', 'Suburbia', 'Financial District', 'Uptown', 'Midtown'];
export const PARTNER_STATUSES: PartnerStatus[] = ['active', 'inactive', 'on-break'];
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'];
