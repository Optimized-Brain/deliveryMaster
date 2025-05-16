
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Wand2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Order, Partner, OrderStatus } from "@/lib/types";
import { useSearchParams } from 'next/navigation';
import { AssignmentResultCard } from './AssignmentResultCard'; // Re-add this

const assignmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  orderLocation: z.string().min(3, "Order location is required"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AISuggestion {
  suggestedPartnerName?: string;
  reason?: string;
  suggestionMade: boolean;
}

export function SmartAssignmentForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
  const [isConfirmingAssignment, setIsConfirmingAssignment] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [selectedPartnerForAssignment, setSelectedPartnerForAssignment] = useState<string>(''); // Stores Partner ID

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

      let errorDetails;
      if (!ordersResponse.ok) {
        errorDetails = `Failed to fetch pending orders (status: ${ordersResponse.status})`;
        try {
          const errorText = await ordersResponse.text();
          if (errorText.toLowerCase().includes("<!doctype html>")) {
            errorDetails = `Failed to fetch pending orders. Server returned an HTML error page (status: ${ordersResponse.status}). Check server logs.`;
          } else {
            const errorData = JSON.parse(errorText);
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
          const errorText = await ordersResponse.text().catch(() => "Could not retrieve error text.");
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch pending orders. Server returned an HTML error page (status: ${ordersResponse.status}). Check server logs.`;
          } else if ((parseError as Error).message.includes("JSON.parse")) {
             errorDetails = `Failed to fetch pending orders. Server returned a non-JSON response (status: ${ordersResponse.status}). Check server logs.`;
          } else {
             errorDetails = `Failed to fetch pending orders (status: ${ordersResponse.status}). Error during error processing: ${(parseError as Error).message}. Raw response: ${errorText.substring(0,100)}... Check server logs.`;
          }
        }
        throw new Error(errorDetails);
      }
      const ordersData: Order[] = await ordersResponse.json();
      setPendingOrders(ordersData);

      if (!partnersResponse.ok) {
        errorDetails = `Failed to fetch available partners (status: ${partnersResponse.status})`;
        try {
          const errorText = await partnersResponse.text();
           if (errorText.toLowerCase().includes("<!doctype html>")) {
            errorDetails = `Failed to fetch available partners. Server returned an HTML error page (status: ${partnersResponse.status}). Check server logs.`;
          } else {
            const errorData = JSON.parse(errorText);
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
          const errorText = await partnersResponse.text().catch(() => "Could not retrieve error text.");
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch available partners. Server returned an HTML error page (status: ${partnersResponse.status}). Check server logs.`;
          } else if ((parseError as Error).message.includes("JSON.parse")) {
             errorDetails = `Failed to fetch available partners. Server returned a non-JSON response (status: ${partnersResponse.status}). Check server logs.`;
          } else {
             errorDetails = `Failed to fetch available partners (status: ${partnersResponse.status}). Error during error processing: ${(parseError as Error).message}. Raw response: ${errorText.substring(0,100)}... Check server logs.`;
          }
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
          if (queryOrderId) {
            toast({
              title: "Order Not Assignable",
              description: `Order ${queryOrderId.substring(0,8)}... is not pending or not found. Please select another.`,
              variant: "default"
            });
          }
        }
      }

    } catch (error) {
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

  const handleGetAISuggestion = async (formData: AssignmentFormData) => {
    const selectedOrder = pendingOrders.find(o => o.id === formData.orderId);
    if (!selectedOrder) {
      toast({ title: "Error", description: "Selected order not found.", variant: "destructive" });
      return;
    }
    if (availablePartners.length === 0) {
      toast({ title: "No Partners", description: "No active partners available to suggest from.", variant: "default" });
      setAiSuggestion({ suggestionMade: false, reason: "No active partners were available in the system." });
      return;
    }

    setIsGettingSuggestion(true);
    setAiSuggestion(null);
    setSelectedPartnerForAssignment('');

    try {
      const response = await fetch('/api/ai/suggest-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: selectedOrder, partners: availablePartners }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `AI Suggestion API request failed with status ${response.status}` }));
        throw new Error(errorData.message || `AI Suggestion failed: ${response.statusText}`);
      }
      const suggestionResult: AISuggestion = await response.json();
      setAiSuggestion(suggestionResult);

      if (suggestionResult.suggestionMade && suggestionResult.suggestedPartnerName) {
        const suggestedPartner = availablePartners.find(p => p.name === suggestionResult.suggestedPartnerName);
        if (suggestedPartner) {
          setSelectedPartnerForAssignment(suggestedPartner.id);
          toast({ title: "AI Suggestion Received", description: `AI suggests assigning to ${suggestedPartner.name}. You can confirm or change below.`, variant: "default" });
        } else {
          toast({ title: "AI Suggestion Note", description: `AI suggested ${suggestionResult.suggestedPartnerName}, but this partner was not found in the current list. Please select manually.`, variant: "default" });
        }
      } else {
         toast({ title: "AI Suggestion Result", description: suggestionResult.reason || "AI could not provide a specific partner suggestion.", variant: "default" });
      }
    } catch (error) {
      toast({
        title: "AI Suggestion Error",
        description: (error as Error).message,
        variant: "destructive",
      });
      setAiSuggestion({ suggestionMade: false, reason: `An error occurred: ${(error as Error).message}` });
    } finally {
      setIsGettingSuggestion(false);
    }
  };

  const handleConfirmAssignment = async () => {
    const orderId = form.getValues('orderId');
    if (!orderId || !selectedPartnerForAssignment) {
      toast({
        title: "Missing Information",
        description: "Please ensure an order and a partner are selected.",
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

      let errorDetails;
      if (!updateResponse.ok) {
        errorDetails = `Failed to update order ${orderId.substring(0,8)}... status (API status: ${updateResponse.status}).`;
         try {
            const errorText = await updateResponse.text();
            if (errorText.toLowerCase().includes("<!doctype html>")) {
                errorDetails = `Failed to update order status. Server returned an HTML error page (status: ${updateResponse.status}). Check server logs.`;
            } else {
                 const errorData = JSON.parse(errorText);
                 errorDetails = errorData.message || errorData.error || `Failed to update order status. API responded with status ${updateResponse.status}.`;
            }
        } catch (e) {
             const errorText = await updateResponse.text().catch(() => "Could not retrieve error text.");
             if (errorText.toLowerCase().includes("<!doctype html>")) {
                errorDetails = `Failed to update order status. Server returned an HTML error page (status: ${updateResponse.status}). Check server logs.`;
             } else if ((e as Error).message.includes("JSON.parse")) {
                errorDetails = `Failed to update order status. Server returned a non-JSON response (status: ${updateResponse.status}). Check server logs.`;
             } else {
                errorDetails = `Failed to update order status and parse error response (API status: ${updateResponse.status}). Raw response: ${errorText.substring(0,100)}... Check server logs.`;
             }
        }
        throw new Error(errorDetails);
      }
      
      const updateResult = await updateResponse.json();
      toast({
        title: "Order Assigned!",
        description: updateResult.message || `Order ${orderId.substring(0,8)}... successfully assigned to partner ${availablePartners.find(p => p.id === selectedPartnerForAssignment)?.name || selectedPartnerForAssignment.substring(0,8) + '...'}.`,
        variant: "default"
      });

      form.reset({ orderId: "", orderLocation: "" });
      setAiSuggestion(null);
      setSelectedPartnerForAssignment('');
      await fetchData(); // Re-fetch orders and partners

    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: (error as Error).message,
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
          <CardDescription>Select an order to get an AI partner suggestion or assign manually.</CardDescription>
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
                           form.setValue("orderLocation", "");
                        }
                        setAiSuggestion(null); // Clear previous suggestion
                        setSelectedPartnerForAssignment(''); // Clear previous manual selection
                      }}
                      value={field.value}
                      disabled={isDataLoading || isGettingSuggestion || isConfirmingAssignment}
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
                    <RHFormLabel>Order Location (auto-filled)</RHFormLabel>
                    <FormControl>
                      <Input placeholder="Order location" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={isGettingSuggestion || !form.getValues('orderId') || pendingOrders.length === 0 || availablePartners.length === 0}
              >
                {isGettingSuggestion ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {isGettingSuggestion ? "Getting Suggestion..." : "Get AI Suggestion"}
              </Button>
              {pendingOrders.length === 0 && !isDataLoading && (
                 <p className="text-sm text-center text-muted-foreground">No pending orders available for assignment.</p>
              )}
               {availablePartners.length === 0 && !isDataLoading && (
                 <p className="text-sm text-center text-muted-foreground">No active partners available for assignment suggestions.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {aiSuggestion && <AssignmentResultCard suggestion={aiSuggestion} />}

      {(form.getValues('orderId') && (aiSuggestion || availablePartners.length > 0)) && ( // Show confirmation if order selected and (AI made suggestion OR partners exist for manual)
        <div className="mt-8 space-y-6">
          <Card className="w-full max-w-xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle>Confirm Assignment</CardTitle>
              <CardDescription>
                {aiSuggestion?.suggestionMade && aiSuggestion?.suggestedPartnerName 
                  ? `AI suggested ${aiSuggestion.suggestedPartnerName}. Confirm or select a different partner.`
                  : "Please select a partner to assign the selected order to."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <Label htmlFor="partner-select">Assign to Partner</Label>
                <Select
                  value={selectedPartnerForAssignment}
                  onValueChange={setSelectedPartnerForAssignment}
                  disabled={isConfirmingAssignment || availablePartners.length === 0}
                >
                  <SelectTrigger id="partner-select">
                    <SelectValue placeholder="Select a partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePartners.length > 0 ? (
                        availablePartners.map(partner => (
                        <SelectItem key={partner.id} value={partner.id}>
                            {partner.name} (Load: {partner.currentLoad})
                        </SelectItem>
                        ))
                    ) : (
                         <SelectItem value="no-partners-selectable" disabled>No active partners available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                 {availablePartners.length === 0 && (
                    <p className="text-sm text-muted-foreground pt-1">No active partners available to select.</p>
                )}
              </FormItem>
              <Button
                onClick={handleConfirmAssignment}
                className="w-full"
                disabled={isConfirmingAssignment || !selectedPartnerForAssignment || !form.getValues('orderId')}
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
