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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AVAILABLE_AREAS, PARTNER_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PartnerStatus } from '@/lib/types';

const partnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  status: z.enum(PARTNER_STATUSES as [PartnerStatus, ...PartnerStatus[]]), // Ensure Zod enum gets a non-empty array type
  assignedAreas: z.string().min(1, "At least one area is required (comma-separated)"),
  shiftSchedule: z.string().min(5, "Shift schedule is required"),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

export function PartnerRegistrationForm() {
  const { toast } = useToast();
  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      assignedAreas: "",
      shiftSchedule: "",
    },
  });

  const onSubmit = (data: PartnerFormData) => {
    console.log("New partner data:", data);
    // Here you would typically send the data to your backend
    toast({
      title: "Partner Registered",
      description: `${data.name} has been successfully registered.`,
      variant: "default", // Use 'default' which uses primary color for positive feedback
    });
    form.reset(); // Reset form after submission
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
                  <FormLabel>Assigned Areas</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Downtown, North End (comma-separated)" {...field} />
                  </FormControl>
                  <FormMessage />
                  {/* TODO: Could be enhanced with a multi-select from AVAILABLE_AREAS */}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shiftSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Schedule</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Registering..." : "Register Partner"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
