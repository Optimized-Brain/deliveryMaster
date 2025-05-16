
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { FailedAssignmentInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ListChecks, Loader2, FileWarning } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface FailedAssignmentsListProps {
  className?: string;
}

export function FailedAssignmentsList({ className }: FailedAssignmentsListProps) {
  const { toast } = useToast();
  const [failedAssignments, setFailedAssignments] = useState<FailedAssignmentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFailedAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/assignments?status=failed');
      if (!response.ok) {
        let errorDetails = `Failed to fetch failed assignments (status: ${response.status})`;
        try {
            const errorData = await response.json();
            // Prioritize specific error details from the API response
            if (errorData.error) {
              errorDetails = `Failed to fetch failed assignments: ${errorData.error}`;
              if (errorData.details) {
                errorDetails += ` (Details: ${errorData.details})`;
              }
            } else if (errorData.message) {
              errorDetails = errorData.message;
            }
        } catch (e) {
            const errorText = await response.text().catch(() => "Could not retrieve error text.");
            if (errorText.toLowerCase().includes("<!doctype html>")) {
                errorDetails = `Failed to fetch failed assignments. Server returned an HTML error. Check server logs. (Status: ${response.status})`;
            } else {
                errorDetails = `Failed to fetch failed assignments. Raw error: ${errorText.substring(0,100)}... (Status: ${response.status})`;
            }
        }
        throw new Error(errorDetails);
      }
      const data: FailedAssignmentInfo[] = await response.json();
      setFailedAssignments(data);
    } catch (error) {
      toast({
        title: "Error Loading Failed Assignments",
        description: (error as Error).message,
        variant: "destructive",
      });
      setFailedAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFailedAssignments();
  }, [fetchFailedAssignments]);

  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileWarning className="h-6 w-6 text-destructive" />
          <CardTitle>Reported Assignment Issues</CardTitle>
        </div>
        <CardDescription>Orders that failed pickup or delivery and need attention.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading reported issues...</p>
          </div>
        ) : failedAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ListChecks className="h-12 w-12 text-emerald-500 mb-3" />
            <p className="text-muted-foreground">No assignment issues reported recently.</p>
            <p className="text-xs text-muted-foreground">All clear for now!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4"> {/* Adjusted height */}
            <ul className="space-y-3">
              {failedAssignments.map((item) => (
                <li key={item.assignmentId} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold">
                        Order ID: <Link href={`/orders?orderId=${item.orderId}`} className="text-primary hover:underline">{item.orderId.substring(0, 8)}...</Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Customer: {item.customerName} ({item.area})
                      </p>
                    </div>
                     <p className="text-xs text-muted-foreground whitespace-nowrap" suppressHydrationWarning>
                        {item.reportedAt ? formatDistanceToNow(new Date(item.reportedAt), { addSuffix: true }) : 'N/A'}
                      </p>
                  </div>
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                    <p className="text-xs font-medium text-destructive flex items-start">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5 mt-0.5 shrink-0" />
                      Reason: <span className="ml-1 font-normal text-destructive/90">{item.failureReason}</span>
                    </p>
                  </div>
                   <Button variant="link" size="sm" asChild className="mt-1 p-0 h-auto text-xs">
                     <Link href={`/assignment?orderId=${item.orderId}`}>
                        Re-assign Order
                      </Link>
                   </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

