
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PARTNER_STATUSES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { Partner, PartnerStatus } from '@/lib/types';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const partnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits (e.g., +91 XXXXX XXXXX)"),
  status: z.enum(PARTNER_STATUSES as [PartnerStatus, ...PartnerStatus[]]),
  assignedAreas: z.string().min(1, "At least one area is required (comma-separated)"),
  shiftStart: z.string().regex(timeRegex, "Invalid start time format (HH:MM)"),
  shiftEnd: z.string().regex(timeRegex, "Invalid end time format (HH:MM)"),
  currentLoad: z.coerce.number().min(0, "Load cannot be negative").optional(),
  rating: z.coerce.number().min(0, "Rating cannot be negative").max(5, "Rating cannot exceed 5").optional(),
}).refine(data => {
  if (data.shiftStart && data.shiftEnd) {
    return data.shiftEnd > data.shiftStart;
  }
  return true;
}, {
  message: "Shift end time must be after shift start time",
  path: ["shiftEnd"],
});

type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnerRegistrationFormProps {
  partnerToEdit?: Partner | null;
  onPartnerRegistered?: () => void;
  onPartnerUpdated?: () => void;
}

export function PartnerRegistrationForm({ partnerToEdit, onPartnerRegistered, onPartnerUpdated }: PartnerRegistrationFormProps) {
  const { toast } = useToast();
  const isEditMode = !!partnerToEdit;

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
      currentLoad: 0,
      rating: 0,
    },
  });

  useEffect(() => {
    if (isEditMode && partnerToEdit) {
      form.reset({
        name: partnerToEdit.name,
        email: partnerToEdit.email,
        phone: partnerToEdit.phone,
        status: partnerToEdit.status,
        assignedAreas: partnerToEdit.assignedAreas.join(', '),
        shiftStart: partnerToEdit.shiftStart,
        shiftEnd: partnerToEdit.shiftEnd,
        currentLoad: partnerToEdit.currentLoad,
        rating: partnerToEdit.rating,
      });
    } else {
      form.reset({ 
        name: "",
        email: "",
        phone: "",
        status: "active",
        assignedAreas: "",
        shiftStart: "09:00",
        shiftEnd: "17:00",
        currentLoad: 0,
        rating: 0,
      });
    }
  }, [isEditMode, partnerToEdit, form]);

  const onSubmit = async (data: PartnerFormData) => {
    try {
      const url = isEditMode ? `/api/partners/${partnerToEdit!.id}` : '/api/partners';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'register'} partner`);
      }

      const result = await response.json();
      toast({
        title: `Partner ${isEditMode ? 'Updated' : 'Registered'}`,
        description: `${result.partner.name} has been successfully ${isEditMode ? 'updated' : 'registered'}.`,
        variant: "default",
      });
      form.reset(); 
      if (isEditMode) {
        onPartnerUpdated?.();
      } else {
        onPartnerRegistered?.();
      }
    } catch (error) {
      console.error(`Partner ${isEditMode ? 'update' : 'registration'} failed:`, error);
      toast({
        title: `${isEditMode ? 'Update' : 'Registration'} Failed`,
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Partner Details' : 'Register New Partner'}</CardTitle>
        <CardDescription>
          {isEditMode ? 'Update the details of the existing partner.' : 'Fill in the details to add a new delivery partner.'}
        </CardDescription>
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
                    <Input placeholder="e.g., Rajesh Kumar" {...field} />
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
                      <Input type="email" placeholder="e.g., rajesh.kumar@example.com" {...field} />
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
                      <Input type="tel" placeholder="e.g., +91 98765 43210" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                    <Input placeholder="e.g., Koramangala, Indiranagar" {...field} />
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="currentLoad"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Current Load</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 3" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Rating (0-5)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 4.5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting 
                ? (isEditMode ? 'Updating...' : 'Registering...') 
                : (isEditMode ? 'Update Partner' : 'Register Partner')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
