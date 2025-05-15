
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Removed Textarea import as it's no longer used for shift schedule
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PARTNER_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PartnerStatus } from '@/lib/types';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const partnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  status: z.enum(PARTNER_STATUSES as [PartnerStatus, ...PartnerStatus[]]),
  assignedAreas: z.string().min(1, "At least one area is required (comma-separated)"),
  shiftStart: z.string().regex(timeRegex, "Invalid start time format (HH:MM)"),
  shiftEnd: z.string().regex(timeRegex, "Invalid end time format (HH:MM)"),
  // avatarUrl could be added here if desired
}).refine(data => {
  // Optional: Add validation that shiftEnd is after shiftStart
  if (data.shiftStart && data.shiftEnd) {
    return data.shiftEnd > data.shiftStart;
  }
  return true;
}, {
  message: "Shift end time must be after shift start time",
  path: ["shiftEnd"], // Attach error to shiftEnd field
});

type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnerRegistrationFormProps {
  onPartnerRegistered?: () => void;
}

export function PartnerRegistrationForm({ onPartnerRegistered }: PartnerRegistrationFormProps) {
  const { toast } = useToast();
  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      assignedAreas: "",
      shiftStart: "09:00",
      shiftEnd: "17:00",
    },
  });

  const onSubmit = async (data: PartnerFormData) => {
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to register partner');
      }

      const result = await response.json();
      toast({
        title: "Partner Registered",
        description: `${result.partner.name} has been successfully registered.`,
        variant: "default",
      });
      form.reset();
      onPartnerRegistered?.();
    } catch (error) {
      console.error("Partner registration failed:", error);
      toast({
        title: "Registration Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Register New Partner</CardTitle>
        <CardDescription>Fill in the details to add a new delivery partner.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select partner status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PARTNER_STATUSES.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
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
              name="assignedAreas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Areas (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Downtown, North End" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="shiftStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shiftEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registering..." : "Register Partner"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
