
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const reportIssueSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters long."),
});

type ReportIssueFormData = z.infer<typeof reportIssueSchema>;

interface ReportAssignmentIssueDialogProps {
  orderId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueReported: () => void;
}

export function ReportAssignmentIssueDialog({
  orderId,
  isOpen,
  onOpenChange,
  onIssueReported,
}: ReportAssignmentIssueDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportIssueFormData>({
    resolver: zodResolver(reportIssueSchema),
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = async (data: ReportIssueFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/assignments/report-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          reason: data.reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to report issue.');
      }

      toast({
        title: "Issue Reported",
        description: "The issue has been logged and the order status updated.",
      });
      form.reset();
      onIssueReported();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to report issue:", error);
      toast({
        title: "Failed to Report Issue",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog is closed or orderId changes
  React.useEffect(() => {
    if (!isOpen) {
      form.reset({ reason: "" });
    }
  }, [isOpen, form]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Issue for Order {orderId.substring(0,8)}...</DialogTitle>
          <DialogDescription>
            Please provide a reason for the assignment failure (e.g., pickup or delivery issue).
            This will revert the order to 'pending'.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Failure</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Customer unresponsive, Address not found, Item damaged..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
