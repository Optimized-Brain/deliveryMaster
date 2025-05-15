
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

// SAMPLE_ORDERS - Now providing 10 dummy pending orders
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ORD001',
    customerName: 'Alice Smith',
    items: [{ name: 'Pepperoni Pizza', quantity: 1 }, { name: 'Coke', quantity: 4 }],
    status: 'pending' as OrderStatus,
    area: 'Downtown',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '123 Main St, Downtown, XY 12345',
    orderValue: 22.50,
  },
  {
    id: 'ORD002',
    customerName: 'Bob Johnson',
    items: [{ name: 'Sushi Platter', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'North End',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '456 Oak Ave, North End, XY 12346',
    orderValue: 35.00,
  },
  {
    id: 'ORD003',
    customerName: 'Carol Williams',
    items: [{ name: 'Burger Combo', quantity: 2 }, { name: 'Fries', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Westside',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '789 Pine Ln, Westside, XY 12347',
    orderValue: 28.75,
  },
  {
    id: 'ORD004',
    customerName: 'David Brown',
    items: [{ name: 'Pad Thai', quantity: 1 }, { name: 'Spring Rolls', quantity: 2 }],
    status: 'pending' as OrderStatus,
    area: 'Eastside',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '101 Maple Dr, Eastside, XY 12348',
    orderValue: 19.99,
  },
  {
    id: 'ORD005',
    customerName: 'Eve Davis',
    items: [{ name: 'Salad Bowl', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Suburbia',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '202 Birch Rd, Suburbia, XY 12349',
    orderValue: 15.20,
  },
  {
    id: 'ORD006',
    customerName: 'Frank Miller',
    items: [{ name: 'Steak Dinner', quantity: 1 }, { name: 'Red Wine', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Financial District',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '303 Cedar St, Financial District, XY 12350',
    orderValue: 55.60,
  },
  {
    id: 'ORD007',
    customerName: 'Grace Wilson',
    items: [{ name: 'Tacos (3)', quantity: 2 }, { name: 'Guacamole', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Uptown',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '404 Elm Pl, Uptown, XY 12351',
    orderValue: 26.80,
  },
  {
    id: 'ORD008',
    customerName: 'Henry Moore',
    items: [{ name: 'Chicken Curry', quantity: 1 }, { name: 'Naan Bread', quantity: 2 }],
    status: 'pending' as OrderStatus,
    area: 'Midtown',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '505 Walnut Ave, Midtown, XY 12352',
    orderValue: 21.30,
  },
  {
    id: 'ORD009',
    customerName: 'Ivy Taylor',
    items: [{ name: 'Pasta Carbonara', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Downtown',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
    deliveryAddress: '606 Spruce St, Downtown, XY 12353',
    orderValue: 18.00,
  },
  {
    id: 'ORD010',
    customerName: 'Jack Anderson',
    items: [{ name: 'Vegetable Stir-fry', quantity: 1 }, { name: 'Iced Tea', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'North End',
    creationDate: new Date(Date.now() - Math.random() * 100000000).toISOString(),
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
    value: "N/A",
    icon: ListOrdered,
    changeType: 'neutral',
  },
  {
    id: 'metric-areas',
    title: 'Top Performing Area',
    value: 'N/A', 
    icon: MapPin,
    changeType: 'neutral',
  },
];

export const AVAILABLE_AREAS: string[] = ['Downtown', 'North End', 'Westside', 'Eastside', 'Suburbia', 'Financial District', 'Uptown', 'Midtown'];
export const PARTNER_STATUSES: PartnerStatus[] = ['active', 'inactive', 'on-break'];
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'];

