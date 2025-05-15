
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
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
        let errorMessage = `Failed to fetch orders (status: ${response.status})`;
        try {
          const errorText = await response.text();
          console.error("Raw error response from /api/orders:", errorText);
          const errorData = JSON.parse(errorText); // Attempt to parse as JSON
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonParseError) {
          // Failed to parse, means server likely sent HTML or non-JSON
          console.error("Failed to parse JSON error response from fetching orders. Server might have sent HTML.", jsonParseError);
          errorMessage = `Failed to fetch orders. Server returned a non-JSON response (status: ${response.status}). Check server logs.`;
        }
        throw new Error(errorMessage);
      }
      const data: Order[] = await response.json();
      setAllOrders(data);
      setFilteredOrders(data); 
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error Loading Orders",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAllOrders([]); 
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
  }

  const handleViewOrder = (orderId: string) => {
    toast({ title: "View Order", description: `Viewing details for order ${orderId}` });
    // Future: router.push(`/orders/${orderId}`);
  };

  const handleAssignOrder = (orderId: string) => {
    router.push(`/assignment?orderId=${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
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
