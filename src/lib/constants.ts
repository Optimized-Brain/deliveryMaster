
import type { NavItem, Partner, Order, Metric, PartnerStatus, OrderStatus } from '@/lib/types';
import { LayoutDashboard, ListOrdered, Users, Shuffle, Package, BarChart3, Star, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const APP_NAME = "SwiftRoute";

export const NAV_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/partners', label: 'Partners', icon: Users },
  { href: '/assignment', label: 'Smart Assignment', icon: Shuffle },
];

// Sample Partner UUIDs for SAMPLE_ORDERS assignedPartnerId field
const DUMMY_PARTNER_UUID_1 = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const DUMMY_PARTNER_UUID_2 = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
const DUMMY_PARTNER_UUID_3 = "b2c3d4e5-f6a7-8901-2345-67890abcdef0";

// SAMPLE_ORDERS - Updated with UUIDs and 'picked' status. 'cancelled' is not a valid DB status.
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'c3e8a7b8-972e-4c3a-8a8d-02b345a7cdef', // UUID
    customerName: 'Alice Smith',
    customerPhone: '555-0101',
    items: [{ name: 'Pepperoni Pizza', quantity: 1 }, { name: 'Coke', quantity: 4 }],
    status: 'pending',
    area: 'Downtown',
    creationDate: "2024-05-15T10:30:00.000Z",
    deliveryAddress: '123 Main St, Downtown, XY 12345',
    orderValue: 22.50,
  },
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abc001', // UUID
    customerName: 'Bob Johnson',
    customerPhone: '555-0102',
    items: [{ name: 'Sushi Platter', quantity: 1 }],
    status: 'pending',
    area: 'North End',
    creationDate: "2024-05-15T11:00:00.000Z",
    deliveryAddress: '456 Oak Ave, North End, XY 12346',
    orderValue: 35.00,
  },
  {
    id: 'a7b6d5c2-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
    customerName: 'Carol Williams',
    customerPhone: '555-0103',
    items: [{ name: 'Burger Combo', quantity: 2 }, { name: 'Fries', quantity: 1 }],
    status: 'pending',
    area: 'Westside',
    creationDate: "2024-05-14T14:15:00.000Z",
    deliveryAddress: '789 Pine Ln, Westside, XY 12347',
    orderValue: 28.75,
  },
  {
    id: 'f0e1d2c3-b4a5-6789-0123-456789abcdef',
    customerName: 'David Brown',
    customerPhone: '555-0104',
    items: [{ name: 'Pad Thai', quantity: 1 }, { name: 'Spring Rolls', quantity: 2 }],
    status: 'pending',
    area: 'Eastside',
    creationDate: "2024-05-14T16:45:00.000Z",
    deliveryAddress: '101 Maple Dr, Eastside, XY 12348',
    orderValue: 19.99,
  },
  {
    id: 'cba09876-fedc-5432-1098-76543210fedc',
    customerName: 'Eve Davis',
    customerPhone: '555-0105',
    items: [{ name: 'Salad Bowl', quantity: 1 }],
    status: 'assigned',
    assignedPartnerId: DUMMY_PARTNER_UUID_1,
    area: 'Suburbia',
    creationDate: "2024-05-13T09:20:00.000Z",
    deliveryAddress: '202 Birch Rd, Suburbia, XY 12349',
    orderValue: 15.20,
  },
  {
    id: '12345678-90ab-cdef-0123-456789abcdef',
    customerName: 'Frank Miller',
    customerPhone: '555-0106',
    items: [{ name: 'Steak Dinner', quantity: 1 }, { name: 'Red Wine', quantity: 1 }],
    status: 'assigned',
    assignedPartnerId: DUMMY_PARTNER_UUID_2,
    area: 'Financial District',
    creationDate: "2024-05-13T19:05:00.000Z",
    deliveryAddress: '303 Cedar St, Financial District, XY 12350',
    orderValue: 55.60,
  },
  {
    id: 'fedcba98-7654-3210-fedc-ba9876543210',
    customerName: 'Grace Wilson',
    customerPhone: '555-0107',
    items: [{ name: 'Tacos (3)', quantity: 2 }, { name: 'Guacamole', quantity: 1 }],
    status: 'picked', // Changed from 'in-transit' to 'picked'
    assignedPartnerId: DUMMY_PARTNER_UUID_1,
    area: 'Uptown',
    creationDate: "2024-05-12T12:30:00.000Z",
    deliveryAddress: '404 Elm Pl, Uptown, XY 12351',
    orderValue: 26.80,
  },
  {
    id: '98765432-10fe-dcba-9876-543210fedcba',
    customerName: 'Henry Moore',
    customerPhone: '555-0108',
    items: [{ name: 'Chicken Curry', quantity: 1 }, { name: 'Naan Bread', quantity: 2 }],
    status: 'picked', // Changed from 'in-transit' to 'picked'
    assignedPartnerId: DUMMY_PARTNER_UUID_3,
    area: 'Midtown',
    creationDate: "2024-05-12T13:10:00.000Z",
    deliveryAddress: '505 Walnut Ave, Midtown, XY 12352',
    orderValue: 21.30,
  },
  {
    id: 'efcdab89-6745-2301-efcd-ab8967452301',
    customerName: 'Ivy Taylor',
    customerPhone: '555-0109',
    items: [{ name: 'Pasta Carbonara', quantity: 1 }],
    status: 'delivered',
    assignedPartnerId: DUMMY_PARTNER_UUID_2,
    area: 'Downtown',
    creationDate: "2024-05-11T18:50:00.000Z",
    deliveryAddress: '606 Spruce St, Downtown, XY 12353',
    orderValue: 18.00,
  },
  {
    id: '5a4b3c2d-1e0f-9a8b-7c6d-5e4f3a2b1c0d',
    customerName: 'Jack Anderson',
    customerPhone: '555-0110',
    items: [{ name: 'Vegetable Stir-fry', quantity: 1 }, { name: 'Iced Tea', quantity: 1 }],
    status: 'pending',
    area: 'North End',
    creationDate: "2024-05-11T20:00:00.000Z",
    deliveryAddress: '707 Willow Way, North End, XY 12354',
    orderValue: 16.50,
  },
];


// Initial structure for dashboard metrics. Values will be updated dynamically in DashboardPage.tsx
export const DASHBOARD_METRICS_CONFIG: Omit<Metric, 'value' | 'change' | 'changeType'>[] = [
  {
    id: 'metric-total-orders',
    title: 'Total Orders',
    icon: Package,
  },
  {
    id: 'metric-pending-orders',
    title: 'Pending Orders',
    icon: ListOrdered,
  },
  {
    id: 'metric-delivered-orders',
    title: 'Delivered (Last 30d)',
    icon: BarChart3, // Using BarChart3 for 'delivered' as an example
  },
  {
    id: 'metric-avg-order-value',
    title: 'Avg. Order Value',
    icon: DollarSign,
  },
];

export const AVAILABLE_AREAS: string[] = ['Downtown', 'North End', 'Westside', 'Eastside', 'Suburbia', 'Financial District', 'Uptown', 'Midtown'];
export const PARTNER_STATUSES: PartnerStatus[] = ['active', 'inactive', 'on-break'];
// Database constraint: status = ANY (ARRAY['pending'::text, 'assigned'::text, 'picked'::text, 'delivered'::text])
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered'];
