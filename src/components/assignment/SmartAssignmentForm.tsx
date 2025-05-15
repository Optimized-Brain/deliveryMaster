
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFormLabel, FormMessage } from "@/components/ui/form"; // Renamed FormLabel
import { Label } from "@/components/ui/label"; // Standard Label for non-hook-form part
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { assignOrder, type AssignOrderInput, type AssignOrderOutput } from "@/ai/flows/smart-order-assignment";
import { AssignmentResultCard } from './AssignmentResultCard';
import type { Order, Partner, OrderStatus } from "@/lib/types";
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

  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [isConfirmingAssignment, setIsConfirmingAssignment] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [aiSuggestion, setAiSuggestion] = useState<AssignOrderOutput | null>(null);
  const [selectedPartnerForAssignment, setSelectedPartnerForAssignment] = useState<string>('');

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
            errorDetails = `Failed to fetch pending orders. Server returned an HTML error page (status: ${ordersResponse.status}). Check server logs for the underlying error (e.g., environment variables).`;
          } else {
            const errorData = JSON.parse(errorText); // Attempt to parse as JSON
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
          console.error("Failed to parse JSON error response from fetching orders. Server might have sent HTML.", parseError);
          //  Keep the original errorDetails if parsing fails
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
            errorDetails = `Failed to fetch available partners. Server returned an HTML error page (status: ${partnersResponse.status}). Check server logs for the underlying error (e.g., environment variables).`;
          } else {
            const errorData = JSON.parse(errorText); // Attempt to parse as JSON
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
            console.error("Failed to parse JSON error response from fetching partners. Server might have sent HTML.", parseError);
             // Keep the original errorDetails if parsing fails
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
        } else {
            form.resetField('orderId');
            form.resetField('orderLocation');
            if (queryOrderId) { // Only toast if a specific invalid orderId was in query
                toast({
                    title: "Order Not Assignable",
                    description: `Order ${queryOrderId} is not pending or not found. Please select another.`,
                    variant: "default" // Changed from "warning" as it's not a standard variant
                });
            }
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

  const handleGetAISuggestion = async (data: AssignmentFormData) => {
    setIsFetchingSuggestion(true);
    setAiSuggestion(null);
    setSelectedPartnerForAssignment(''); // Clear previous manual selection

    const selectedOrder = pendingOrders.find(o => o.id === data.orderId);
    if (!selectedOrder) {
        toast({ title: "Error", description: "Selected order not found in pending orders list.", variant: "destructive"});
        setIsFetchingSuggestion(false);
        return;
    }

    if (availablePartners.length === 0) {
        toast({ title: "Error", description: "No available partners to suggest from.", variant: "destructive"});
        setIsFetchingSuggestion(false);
        return;
    }

    const input: AssignOrderInput = {
      orderId: data.orderId,
      orderLocation: data.orderLocation || selectedOrder.area, // Ensure orderLocation is used
      partnerList: availablePartners.map(p => ({
        partnerId: p.id,
        // Use a sensible default if assignedAreas is empty, or ensure it always has at least one element
        location: p.assignedAreas[0] || 'Unknown', 
        currentLoad: p.currentLoad,
        assignedAreas: p.assignedAreas,
        isAvailable: p.status === 'active', // Assuming 'active' means available
      })),
    };

    try {
      const result = await assignOrder(input);
      setAiSuggestion(result);
      if (result.suggestionMade && result.suggestedPartnerId) {
        setSelectedPartnerForAssignment(result.suggestedPartnerId);
        toast({
          title: "AI Suggestion Ready",
          description: `AI suggests partner ${result.suggestedPartnerId}. Review and confirm.`,
        });
      } else {
         toast({
          title: "AI Analysis Complete",
          description: result.reason || "AI could not suggest a specific partner.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("AI suggestion failed:", error);
      toast({
        title: "AI Suggestion Failed",
        description: (error as Error).message || "An unknown error occurred while getting AI suggestion.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingSuggestion(false);
    }
  };

  const handleConfirmAssignment = async () => {
    const orderId = form.getValues('orderId');
    if (!orderId || !selectedPartnerForAssignment) {
      toast({
        title: "Missing Information",
        description: "Please select an order and a partner to assign.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirmingAssignment(true);
    try {
      const updateResponse = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned' as OrderStatus,
          assignedPartnerId: selectedPartnerForAssignment
        }),
      });

      if (!updateResponse.ok) {
        let errorDetails = `Failed to update order ${orderId} status (API status: ${updateResponse.status}).`;
        try {
            const errorData = await updateResponse.json();
            if (errorData && errorData.message) {
                errorDetails = errorData.message; // Use the message from the API response
            } else {
                 // Attempt to get raw text if JSON parsing or message field fails
                 const errorText = await updateResponse.text();
                 console.error("Raw error text from PUT /api/orders/[id]/status:", errorText);
                 errorDetails = `Failed to update order status (API status: ${updateResponse.status}). ${errorText.substring(0,100)}`;
            }
        } catch (e) {
             console.error(`Could not parse JSON response from PUT /api/orders/${orderId}/status:`, e);
             errorDetails = `Failed to update order status and parse error response (API status: ${updateResponse.status}). Check server logs.`;
        }
        throw new Error(errorDetails);
      }

      toast({
        title: "Order Assigned!",
        description: `Order ${orderId} successfully assigned to partner ${selectedPartnerForAssignment}.`,
        variant: "default" // Changed from success
      });

      // Reset form and state
      form.reset({ orderId: "", orderLocation: "" }); // Reset react-hook-form fields
      setAiSuggestion(null);
      setSelectedPartnerForAssignment('');
      fetchData(); // Refresh pending orders and available partners
      // router.push('/orders'); // Optional: redirect after assignment

    } catch (error) {
      console.error("Order assignment confirmation failed:", error);
      toast({
        title: "Assignment Failed",
        description: (error as Error).message || "An unknown error occurred during assignment.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmingAssignment(false);
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
          <CardDescription>Get an AI suggestion or manually assign an order to a partner.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGetAISuggestion)} className="space-y-6">
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <RHFormLabel>Order ID</RHFormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const currentSelectedOrder = pendingOrders.find(o => o.id === value);
                        if (currentSelectedOrder) {
                          form.setValue("orderLocation", currentSelectedOrder.area);
                        } else {
                           form.setValue("orderLocation", ""); // Clear if order not found (e.g. list changed)
                        }
                        setAiSuggestion(null); // Clear previous AI suggestion
                        setSelectedPartnerForAssignment(''); // Clear manual partner selection
                      }}
                      value={field.value}
                      disabled={isDataLoading || isFetchingSuggestion || isConfirmingAssignment}
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
                              {order.id.substring(0,8)}... ({order.customerName} - {order.area})
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
                    <RHFormLabel>Order Location (auto-filled from order)</RHFormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isFetchingSuggestion || isDataLoading || pendingOrders.length === 0 || availablePartners.length === 0 || isConfirmingAssignment || !form.getValues('orderId')}
              >
                {isFetchingSuggestion ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {isFetchingSuggestion ? "Getting Suggestion..." : "Get AI Suggestion"}
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

      {aiSuggestion && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-center">
           <AssignmentResultCard suggestion={aiSuggestion} />
          </div>

          <Card className="w-full max-w-xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle>Confirm Assignment</CardTitle>
              <CardDescription>
                {aiSuggestion.suggestionMade && aiSuggestion.suggestedPartnerId 
                  ? "Confirm the AI's suggestion or choose a different partner." 
                  : "No AI suggestion provided. Please select a partner manually."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem> {/* Use FormItem for layout consistency, not for RHF context here */}
                <Label htmlFor="partner-select">Assign to Partner</Label> {/* Standard Label */}
                <Select
                  value={selectedPartnerForAssignment}
                  onValueChange={setSelectedPartnerForAssignment}
                  disabled={isConfirmingAssignment || availablePartners.length === 0}
                >
                  {/* No FormControl needed here as this Select is not part of react-hook-form instance */}
                  <SelectTrigger id="partner-select">
                    <SelectValue placeholder="Select a partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePartners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} (ID: {partner.id.substring(0,8)}...) - Load: {partner.currentLoad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              <Button
                onClick={handleConfirmAssignment}
                className="w-full"
                disabled={isConfirmingAssignment || !selectedPartnerForAssignment || availablePartners.length === 0}
              >
                {isConfirmingAssignment ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isConfirmingAssignment ? "Assigning..." : "Confirm & Assign Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

