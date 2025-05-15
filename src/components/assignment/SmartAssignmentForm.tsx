
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { assignOrder, type AssignOrderInput, type AssignOrderOutput } from "@/ai/flows/smart-order-assignment";
import { AssignmentResultCard } from './AssignmentResultCard';
import type { Order, Partner } from "@/lib/types";
import { useSearchParams, useRouter } from 'next/navigation';

const assignmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  orderLocation: z.string().min(3, "Order location is required"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export function SmartAssignmentForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [assignmentResult, setAssignmentResult] = useState<AssignOrderOutput | null>(null);
  
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      orderId: "",
      orderLocation: "",
    },
  });

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    setPendingOrders([]);
    setAvailablePartners([]);
    try {
      const [ordersResponse, partnersResponse] = await Promise.all([
        fetch('/api/orders?status=pending'), 
        fetch('/api/partners?status=active')
      ]);

      if (!ordersResponse.ok) {
        let errorDetails = `Failed to fetch pending orders (status: ${ordersResponse.status})`;
        try {
          const errorText = await ordersResponse.text();
          console.error("Raw error response from /api/orders?status=pending:", errorText);
          if (errorText.startsWith("<!DOCTYPE html>")) {
            errorDetails = `Failed to fetch pending orders. Server returned an HTML error page (status: ${ordersResponse.status}). Check server logs.`;
          } else {
            const errorData = JSON.parse(errorText);
            if (errorData.error) { 
              errorDetails = `Failed to fetch pending orders: ${errorData.error}`;
            } else if (errorData.message) {
              errorDetails = errorData.message;
            }
          }
        } catch (parseError) {
          console.error("Failed to parse JSON error response from fetching orders. Server might have sent HTML.", parseError);
          errorDetails = `Failed to fetch orders. Server returned a non-JSON response (status: ${ordersResponse.status}). Check server logs.`;
        }
        throw new Error(errorDetails);
      }
      const ordersData: Order[] = await ordersResponse.json();
      setPendingOrders(ordersData);

      if (!partnersResponse.ok) {
        let errorDetails = `Failed to fetch available partners (status: ${partnersResponse.status})`;
        try {
          const errorText = await partnersResponse.text();
          console.error("Raw error response from /api/partners?status=active:", errorText);
           if (errorText.startsWith("<!DOCTYPE html>")) {
            errorDetails = `Failed to fetch available partners. Server returned an HTML error page (status: ${partnersResponse.status}). Check server logs.`;
          } else {
            const errorData = JSON.parse(errorText);
            if (errorData.error) { 
              errorDetails = `Failed to fetch available partners: ${errorData.error}`;
            } else if (errorData.message) {
              errorDetails = errorData.message;
            }
          }
        } catch (parseError) {
          console.error("Failed to parse JSON error response from fetching partners. Server might have sent HTML.", parseError);
          errorDetails = `Failed to fetch partners. Server returned a non-JSON response (status: ${partnersResponse.status}). Check server logs.`;
        }
        throw new Error(errorDetails);
      }
      const partnersData: Partner[] = await partnersResponse.json();
      setAvailablePartners(partnersData);

      const queryOrderId = searchParams.get('orderId');
      if (queryOrderId) {
        const selectedOrder = ordersData.find(o => o.id === queryOrderId);
        if (selectedOrder) {
          form.setValue('orderId', queryOrderId);
          form.setValue('orderLocation', selectedOrder.area);
        }
      }

    } catch (error) {
      console.error("Failed to fetch data for assignment:", error);
      toast({
        title: "Data Loading Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [toast, searchParams, form]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const onSubmit = async (data: AssignmentFormData) => {
    setIsLoading(true);
    setAssignmentResult(null);

    const selectedOrder = pendingOrders.find(o => o.id === data.orderId); 
    if (!selectedOrder) {
        toast({ title: "Error", description: "Selected order not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    if (availablePartners.length === 0) {
        toast({ title: "Error", description: "No available partners to assign the order to.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    
    const input: AssignOrderInput = {
      orderId: data.orderId,
      orderLocation: data.orderLocation || selectedOrder.area,
      partnerList: availablePartners.map(p => ({
        partnerId: p.id,
        location: p.assignedAreas[0] || 'Unknown', 
        currentLoad: p.currentLoad,
        assignedAreas: p.assignedAreas,
        isAvailable: p.status === 'active',
      })),
    };

    try {
      const result = await assignOrder(input);
      setAssignmentResult(result);
      
      const updateResponse = await fetch(`/api/orders/${data.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'assigned', 
          assignedPartnerId: result.assignedPartnerId 
        }),
      });

      if (!updateResponse.ok) {
        let errorDetails = `Failed to update order ${data.orderId} status (status: ${updateResponse.status})`;
        try {
            const errorData = await updateResponse.json();
            errorDetails = errorData.message || errorDetails;
        } catch (e) {
            //  Failed to parse JSON, use the generic message
        }
        throw new Error(errorDetails);
      }
      
      toast({
        title: "Assignment Successful",
        description: `Order ${data.orderId} assigned to partner ${result.assignedPartnerId} and status updated.`,
      });
      
      fetchData(); // Refetch data to update lists (e.g., pending orders)

    } catch (error) {
      console.error("Smart assignment or order update failed:", error);
      toast({
        title: "Assignment Process Failed",
        description: (error as Error).message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Smart Order Assignment</CardTitle>
          <CardDescription>Use AI to find the best partner for an order.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const currentSelectedOrder = pendingOrders.find(o => o.id === value);
                        if (currentSelectedOrder) {
                          form.setValue("orderLocation", currentSelectedOrder.area); 
                        }
                      }} 
                      value={field.value}
                      disabled={isDataLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pending order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pendingOrders.length > 0 ? (
                          pendingOrders.map(order => (
                            <SelectItem key={order.id} value={order.id}>
                              {order.id} ({order.customerName} - {order.area})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-orders" disabled>No pending orders available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown" {...field} disabled={isDataLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isDataLoading || pendingOrders.length === 0 || availablePartners.length === 0}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Assigning..." : "Assign Order with AI"}
              </Button>
              {pendingOrders.length === 0 && !isDataLoading && (
                 <p className="text-sm text-center text-muted-foreground">No pending orders available for assignment.</p>
              )}
               {availablePartners.length === 0 && !isDataLoading && (
                 <p className="text-sm text-center text-muted-foreground">No active partners available for assignment.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {assignmentResult && (
        <div className="flex justify-center mt-8">
           <AssignmentResultCard result={assignmentResult} />
        </div>
      )}
    </div>
  );
}
