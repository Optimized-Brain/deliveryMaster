"use client";

import React, { useState } from 'react';
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
import { SAMPLE_ORDERS, SAMPLE_PARTNERS } from "@/lib/constants"; // For populating dropdowns
import { AssignmentResultCard } from './AssignmentResultCard';

const assignmentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  orderLocation: z.string().min(3, "Order location is required"),
  // partnerList is not part of the form, it will be fetched/provided
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export function SmartAssignmentForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<AssignOrderOutput | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      orderId: "",
      orderLocation: "",
    },
  });

  const pendingOrders = SAMPLE_ORDERS.filter(order => order.status === 'pending');
  const availablePartners = SAMPLE_PARTNERS.filter(partner => partner.status === 'active');


  const onSubmit = async (data: AssignmentFormData) => {
    setIsLoading(true);
    setAssignmentResult(null);

    const selectedOrder = SAMPLE_ORDERS.find(o => o.id === data.orderId);
    if (!selectedOrder) {
        toast({ title: "Error", description: "Selected order not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    const input: AssignOrderInput = {
      orderId: data.orderId,
      orderLocation: data.orderLocation || selectedOrder.area, // Use form input or order area
      partnerList: availablePartners.map(p => ({
        partnerId: p.id,
        location: p.assignedAreas[0] || 'Unknown', // Simplified: use first assigned area as location
        currentLoad: p.currentLoad,
        assignedAreas: p.assignedAreas,
        isAvailable: p.status === 'active',
      })),
    };

    try {
      const result = await assignOrder(input);
      setAssignmentResult(result);
      toast({
        title: "Assignment Successful",
        description: `Order ${data.orderId} assigned to partner ${result.assignedPartnerId}.`,
      });
      // TODO: Update order status in your data store
    } catch (error) {
      console.error("Smart assignment failed:", error);
      toast({
        title: "Assignment Failed",
        description: (error as Error).message || "An unknown error occurred during assignment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                        const selectedOrder = SAMPLE_ORDERS.find(o => o.id === value);
                        if (selectedOrder) {
                          form.setValue("orderLocation", selectedOrder.area); // Auto-fill location
                        }
                      }} 
                      defaultValue={field.value}
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
                          <SelectItem value="no-orders" disabled>No pending orders</SelectItem>
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
                      <Input placeholder="e.g., Downtown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || pendingOrders.length === 0}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Assigning..." : "Assign Order with AI"}
              </Button>
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
