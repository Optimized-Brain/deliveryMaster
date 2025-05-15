
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
    setIsLoading(true);
    try {
      // Construct the API URL based on whether a partner ID filter is active from the URL
      const apiUrl = urlPartnerFilterId ? `/api/orders?assignedPartnerId=${urlPartnerFilterId}` : '/api/orders';
      const response = await fetch(apiUrl);

      if (!response.ok) {
        let errorMessage = `Failed to fetch orders (status: ${response.status})`;
        try {
          const errorText = await response.text();
          if (errorText.toLowerCase().includes("<!doctype html>")) {
            errorMessage = `Failed to fetch orders. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else if (errorText.startsWith('{') || errorText.startsWith('[')) {
             const errorData = JSON.parse(errorText);
             errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
             errorMessage = `Failed to fetch orders. Server returned a non-JSON error response (status: ${response.status}). Check server logs.`;
          }
        } catch (jsonParseError) {
           errorMessage = `Failed to fetch orders. Server returned a non-JSON error response that also failed to parse (status: ${response.status}). Check server logs.`;
        }
        throw new Error(errorMessage);
      }
      const data: Order[] = await response.json();
      setAllOrders(data);
    } catch (error) {
      toast({
        title: "Error Loading Orders",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, urlPartnerFilterId]); // Add urlPartnerFilterId to dependencies

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]); // fetchOrders will re-run if urlPartnerFilterId changes

  useEffect(() => {
    let tempOrders = allOrders;

    // No need to filter by urlPartnerFilterId here again, as fetchOrders now handles it.
    // If urlPartnerFilterId was applied, allOrders will already be filtered.

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
  }, [allOrders, statusUiFilter, areaUiFilter, dateUiFilter]);


  const handleFilterChange = (filters: { status?: OrderStatus | "all"; area?: string | "all"; date?: Date }) => {
    // If user applies UI filters, we clear any URL-based partner filter
    if (urlPartnerFilterId) {
        setUrlPartnerFilterId(null); // This will trigger a re-fetch by fetchOrders
        router.replace('/orders', { scroll: false }); // Clean URL
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
      setUrlPartnerFilterId(null); // Triggers re-fetch for all orders
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
    const orderToCancel = allOrders.find(o => o.id === orderId);
    if (!orderToCancel) {
        toast({ title: "Error", description: "Order not found.", variant: "destructive" });
        return;
    }
    if (window.confirm(`Are you sure you want to cancel order ${orderId.substring(0,8)}... for ${orderToCancel.customerName}? This action cannot be undone.`)) {
      updateOrderStatus(orderId, 'cancelled', `Order ${orderId.substring(0,8)}... has been cancelled.`);
    } else {
      toast({ title: "Action Cancelled", description: "Order cancellation was cancelled.", variant: "default"});
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
