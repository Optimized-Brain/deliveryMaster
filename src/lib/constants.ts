import type { NavItem, Partner, Order, Metric, PartnerStatus, OrderStatus } from '@/lib/types';
import { LayoutDashboard, ListOrdered, Users, Shuffle, Activity, Star, MapPin } from 'lucide-react';

export const APP_NAME = "SwiftRoute";

export const NAV_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/partners', label: 'Partners', icon: Users },
  { href: '/assignment', label: 'Smart Assignment', icon: Shuffle },
];

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
  {
    id: 'partner-002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '555-5678',
    status: 'inactive' as PartnerStatus,
    assignedAreas: ['Westside'],
    shiftSchedule: 'Weekend 10am-6pm',
    currentLoad: 0,
    rating: 4.5,
    avatarUrl: 'https://placehold.co/100x100.png',
    registrationDate: new Date('2023-03-20T14:30:00Z').toISOString(),
  },
  {
    id: 'partner-003',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    phone: '555-8765',
    status: 'on-break' as PartnerStatus,
    assignedAreas: ['Downtown', 'Eastside'],
    shiftSchedule: 'Mon-Wed 12pm-8pm',
    currentLoad: 1,
    rating: 4.2,
    avatarUrl: 'https://placehold.co/100x100.png',
    registrationDate: new Date('2023-05-10T09:00:00Z').toISOString(),
  },
    {
    id: 'partner-004',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    phone: '555-4321',
    status: 'active' as PartnerStatus,
    assignedAreas: ['North End', 'Suburbia'],
    shiftSchedule: 'Tue-Sat 11am-7pm',
    currentLoad: 3,
    rating: 4.9,
    avatarUrl: 'https://placehold.co/100x100.png',
    registrationDate: new Date('2023-02-01T11:00:00Z').toISOString(),
  },
  {
    id: 'partner-005',
    name: 'Robert Davis',
    email: 'robert.davis@example.com',
    phone: '555-9876',
    status: 'active' as PartnerStatus,
    assignedAreas: ['Downtown', 'Financial District'],
    shiftSchedule: 'Mon-Fri 8am-4pm',
    currentLoad: 1,
    rating: 4.6,
    avatarUrl: 'https://placehold.co/100x100.png',
    registrationDate: new Date('2023-04-05T16:00:00Z').toISOString(),
  },
];

export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'order-101',
    customerName: 'Alice Wonderland',
    items: [{ name: 'Pizza', quantity: 1 }, { name: 'Soda', quantity: 2 }],
    status: 'pending' as OrderStatus,
    area: 'Downtown',
    creationDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    deliveryAddress: '123 Main St, Downtown',
    orderValue: 25.99,
  },
  {
    id: 'order-102',
    customerName: 'Bob The Builder',
    items: [{ name: 'Groceries', quantity: 10 }],
    status: 'assigned' as OrderStatus,
    area: 'North End',
    creationDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    deliveryAddress: '456 Oak Ave, North End',
    assignedPartnerId: 'partner-001',
    orderValue: 75.50,
  },
  {
    id: 'order-103',
    customerName: 'Charlie Brown',
    items: [{ name: 'Electronics', quantity: 1 }],
    status: 'in-transit' as OrderStatus,
    area: 'Westside',
    creationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    deliveryAddress: '789 Pine Ln, Westside',
    assignedPartnerId: 'partner-002',
    orderValue: 199.99,
  },
  {
    id: 'order-104',
    customerName: 'Diana Prince',
    items: [{ name: 'Books', quantity: 3 }],
    status: 'delivered' as OrderStatus,
    area: 'Eastside',
    creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    deliveryAddress: '321 Elm Rd, Eastside',
    assignedPartnerId: 'partner-003',
    orderValue: 45.00,
  },
    {
    id: 'order-105',
    customerName: 'Edward Scissorhands',
    items: [{ name: 'Flowers', quantity: 1 }],
    status: 'pending' as OrderStatus,
    area: 'Suburbia',
    creationDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    deliveryAddress: '567 Willow Dr, Suburbia',
    orderValue: 35.00,
  },
  {
    id: 'order-106',
    customerName: 'Fiona Gallagher',
    items: [{ name: 'Takeout Food', quantity: 4 }],
    status: 'cancelled' as OrderStatus,
    area: 'Downtown',
    creationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    deliveryAddress: '890 Maple Ct, Downtown',
    orderValue: 60.25,
  },
];

export const DASHBOARD_METRICS: Metric[] = [
  {
    id: 'metric-partners',
    title: 'Total Active Partners',
    value: SAMPLE_PARTNERS.filter(p => p.status === 'active').length,
    icon: Users,
    change: '+2 this week',
    changeType: 'positive',
  },
  {
    id: 'metric-rating',
    title: 'Average Partner Rating',
    value: (SAMPLE_PARTNERS.reduce((sum, p) => sum + p.rating, 0) / SAMPLE_PARTNERS.length).toFixed(1),
    icon: Star,
    change: '+0.1',
    changeType: 'positive',
  },
  {
    id: 'metric-orders',
    title: 'Pending Orders',
    value: SAMPLE_ORDERS.filter(o => o.status === 'pending').length,
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
