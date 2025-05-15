
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { RecentActivityChart } from "@/components/dashboard/RecentActivityChart";
import { DASHBOARD_METRICS_CONFIG } from "@/lib/constants";
import type { Metric, Order } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metric[]>(DASHBOARD_METRICS_CONFIG.map(m => ({ ...m, value: "...", change: "", changeType: "neutral" })));
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersResponse, pendingOrdersResponse] = await Promise.all([
        fetch('/api/orders'), 
        fetch('/api/orders?status=pending') 
      ]);

      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json().catch(() => ({ message: `Failed to fetch all orders (status: ${ordersResponse.status})` }));
        throw new Error(errorData.message || `Failed to fetch all orders`);
      }
      const fetchedOrders: Order[] = await ordersResponse.json();
      setAllOrders(fetchedOrders);

      if (!pendingOrdersResponse.ok) {
        const errorData = await pendingOrdersResponse.json().catch(() => ({ message: `Failed to fetch pending orders (status: ${pendingOrdersResponse.status})` }));
        throw new Error(errorData.message || `Failed to fetch pending orders`);
      }
      const fetchedPendingOrders: Order[] = await pendingOrdersResponse.json();

      const totalOrders = fetchedOrders.length;
      const pendingOrdersCount = fetchedPendingOrders.length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const deliveredLast30Days = fetchedOrders.filter(
        order => order.status === 'delivered' && new Date(order.creationDate) >= thirtyDaysAgo
      ).length;

      const totalValue = fetchedOrders.reduce((sum, order) => sum + order.orderValue, 0);
      const avgOrderValue = totalOrders > 0 ? (totalValue / totalOrders) : 0;

      setMetrics(prevMetrics => prevMetrics.map(metric => {
        if (metric.id === 'metric-total-orders') return { ...metric, value: totalOrders };
        if (metric.id === 'metric-pending-orders') return { ...metric, value: pendingOrdersCount };
        if (metric.id === 'metric-delivered-orders') return { ...metric, value: deliveredLast30Days };
        if (metric.id === 'metric-avg-order-value') return { ...metric, value: `₹${avgOrderValue.toFixed(2)}` }; // Changed to INR
        return { ...metric, value: "N/A" }; 
      }));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error Loading Dashboard Data",
        description: (error as Error).message,
        variant: "destructive",
      });
       setMetrics(DASHBOARD_METRICS_CONFIG.map(m => ({ ...m, value: "Error", change: "", changeType: "negative" })));
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order Processing</span>
              <span className="font-semibold text-emerald-500">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Partner Network</span>
              <span className="font-semibold text-emerald-500">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI Assignment</span>
              <span className="font-semibold text-emerald-500">Active</span>
            </div>
             <Image 
                src="https://placehold.co/600x400.png" 
                alt="System status illustration"
                width={600}
                height={400}
                className="rounded-md mt-4"
                data-ai-hint="server gears" 
              />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
