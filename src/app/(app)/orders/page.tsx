
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderCreationForm } from "@/components/orders/OrderCreationForm";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { ReportAssignmentIssueDialog } from "@/components/orders/ReportAssignmentIssueDialog";
import type { Order, OrderStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function OrdersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isReportIssueDialogOpen, setIsReportIssueDialogOpen] = useState(false);
  const [orderForReportingIssue, setOrderForReportingIssue] = useState<string | null>(null);

  const [statusUiFilter, setStatusUiFilter] = useState<OrderStatus | "all">("all");
  const [areaUiFilter, setAreaUiFilter] = useState<string>("all");
  const [dateUiFilter, setDateUiFilter] = useState<Date | undefined>(undefined);
  
  const [urlPartnerFilterId, setUrlPartnerFilterId] = useState<string | null>(null);

  useEffect(() => {
    const partnerIdFromUrl = searchParams.get('assignedPartnerId');
    setUrlPartnerFilterId(partnerIdFromUrl);
  }, [searchParams]);


  const fetchOrders = useCallback(async () => {
    console.log("[OrdersPage Fetch] Starting fetchOrders...");
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders');
      console.log("[OrdersPage Fetch] API response status:", response.status);
      if (!response.ok) {
        let errorMessage = `Failed to fetch orders (status: ${response.status})`;
        try {
          const responseText = await response.text();
          console.error("[OrdersPage Fetch] Raw error response from /api/orders:", responseText);
          if (responseText.startsWith('{') || responseText.startsWith('[')) {
             const errorData = JSON.parse(responseText);
             errorMessage = errorData.error || errorData.message || errorMessage;
          } else if (responseText.toLowerCase().includes("<!doctype html>")) {
            errorMessage = `Failed to fetch orders. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else {
             errorMessage = `Failed to fetch orders. Server returned a non-JSON error response (status: ${response.status}). Check server logs.`;
          }
        } catch (jsonParseError) {
           console.error("[OrdersPage Fetch] Failed to parse JSON error response from /api/orders:", jsonParseError);
           errorMessage = `Failed to fetch orders. Server returned a non-JSON error response that also failed to parse (status: ${response.status}). Check server logs.`;
        }
        throw new Error(errorMessage);
      }
      const data: Order[] = await response.json();
      console.log(`[OrdersPage Fetch] Successfully fetched ${data.length} orders.`);
      setAllOrders(data);
    } catch (error) {
      console.error("[OrdersPage Fetch] Error caught in fetchOrders:", error);
      toast({
        title: "Error Loading Orders",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAllOrders([]); // Ensure orders list is cleared on error
    } finally {
      setIsLoading(false);
      console.log("[OrdersPage Fetch] fetchOrders finished.");
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let tempOrders = allOrders;

    if (urlPartnerFilterId) {
      tempOrders = tempOrders.filter(order => order.assignedPartnerId === urlPartnerFilterId && (order.status === 'assigned' || order.status === 'picked' || order.status === 'delivered' || order.status === 'cancelled'));
       toast({
        title: "Partner Filter Active",
        description: `Showing orders for partner ID: ${urlPartnerFilterId.substring(0,8)}...`,
        variant: "default", 
      });
    }

    if (statusUiFilter && statusUiFilter !== "all") {
      tempOrders = tempOrders.filter(order => order.status === statusUiFilter);
    }

    if (areaUiFilter && areaUiFilter !== "all") {
      tempOrders = tempOrders.filter(order => order.area && areaUiFilter && order.area.toLowerCase().includes(areaUiFilter.toLowerCase()));
    }

    if (dateUiFilter) {
      tempOrders = tempOrders.filter(order =>
        new Date(order.creationDate).toDateString() === dateUiFilter.toDateString()
      );
    }
    setFilteredOrders(tempOrders);
  }, [allOrders, urlPartnerFilterId, statusUiFilter, areaUiFilter, dateUiFilter, toast]);


  const handleFilterChange = (filters: { status?: OrderStatus | "all"; area?: string | "all"; date?: Date }) => {
    if (urlPartnerFilterId) {
        setUrlPartnerFilterId(null); 
        router.replace('/orders', { scroll: false }); 
        toast({
            title: "Partner Filter Cleared",
            description: "UI filters applied, partner-specific view cleared.",
            variant: "default"
        });
    }
    setStatusUiFilter(filters.status || "all");
    setAreaUiFilter(filters.area || "all");
    setDateUiFilter(filters.date);
  };

  const handleClearFilters = () => {
    setStatusUiFilter("all");
    setAreaUiFilter("all");
    setDateUiFilter(undefined);
    if (urlPartnerFilterId) {
      setUrlPartnerFilterId(null);
      router.replace('/orders', { scroll: false }); 
    }
  }

  const handleViewOrder = (orderId: string) => {
    const orderToShow = allOrders.find(order => order.id === orderId);
    if (orderToShow) {
      setSelectedOrderForDetails(orderToShow);
      setIsDetailsDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Could not find order details.", variant: "destructive" });
    }
  };

  const handleAssignOrder = (orderId: string) => {
    router.push(`/assignment?orderId=${orderId}`);
  };

  const handleOrderCreated = () => {
    fetchOrders(); 
    setIsCreateOrderDialogOpen(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, successMessage: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update order status to ${newStatus}`);
      }
      toast({ title: "Order Updated", description: successMessage });
      fetchOrders(); 
    } catch (error) {
      toast({
        title: "Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPickedUp = (orderId: string) => {
    updateOrderStatus(orderId, 'picked', `Order ${orderId.substring(0,8)}... marked as picked up.`);
  };

  const handleMarkAsDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'delivered', `Order ${orderId.substring(0,8)}... marked as delivered.`);
  };

  const handleReportIssue = (orderId: string) => {
    setOrderForReportingIssue(orderId);
    setIsReportIssueDialogOpen(true);
  };

  const handleIssueReported = () => {
    fetchOrders();
    setIsReportIssueDialogOpen(false);
    setOrderForReportingIssue(null);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm(`Are you sure you want to cancel order ${orderId.substring(0,8)}...? This action cannot be undone.`)) {
      updateOrderStatus(orderId, 'cancelled', `Order ${orderId.substring(0,8)}... has been cancelled.`);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        <Dialog open={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Order</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new order.
              </DialogDescription>
            </DialogHeader>
            <OrderCreationForm onOrderCreated={handleOrderCreated} />
          </DialogContent>
        </Dialog>
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
          onMarkAsPickedUp={handleMarkAsPickedUp}
          onMarkAsDelivered={handleMarkAsDelivered}
          onReportIssue={handleReportIssue}
          onCancelOrder={handleCancelOrder}
        />
      )}
      <OrderDetailsDialog
        order={selectedOrderForDetails}
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
      {orderForReportingIssue && (
        <ReportAssignmentIssueDialog
          orderId={orderForReportingIssue}
          isOpen={isReportIssueDialogOpen}
          onOpenChange={setIsReportIssueDialogOpen}
          onIssueReported={handleIssueReported}
        />
      )}
    </div>
  );
}
