
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
// import { SAMPLE_ORDERS } from "@/lib/constants"; // Will fetch from API
import type { Order, OrderStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OrdersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]); 
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }
      const data: Order[] = await response.json();
      setAllOrders(data);
      setFilteredOrders(data); // Initially show all fetched orders
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error Loading Orders",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAllOrders([]); // Set to empty on error
      setFilteredOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (filters: { status?: OrderStatus | "all"; area?: string | "all"; date?: Date }) => {
    let tempOrders = allOrders;
    
    if (filters.status && filters.status !== "all") {
      tempOrders = tempOrders.filter(order => order.status === filters.status);
    }
    
    if (filters.area && filters.area !== "all") {
      // Ensure area is not undefined before calling toLowerCase
      tempOrders = tempOrders.filter(order => order.area && filters.area && order.area.toLowerCase().includes(filters.area.toLowerCase()));
    }
    
    if (filters.date) {
      tempOrders = tempOrders.filter(order => 
        new Date(order.creationDate).toDateString() === filters.date!.toDateString()
      );
    }
    setFilteredOrders(tempOrders);
  };

  const handleClearFilters = () => {
    setFilteredOrders(allOrders);
    // The OrderFilters component should reset its own internal state, or we pass a reset function to it.
  }

  const handleViewOrder = (orderId: string) => {
    toast({ title: "View Order", description: `Viewing details for order ${orderId}` });
    // Future: Navigate to order detail page or show modal
  };

  const handleAssignOrder = (orderId: string) => {
    // Navigate to the assignment page, passing the orderId as a query parameter
    router.push(`/assignment?orderId=${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        {/* Add New Order button can be placed here if needed */}
      </div>
      
      <OrderFilters onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading orders...</p>
        </div>
      ) : (
        <OrderTable 
          orders={filteredOrders} 
          onViewOrder={handleViewOrder} 
          onAssignOrder={handleAssignOrder} 
        />
      )}
    </div>
  );
}
