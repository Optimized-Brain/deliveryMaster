"use client"; // Marking as client component because of useState and event handlers

import React, { useState, useMemo } from 'react';
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { SAMPLE_ORDERS } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPage() {
  const { toast } = useToast();
  const [allOrders] = useState<Order[]>(SAMPLE_ORDERS); // In real app, this would be fetched
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(allOrders);

  const handleFilterChange = (filters: { status?: OrderStatus; area?: string; date?: Date }) => {
    let tempOrders = allOrders;
    if (filters.status && filters.status !== "all" as any) { // 'all' is a custom value for UI
      tempOrders = tempOrders.filter(order => order.status === filters.status);
    }
    if (filters.area) {
      tempOrders = tempOrders.filter(order => order.area.toLowerCase().includes(filters.area!.toLowerCase()));
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
    // Navigate to order detail page or show modal
  };

  const handleAssignOrder = (orderId: string) => {
    toast({ title: "Assign Order", description: `Assigning partner for order ${orderId}` });
    // Navigate to assignment page or show assignment modal
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        {/* Add New Order button can be placed here if needed */}
      </div>
      
      <OrderFilters onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
      <OrderTable 
        orders={filteredOrders} 
        onViewOrder={handleViewOrder} 
        onAssignOrder={handleAssignOrder} 
      />
    </div>
  );
}
