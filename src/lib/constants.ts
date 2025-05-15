
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

// SAMPLE_ORDERS - Updated with Indian context and UUIDs
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'c3e8a7b8-972e-4c3a-8a8d-02b345a7cdef',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    items: [{ name: 'Paneer Tikka Masala', quantity: 1 }, { name: 'Lassi', quantity: 2 }],
    status: 'pending',
    area: 'Koramangala',
    creationDate: "2024-05-15T10:30:00.000Z",
    deliveryAddress: '123, 5th Cross, Koramangala, Bangalore, 560034',
    orderValue: 750.00,
  },
  {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abc001',
    customerName: 'Rajesh Kumar',
    customerPhone: '+91 99887 76655',
    items: [{ name: 'Hyderabadi Biryani', quantity: 2 }],
    status: 'pending',
    area: 'Bandra',
    creationDate: "2024-05-15T11:00:00.000Z",
    deliveryAddress: '456, Linking Road, Bandra West, Mumbai, 400050',
    orderValue: 900.00,
  },
  {
    id: 'a7b6d5c2-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
    customerName: 'Anjali Singh',
    customerPhone: '+91 91234 56789',
    items: [{ name: 'Chole Bhature', quantity: 1 }, { name: 'Masala Chai', quantity: 1 }],
    status: 'pending',
    area: 'Connaught Place',
    creationDate: "2024-05-14T14:15:00.000Z",
    deliveryAddress: 'Shop No. 7, Block A, Connaught Place, New Delhi, 110001',
    orderValue: 450.75,
  },
  {
    id: 'f0e1d2c3-b4a5-6789-0123-456789abcdef',
    customerName: 'Vikram Patel',
    customerPhone: '+91 92345 67890',
    items: [{ name: 'Masala Dosa', quantity: 2 }, { name: 'Filter Coffee', quantity: 2 }],
    status: 'pending',
    area: 'T. Nagar',
    creationDate: "2024-05-14T16:45:00.000Z",
    deliveryAddress: '101, Usman Road, T. Nagar, Chennai, 600017',
    orderValue: 350.00,
  },
  {
    id: 'cba09876-fedc-5432-1098-76543210fedc',
    customerName: 'Deepika Reddy',
    customerPhone: '+91 93456 78901',
    items: [{ name: 'Idli Sambar', quantity: 1 }],
    status: 'assigned',
    assignedPartnerId: DUMMY_PARTNER_UUID_1,
    area: 'Jubilee Hills',
    creationDate: "2024-05-13T09:20:00.000Z",
    deliveryAddress: 'Plot No. 202, Road No. 36, Jubilee Hills, Hyderabad, 500033',
    orderValue: 250.00,
  },
  {
    id: '12345678-90ab-cdef-0123-456789abcdef',
    customerName: 'Arjun Mehta',
    customerPhone: '+91 94567 89012',
    items: [{ name: 'Thali (Veg)', quantity: 1 }, { name: 'Gulab Jamun', quantity: 1 }],
    status: 'assigned',
    assignedPartnerId: DUMMY_PARTNER_UUID_2,
    area: 'Salt Lake',
    creationDate: "2024-05-13T19:05:00.000Z",
    deliveryAddress: 'Sector V, Salt Lake City, Kolkata, 700091',
    orderValue: 600.50,
  },
  {
    id: 'fedcba98-7654-3210-fedc-ba9876543210',
    customerName: 'Sneha Iyer',
    customerPhone: '+91 95678 90123',
    items: [{ name: 'Dal Makhani', quantity: 1 }, { name: 'Butter Naan', quantity: 2 }],
    status: 'picked',
    assignedPartnerId: DUMMY_PARTNER_UUID_1,
    area: 'Indiranagar',
    creationDate: "2024-05-12T12:30:00.000Z",
    deliveryAddress: '100 Feet Road, Indiranagar, Bangalore, 560038',
    orderValue: 550.00,
  },
  {
    id: '98765432-10fe-dcba-9876-543210fedcba',
    customerName: 'Amit Joshi',
    customerPhone: '+91 96789 01234',
    items: [{ name: 'Chicken Tikka', quantity: 1 }, { name: 'Roomali Roti', quantity: 3 }],
    status: 'picked',
    assignedPartnerId: DUMMY_PARTNER_UUID_3,
    area: 'Powai',
    creationDate: "2024-05-12T13:10:00.000Z",
    deliveryAddress: 'Near Powai Lake, Powai, Mumbai, 400076',
    orderValue: 800.00,
  },
  {
    id: 'efcdab89-6745-2301-efcd-ab8967452301',
    customerName: 'Neha Gupta',
    customerPhone: '+91 97890 12345',
    items: [{ name: 'Pav Bhaji', quantity: 1 }],
    status: 'delivered',
    assignedPartnerId: DUMMY_PARTNER_UUID_2,
    area: 'Karol Bagh',
    creationDate: "2024-05-11T18:50:00.000Z",
    deliveryAddress: 'Ajmal Khan Road, Karol Bagh, New Delhi, 110005',
    orderValue: 300.00,
  },
  {
    id: '5a4b3c2d-1e0f-9a8b-7c6d-5e4f3a2b1c0d',
    customerName: 'Sandeep Singh',
    customerPhone: '+91 98901 23456',
    items: [{ name: 'Vegetable Korma', quantity: 1 }, { name: 'Jeera Rice', quantity: 1 }],
    status: 'pending',
    area: 'Anna Nagar',
    creationDate: "2024-05-11T20:00:00.000Z",
    deliveryAddress: '3rd Avenue, Anna Nagar, Chennai, 600040',
    orderValue: 420.00,
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
    icon: BarChart3,
  },
  {
    id: 'metric-avg-order-value',
    title: 'Avg. Order Value', // Currency will be prefixed in DashboardPage.tsx
    icon: DollarSign,
  },
];

export const AVAILABLE_AREAS: string[] = ['Koramangala', 'Bandra', 'Connaught Place', 'T. Nagar', 'Jubilee Hills', 'Salt Lake', 'Indiranagar', 'Powai', 'Karol Bagh', 'Anna Nagar', 'MG Road', 'Hauz Khas'];
export const PARTNER_STATUSES: PartnerStatus[] = ['active', 'inactive', 'on-break'];
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'assigned', 'picked', 'delivered', 'cancelled'];
