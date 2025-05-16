
"use client"; // Can keep this as client or remove if it becomes a pure shell

import { Suspense } from 'react';
import OrdersPageClientContent from '@/components/orders/OrdersPageClient';
import { Loader2 } from 'lucide-react';

function OrdersPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]"> {/* Adjusted height for better centering */}
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading orders...</p>
    </div>
  );
}

// This page.tsx becomes the shell
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageLoading />}>
      <OrdersPageClientContent />
    </Suspense>
  );
}
