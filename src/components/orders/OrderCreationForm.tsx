
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { AVAILABLE_AREAS } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

const orderCreationSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  itemName: z.string().min(1, "Item name is required"),
  itemQuantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  area: z.string().min(1, "Area is required"),
  deliveryAddress: z.string().min(5, "Delivery address must be at least 5 characters"),
  orderValue: z.coerce.number().positive("Order value must be a positive number"),
});

type OrderCreationFormData = z.infer<typeof orderCreationSchema>;

interface OrderCreationFormProps {
  onOrderCreated?: () => void;
}

export function OrderCreationForm({ onOrderCreated }: OrderCreationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<OrderCreationFormData>({
    resolver: zodResolver(orderCreationSchema),
    defaultValues: {
      customerName: "",
      itemName: "",
      itemQuantity: 1,
      area: "",
      deliveryAddress: "",
      orderValue: 0,
    },
  });

  const onSubmit = async (data: OrderCreationFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Prioritize the 'error' field (specific Supabase error), then 'message', then a fallback.
        const detailedErrorMessage = errorData.error || errorData.message || 'Failed to create order';
        throw new Error(detailedErrorMessage);
      }

      const result = await response.json();
      toast({
        title: "Order Created",
        description: `Order for ${result.order.customerName} has been successfully created.`,
        variant: "default",
      });
      form.reset();
      onOrderCreated?.();
    } catch (error) {
      console.error("Order creation failed:", error);
      toast({
        title: "Order Creation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Pizza" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="itemQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery area" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AVAILABLE_AREAS.map(area => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., 123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="orderValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Value ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 25.99" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </form>
    </Form>
  );
}
