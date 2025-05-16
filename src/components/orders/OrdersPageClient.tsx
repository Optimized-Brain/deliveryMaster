
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

export default function OrdersPageClientContent() {
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
    setIsLoading(true);
    console.log("[OrdersPage Fetch] fetchOrders initiated. Partner filter ID:", urlPartnerFilterId);
    try {
      const apiUrl = urlPartnerFilterId ? `/api/orders?assignedPartnerId=${urlPartnerFilterId}` : '/api/orders';
      console.log("[OrdersPage Fetch] Fetching from API URL:", apiUrl);
      const response = await fetch(apiUrl);
      console.log("[OrdersPage Fetch] API response status:", response.status);

      if (!response.ok) {
        let errorDetails = `Failed to fetch orders (status: ${response.status})`;
        try {
          const errorText = await response.text();
          console.error("[OrdersPage Fetch] Raw error response from API:", errorText.substring(0, 500)); // Log raw text
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch orders. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else {
            const errorData = JSON.parse(errorText); // Attempt to parse as JSON
            if (errorData.error) { // Prioritize specific error from API
              errorDetails = `Failed to fetch orders: ${errorData.error}`;
              if(errorData.details) errorDetails += ` (Details: ${errorData.details})`;
            } else if (errorData.message) {
              errorDetails = errorData.message;
            }
          }
        } catch (e) {
          console.error("[OrdersPage Fetch] Failed to parse error response as JSON or other error during error handling:", e);
           // Fallback if JSON parsing fails, errorDetails remains the generic one
        }
        throw new Error(errorDetails);
      }
      const data: Order[] = await response.json();
      console.log(`[OrdersPage Fetch] Successfully fetched ${data.length} orders.`);
      setAllOrders(data);
    } catch (error) {
      console.error("[OrdersPage Fetch] Error in fetchOrders catch block:", error);
      toast({
        title: "Error Loading Orders",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAllOrders([]); // Ensure allOrders is empty on error
    } finally {
      setIsLoading(false);
      console.log("[OrdersPage Fetch] fetchOrders finished, isLoading set to false.");
    }
  }, [toast, urlPartnerFilterId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let tempOrders = allOrders;
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
    console.log(`[OrdersPage Effect] Filters applied. Displaying ${tempOrders.length} orders.`);
  }, [allOrders, statusUiFilter, areaUiFilter, dateUiFilter]);


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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, successMessageBase: string) => {
    console.log(`[OrdersPage] updateOrderStatus called for order ${orderId} to status ${newStatus}`);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message || responseBody.error || `Failed to update order status to ${newStatus}`);
      }
      toast({ title: "Order Updated", description: responseBody.message || `${successMessageBase}` });
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error(`[OrdersPage] Error updating order ${orderId} to ${newStatus}:`, error);
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
    fetchOrders(); // Refresh orders list
    setIsReportIssueDialogOpen(false);
    setOrderForReportingIssue(null);
  };

  const handleCancelOrder = async (orderId: string) => {
    console.log(`[OrdersPage] handleCancelOrder called for ID: ${orderId}`);
    const orderToCancel = allOrders.find(o => o.id === orderId);
    if (!orderToCancel) {
        toast({ title: "Error", description: "Order not found.", variant: "destructive" });
        console.error(`[OrdersPage] Order to cancel with ID ${orderId} not found in local state.`);
        return;
    }
    if (window.confirm(`Are you sure you want to cancel order ${orderId.substring(0,8)}... for ${orderToCancel.customerName}? This action cannot be undone.`)) {
      console.log(`[OrdersPage] User confirmed cancellation for order ${orderId}.`);
      updateOrderStatus(orderId, 'cancelled', `Order ${orderId.substring(0,8)}... has been cancelled.`);
    } else {
      toast({ title: "Action Cancelled", description: "Order cancellation was cancelled.", variant: "default"});
      console.log(`[OrdersPage] User cancelled order cancellation for order ${orderId}.`);
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
