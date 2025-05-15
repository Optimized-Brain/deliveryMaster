
"use client";

import React from 'react';
import type { Order, DailyOrdersChartData } from '@/lib/types';
import { format, subDays, isValid } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface RecentActivityChartProps {
  orders: Order[];
}

const chartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function RecentActivityChart({ orders }: RecentActivityChartProps) {
  const processChartData = (allOrders: Order[]): DailyOrdersChartData[] => {
    const sevenDaysAgo = subDays(new Date(), 6); // Include today + 6 previous days
    const dailyData: { [key: string]: number } = {};

    // Initialize data for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = subDays(new Date(), i);
      const formattedDate = format(date, 'MMM d'); // Format for display e.g., "May 20"
      dailyData[formattedDate] = 0;
    }
    
    allOrders.forEach(order => {
      const orderDate = new Date(order.creationDate);
      if (isValid(orderDate) && orderDate >= sevenDaysAgo) {
        const formattedDate = format(orderDate, 'MMM d');
        if (dailyData.hasOwnProperty(formattedDate)) {
            dailyData[formattedDate]++;
        }
      }
    });

    // Convert to array and sort by date (oldest to newest for chart display)
    return Object.entries(dailyData)
      .map(([date, count]) => ({ date, orders: count }))
      .sort((a, b) => new Date(a.date + ", " + new Date().getFullYear()) < new Date(b.date + ", " + new Date().getFullYear()) ? -1 : 1); // Sort by date for chart
  };

  const chartData = processChartData(orders);

  if (!chartData || chartData.length === 0) {
    return <div className="flex items-center justify-center h-64 bg-secondary rounded-md"><p className="text-muted-foreground">No recent order data to display.</p></div>;
  }

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              allowDecimals={false}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
