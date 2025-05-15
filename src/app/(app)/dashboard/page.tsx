
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { RecentActivityChart } from "@/components/dashboard/RecentActivityChart";
import { FailedAssignmentsList } from "@/components/dashboard/FailedAssignmentsList";
import { DASHBOARD_METRICS_CONFIG } from "@/lib/constants";
import type { Metric, Order, AssignmentMetrics } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ListChecks } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

const POLLING_INTERVAL = 60000; // 60 seconds

export default function DashboardPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metric[]>(DASHBOARD_METRICS_CONFIG.map(m => ({ ...m, value: "...", change: "", changeType: "neutral" })));
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [assignmentMetrics, setAssignmentMetrics] = useState<AssignmentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignmentMetricsLoading, setIsAssignmentMetricsLoading] = useState(true);

  const fetchDashboardData = useCallback(async (isPollingUpdate = false) => {
    if (!isPollingUpdate) {
      setIsLoading(true);
    }
    // Always set assignment metrics loading for its specific card, even on poll
    setIsAssignmentMetricsLoading(true);

    try {
      const [ordersResponse, pendingOrdersResponse, assignmentMetricsResponse] = await Promise.all([
        fetch('/api/orders'), 
        fetch('/api/orders?status=pending'),
        fetch('/api/assignments/metrics')
      ]);

      // Process Orders Data
      let fetchedOrders: Order[] = [];
      let fetchedPendingOrders: Order[] = [];

      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json().catch(() => ({ message: `Failed to fetch all orders (status: ${ordersResponse.status})` }));
        throw new Error(errorData.message || `Failed to fetch all orders`);
      }
      fetchedOrders = await ordersResponse.json();
      setAllOrders(fetchedOrders);

      if (!pendingOrdersResponse.ok) {
        const errorData = await pendingOrdersResponse.json().catch(() => ({ message: `Failed to fetch pending orders (status: ${pendingOrdersResponse.status})` }));
        throw new Error(errorData.message || `Failed to fetch pending orders`);
      }
      fetchedPendingOrders = await pendingOrdersResponse.json();
      
      // Process Assignment Metrics
      let fetchedAssignmentMetricsData: AssignmentMetrics | null = null;
      if (!assignmentMetricsResponse.ok) {
        const errorData = await assignmentMetricsResponse.json().catch(() => ({ message: `Failed to fetch assignment metrics (status: ${assignmentMetricsResponse.status})` }));
        // For polling, we might log this error but not throw, to allow other metrics to update
        // For initial load, we throw.
        if (!isPollingUpdate) throw new Error(errorData.message || `Failed to fetch assignment metrics`);
        console.error("Polling error fetching assignment metrics:", errorData.message || `Status: ${assignmentMetricsResponse.status}`);
        // Keep existing assignmentMetrics or set to error state if desired for the card
        // For simplicity, we'll let it try to update metrics below, which will use potentially stale data for assignment parts.
      } else {
        fetchedAssignmentMetricsData = await assignmentMetricsResponse.json();
        setAssignmentMetrics(fetchedAssignmentMetricsData);
      }
      setIsAssignmentMetricsLoading(false);


      const totalOrders = fetchedOrders.length;
      const pendingOrdersCount = fetchedPendingOrders.length;
      const totalDeliveredOrders = fetchedOrders.filter(order => order.status === 'delivered').length;
      const totalValue = fetchedOrders.reduce((sum, order) => sum + (Number(order.orderValue) || 0), 0);
      const avgOrderValue = totalOrders > 0 ? (totalValue / totalOrders) : 0;

      setMetrics(prevMetrics => {
        return DASHBOARD_METRICS_CONFIG.map(config => {
          const existingMetric = prevMetrics.find(pm => pm.id === config.id);
          let value: string | number = existingMetric?.value ?? "..."; // Default to existing or placeholder

          if (config.id === 'metric-total-orders') value = totalOrders;
          else if (config.id === 'metric-pending-orders') value = pendingOrdersCount;
          else if (config.id === 'metric-delivered-orders') value = totalDeliveredOrders;
          else if (config.id === 'metric-avg-order-value') value = `₹${avgOrderValue.toFixed(2)}`;
          else if (config.id === 'metric-total-assignments' && fetchedAssignmentMetricsData) value = fetchedAssignmentMetricsData.totalAssignments;
          else if (config.id === 'metric-assignment-success-rate' && fetchedAssignmentMetricsData) value = `${fetchedAssignmentMetricsData.successRate.toFixed(1)}%`;
          else if (value === "...") value = "N/A"; // If still placeholder, set to N/A

          return { ...config, value, change: existingMetric?.change || "", changeType: existingMetric?.changeType || "neutral" };
        });
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (!isPollingUpdate) {
        toast({
          title: "Error Loading Dashboard Data",
          description: (error as Error).message,
          variant: "destructive",
        });
        setMetrics(DASHBOARD_METRICS_CONFIG.map(m => ({ ...m, value: "Error", change: "", changeType: "negative" })));
        setAssignmentMetrics(null); // Clear assignment metrics on initial load error
        setIsAssignmentMetricsLoading(false); // Ensure this loader stops on error too
      }
      // For polling errors, we generally just log and don't show a toast or clear data
      // to avoid interrupting the user.
    } finally {
      if (!isPollingUpdate) {
        setIsLoading(false);
      }
      // If there was an error specific to assignment metrics and it wasn't an initial load,
      // the loader might still be on. Ensure it's off.
      if (isAssignmentMetricsLoading && !assignmentMetricsResponse.ok) {
        setIsAssignmentMetricsLoading(false);
      }
    }
  }, [toast]); // Removed assignmentMetricsResponse from deps to avoid complex conditions in finally

  useEffect(() => {
    fetchDashboardData(); // Initial fetch

    const intervalId = setInterval(() => {
      fetchDashboardData(true); // Subsequent fetches are polling updates
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      {isLoading && metrics.some(m => m.value === "...") ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {DASHBOARD_METRICS_CONFIG.map(config => (
            <Card key={config.id} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {config.title}
                </CardTitle>
                <config.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <MetricsGrid metrics={metrics} />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Order Activity (Last 7 Days)</CardTitle>
            <CardDescription>Number of orders created per day.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && allOrders.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-secondary rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading chart data...</p>
              </div>
            ) : allOrders.length > 0 ? (
              <RecentActivityChart orders={allOrders} />
            ) : (
              <div className="flex items-center justify-center h-64 bg-secondary rounded-md">
                <p className="text-muted-foreground">No order data available for the chart.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <FailedAssignmentsList className="lg:col-span-2" />

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <CardTitle>Top Assignment Failure Reasons</CardTitle>
            </div>
            <CardDescription>Common reasons for reported assignment issues.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAssignmentMetricsLoading && !assignmentMetrics ? ( // Show loader if loading AND no data yet
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading failure reasons...</p>
              </div>
            ) : assignmentMetrics && assignmentMetrics.failureReasons.length > 0 ? (
              <ScrollArea className="h-[300px] pr-3">
                <ul className="space-y-2">
                  {assignmentMetrics.failureReasons.map((item, index) => (
                    <li key={index} className="p-2.5 border rounded-md shadow-sm bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-sm truncate" title={item.reason}>{item.reason || "N/A"}</span>
                        <span className="text-sm font-semibold text-primary">{item.count}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : ( // This covers case where metrics are loaded but no failure reasons exist, OR if error occurred during fetch
              <div className="flex flex-col items-center justify-center h-40 text-center">
                 <ListChecks className="h-12 w-12 text-emerald-500 mb-3" />
                <p className="text-muted-foreground">
                  {assignmentMetrics === null && !isAssignmentMetricsLoading 
                    ? "Could not load failure reasons." 
                    : "No specific failure reasons reported or tracked."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

declare module '@/components/dashboard/FailedAssignmentsList' {
  interface FailedAssignmentsListProps {
    className?: string;
  }
  export function FailedAssignmentsList(props: FailedAssignmentsListProps): JSX.Element;
}
