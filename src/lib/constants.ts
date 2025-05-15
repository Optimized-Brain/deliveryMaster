
import type { NavItem, Partner, Order, Metric, PartnerStatus, OrderStatus } from '@/lib/types';
import { LayoutDashboard, ListOrdered, Users, Shuffle, Activity, Star, MapPin } from 'lucide-react';

export const APP_NAME = "SwiftRoute";

export const NAV_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/partners', label: 'Partners', icon: Users },
  { href: '/assignment', label: 'Smart Assignment', icon: Shuffle },
];

// Fallback sample data for components that might still rely on it during transition
export const SAMPLE_PARTNERS: Partner[] = []; // Actual data should be fetched

// Dummy Partner UUIDs for SAMPLE_ORDERS assignedPartnerId field
const DUMMY_PARTNER_UUID_1 = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const DUMMY_PARTNER_UUID_2 = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
const DUMMY_PARTNER_UUID_3 = "b2c3d4e5-f6a7-8901-2345-67890abcdef0";

// SAMPLE_ORDERS - Updated with diverse statuses for demo and UUIDs
export const SAMPLE_ORDERS: Order[] = [
  {
    id: '1d9c7c31-176a-4a40-9e0e-77a17dfc4b8f', // Changed from ORD001
    customerName: 'Alice Smith',
    items: [{ name: 'Pepperoni Pizza', quantity: 1 }, { name: 'Coke', quantity: 4 }],
    status: 'pending' as OrderStatus,
    area: 'Downtown',
    creationDate: "2024-05-15T10:30:00.000Z",
    deliveryAddress: '123 Main St, Downtown, XY 12345',
    orderValue: 22.50,
  },
  {
    id: '3f2f7c70-8f98-40c7-96d9-83e9c817531a', // Changed from ORD002
    customerName: 'Bob Johnson',
    items: [{ name: 'Sushi Platter', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'North End',
    creationDate: "2024-05-15T11:00:00.000Z",
    deliveryAddress: '456 Oak Ave, North End, XY 12346',
    orderValue: 35.00,
  },
  {
    id: 'a7b6d5c2-3e4f-5a6b-7c8d-9e0f1a2b3c4d', // Changed from ORD003
    customerName: 'Carol Williams',
    items: [{ name: 'Burger Combo', quantity: 2 }, { name: 'Fries', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Westside',
    creationDate: "2024-05-14T14:15:00.000Z",
    deliveryAddress: '789 Pine Ln, Westside, XY 12347',
    orderValue: 28.75,
  },
  {
    id: 'f0e1d2c3-b4a5-6789-0123-456789abcdef', // Changed from ORD004
    customerName: 'David Brown',
    items: [{ name: 'Pad Thai', quantity: 1 }, { name: 'Spring Rolls', quantity: 2 }],
    status: 'pending' as OrderStatus,
    area: 'Eastside',
    creationDate: "2024-05-14T16:45:00.000Z",
    deliveryAddress: '101 Maple Dr, Eastside, XY 12348',
    orderValue: 19.99,
  },
  {
    id: 'cba09876-fedc-5432-1098-76543210fedc', // Changed from ORD005
    customerName: 'Eve Davis',
    items: [{ name: 'Salad Bowl', quantity: 1 }],
    status: 'assigned' as OrderStatus,
    assignedPartnerId: DUMMY_PARTNER_UUID_1, // Changed from partner-dummy-1
    area: 'Suburbia',
    creationDate: "2024-05-13T09:20:00.000Z",
    deliveryAddress: '202 Birch Rd, Suburbia, XY 12349',
    orderValue: 15.20,
  },
  {
    id: '12345678-90ab-cdef-0123-456789abcdef', // Changed from ORD006
    customerName: 'Frank Miller',
    items: [{ name: 'Steak Dinner', quantity: 1 }, { name: 'Red Wine', quantity: 1 }],
    status: 'assigned' as OrderStatus,
    assignedPartnerId: DUMMY_PARTNER_UUID_2, // Changed from partner-dummy-2
    area: 'Financial District',
    creationDate: "2024-05-13T19:05:00.000Z",
    deliveryAddress: '303 Cedar St, Financial District, XY 12350',
    orderValue: 55.60,
  },
  {
    id: 'fedcba98-7654-3210-fedc-ba9876543210', // Changed from ORD007
    customerName: 'Grace Wilson',
    items: [{ name: 'Tacos (3)', quantity: 2 }, { name: 'Guacamole', quantity: 1 }],
    status: 'in-transit' as OrderStatus,
    assignedPartnerId: DUMMY_PARTNER_UUID_1, // Changed from partner-dummy-1
    area: 'Uptown',
    creationDate: "2024-05-12T12:30:00.000Z",
    deliveryAddress: '404 Elm Pl, Uptown, XY 12351',
    orderValue: 26.80,
  },
  {
    id: '98765432-10fe-dcba-9876-543210fedcba', // Changed from ORD008
    customerName: 'Henry Moore',
    items: [{ name: 'Chicken Curry', quantity: 1 }, { name: 'Naan Bread', quantity: 2 }],
    status: 'in-transit' as OrderStatus,
    assignedPartnerId: DUMMY_PARTNER_UUID_3, // Changed from partner-dummy-3
    area: 'Midtown',
    creationDate: "2024-05-12T13:10:00.000Z",
    deliveryAddress: '505 Walnut Ave, Midtown, XY 12352',
    orderValue: 21.30,
  },
  {
    id: 'efcdab89-6745-2301-efcd-ab8967452301', // Changed from ORD009
    customerName: 'Ivy Taylor',
    items: [{ name: 'Pasta Carbonara', quantity: 1 }],
    status: 'delivered' as OrderStatus,
    assignedPartnerId: DUMMY_PARTNER_UUID_2, // Changed from partner-dummy-2
    area: 'Downtown',
    creationDate: "2024-05-11T18:50:00.000Z",
    deliveryAddress: '606 Spruce St, Downtown, XY 12353',
    orderValue: 18.00,
  },
  {
    id: '5a4b3c2d-1e0f-9a8b-7c6d-5e4f3a2b1c0d', // Changed from ORD010
    customerName: 'Jack Anderson',
    items: [{ name: 'Vegetable Stir-fry', quantity: 1 }, { name: 'Iced Tea', quantity: 1 }],
    status: 'cancelled' as OrderStatus,
    area: 'North End',
    creationDate: "2024-05-11T20:00:00.000Z",
    deliveryAddress: '707 Willow Way, North End, XY 12354',
    orderValue: 16.50,
  },
];


export const DASHBOARD_METRICS: Metric[] = [
  {
    id: 'metric-partners',
    title: 'Total Active Partners',
    value: "N/A",
    icon: Users,
    change: '...',
    changeType: 'neutral',
  },
  {
    id: 'metric-rating',
    title: 'Average Partner Rating',
    value: "N/A",
    icon: Star,
    change: '...',
    changeType: 'neutral',
  },
  {
    id: 'metric-orders',
    title: 'Pending Orders',
    // This count is based on the updated SAMPLE_ORDERS above
    value: SAMPLE_ORDERS.filter(o => o.status === 'pending').length, 
    icon: ListOrdered,
    changeType: 'neutral',
  },
  {
    id: 'metric-areas',
    title: 'Top Performing Area',
    value: 'N/A', // This would require more complex calculation from orders
    icon: MapPin,
    changeType: 'neutral',
  },
];

export const AVAILABLE_AREAS: string[] = ['Downtown', 'North End', 'Westside', 'Eastside', 'Suburbia', 'Financial District', 'Uptown', 'Midtown'];
export const PARTNER_STATUSES: PartnerStatus[] = ['active', 'inactive', 'on-break'];
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'];
