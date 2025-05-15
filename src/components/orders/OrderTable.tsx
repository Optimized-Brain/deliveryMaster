"use client";

import React, { useState, useMemo } from 'react';
import type { Order, OrderStatus } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Eye } from "lucide-react";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderTableProps {
  orders: Order[];
  onViewOrder?: (orderId: string) => void;
  onAssignOrder?: (orderId: string) => void;
}

type SortKey = keyof Order | '';

export function OrderTable({ orders, onViewOrder, onAssignOrder }: OrderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('creationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedOrders = useMemo(() => {
    if (!sortKey) return orders;
    return [...orders].sort((a, b) => {
      let valA = a[sortKey as keyof Order];
      let valB = b[sortKey as keyof Order];

      // Handle specific types for sorting
      if (sortKey === 'creationDate') {
        valA = new Date(valA as string).getTime();
        valB = new Date(valB as string).getTime();
      } else if (sortKey === 'orderValue') {
        valA = Number(valA);
        valB = Number(valB);
      }


      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'assigned': return 'default';
      case 'in-transit': return 'outline';
      case 'delivered': return 'default'; // Should be a success variant, using primary for now
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  
  const getStatusBadgeClass = (status: OrderStatus) => {
     switch (status) {
      case 'delivered': return 'bg-emerald-500 hover:bg-emerald-600 text-white'; // Custom success color
      default: return '';
    }
  }

  if (!orders || orders.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No orders found.</p>;
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="rounded-md border shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort('id')} className="cursor-pointer hover:bg-muted/50 w-[100px]">
              Order ID {renderSortIcon('id')}
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead onClick={() => handleSort('area')} className="cursor-pointer hover:bg-muted/50">
              Area {renderSortIcon('area')}
            </TableHead>
            <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-muted/50">
              Status {renderSortIcon('status')}
            </TableHead>
            <TableHead onClick={() => handleSort('orderValue')} className="cursor-pointer hover:bg-muted/50 text-right">
              Value {renderSortIcon('orderValue')}
            </TableHead>
            <TableHead onClick={() => handleSort('creationDate')} className="cursor-pointer hover:bg-muted/50 text-right">
              Created {renderSortIcon('creationDate')}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.customerName}</TableCell>
              <TableCell>{order.area}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(order.status)} className={cn("capitalize", getStatusBadgeClass(order.status))}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">${order.orderValue.toFixed(2)}</TableCell>
              <TableCell className="text-right" suppressHydrationWarning>
                {order.creationDate ? format(new Date(order.creationDate), "PPp") : ''}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewOrder?.(order.id)}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    {order.status === 'pending' && onAssignOrder && (
                      <DropdownMenuItem onClick={() => onAssignOrder(order.id)}>
                        Assign Partner
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
