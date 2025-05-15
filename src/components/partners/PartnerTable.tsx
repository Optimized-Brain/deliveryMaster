
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Partner, PartnerStatus, Order, OrderStatus } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowUpDown, MoreHorizontal, Edit2, Trash2, Phone, Mail, Loader2, PackageCheck, PackageSearch, PackageX, EyeIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { PARTNER_STATUSES } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategorizedOrders {
  active: Order[];
  delivered: Order[];
  cancelled: Order[];
}

interface PartnerOrderData {
  orders?: CategorizedOrders;
  isLoading: boolean;
  error: string | null;
}

interface AssignedOrdersPopoverContentProps {
  partnerName: string;
  partnerId: string; // Added partnerId for the "View All Orders" link
  activeOrders: Order[];
  deliveredOrders: Order[];
  cancelledOrders: Order[];
}

function AssignedOrdersPopoverContent({ 
  partnerName,
  partnerId,
  activeOrders, 
  deliveredOrders, 
  cancelledOrders,
}: AssignedOrdersPopoverContentProps) {

  if (activeOrders.length === 0 && deliveredOrders.length === 0 && cancelledOrders.length === 0) {
    return <div className="p-4 text-muted-foreground text-sm">No orders found for {partnerName}.</div>;
  }

  return (
    <ScrollArea className="max-h-80 w-80 p-1">
      <div className="p-3 space-y-3">
        {activeOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-1.5 flex items-center">
              <PackageSearch className="h-4 w-4 mr-1.5 text-primary" />
              Active Assignments ({activeOrders.length}):
            </h4>
            <ul className="space-y-1 text-xs list-disc list-inside pl-2 text-muted-foreground">
              {activeOrders.map(order => (
                <li key={order.id} className="truncate" title={`${order.id} - ${order.status}`}>
                  ID: {order.id.substring(0, 8)}... ({order.status})
                </li>
              ))}
            </ul>
          </div>
        )}

        {deliveredOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-1.5 flex items-center">
              <PackageCheck className="h-4 w-4 mr-1.5 text-emerald-500" />
              Delivered Orders ({deliveredOrders.length}):
            </h4>
            <ul className="space-y-1 text-xs list-disc list-inside pl-2 text-muted-foreground">
              {deliveredOrders.map(order => (
                <li key={order.id} className="truncate" title={order.id}>
                  ID: {order.id.substring(0, 8)}...
                </li>
              ))}
            </ul>
          </div>
        )}

        {cancelledOrders.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-1.5 flex items-center">
              <PackageX className="h-4 w-4 mr-1.5 text-destructive" />
              Cancelled Orders ({cancelledOrders.length}):
            </h4>
            <ul className="space-y-1 text-xs list-disc list-inside pl-2 text-muted-foreground">
              {cancelledOrders.map(order => (
                <li key={order.id} className="truncate" title={order.id}>
                  ID: {order.id.substring(0, 8)}...
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {(activeOrders.length > 0 || deliveredOrders.length > 0 || cancelledOrders.length > 0) && (
          <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline mt-2 text-xs">
            <Link href={`/orders?assignedPartnerId=${partnerId}`}>
              View All Orders for Partner
            </Link>
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}


interface PartnerTableProps {
  partners: Partner[];
  onEditPartner: (partnerId: string) => void;
  onDeletePartner: (partnerId: string) => void;
}

type SortKey = keyof Partner | '';

export function PartnerTable({ partners, onEditPartner, onDeletePartner }: PartnerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');
  const { toast } = useToast();

  const [partnerOrderData, setPartnerOrderData] = useState<Record<string, PartnerOrderData>>({});

  const fetchOrdersForPartner = useCallback(async (partnerId: string) => {
    setPartnerOrderData(prev => ({
      ...prev,
      [partnerId]: { ...(prev[partnerId] || {}), isLoading: true, error: null }
    }));
    try {
      const response = await fetch(`/api/orders?assignedPartnerId=${partnerId}`);
      if (!response.ok) {
        const errorText = await response.text();
        let message = `Failed to fetch orders for partner ${partnerId.substring(0,8)}... (status: ${response.status})`;
        try {
            const errorData = JSON.parse(errorText);
            message = errorData.error || errorData.message || message;
        } catch (e) { /* ignore parsing error, use text */ }
        throw new Error(message);
      }
      const orders: Order[] = await response.json();
      const active = orders.filter(o => o.status === 'assigned' || o.status === 'picked');
      const delivered = orders.filter(o => o.status === 'delivered');
      const cancelled = orders.filter(o => o.status === 'cancelled');
      
      setPartnerOrderData(prev => ({
        ...prev,
        [partnerId]: { orders: { active, delivered, cancelled }, isLoading: false, error: null }
      }));
    } catch (e) {
      const errorMessage = (e as Error).message;
      setPartnerOrderData(prev => ({
        ...prev,
        [partnerId]: { ...(prev[partnerId] || { orders: { active: [], delivered: [], cancelled: [] } }), isLoading: false, error: errorMessage }
      }));
      console.error(`Error fetching orders for partner ${partnerId}:`, errorMessage);
      // Toast might be too noisy here, error shown inline
    }
  }, []);

  useEffect(() => {
    partners.forEach(partner => {
      if (!partnerOrderData[partner.id] || partnerOrderData[partner.id]?.error) { 
        fetchOrdersForPartner(partner.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [partners, fetchOrdersForPartner]);


  const filteredAndSortedPartners = useMemo(() => {
    let processedPartners = [...partners];

    if (searchTerm) {
      processedPartners = processedPartners.filter(partner =>
        partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.assignedAreas.join(', ').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      processedPartners = processedPartners.filter(partner => partner.status === statusFilter);
    }

    if (sortKey) {
      processedPartners.sort((a, b) => {
        let valA = a[sortKey as keyof Partner];
        let valB = b[sortKey as keyof Partner];
        
        if (sortKey === 'currentLoad' || sortKey === 'rating') {
            valA = Number(valA);
            valB = Number(valB);
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return processedPartners;
  }, [partners, sortKey, sortOrder, searchTerm, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  
  const getStatusBadgeVariant = (status: PartnerStatus) => {
    switch (status) {
      case 'active': return 'default'; 
      case 'inactive': return 'secondary';
      case 'on-break': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: PartnerStatus) => {
     switch (status) {
      case 'active': return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      default: return '';
    }
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />; 
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Input
          placeholder="Search partners (name, email, area)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PartnerStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PARTNER_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredAndSortedPartners.length === 0 ? (
         <p className="text-center text-muted-foreground py-8">No partners found matching your criteria.</p>
      ) : (
        <div className="rounded-md border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/50">Name {renderSortIcon('name')}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-muted/50">Status {renderSortIcon('status')}</TableHead>
                <TableHead>Areas</TableHead>
                <TableHead onClick={() => handleSort('currentLoad')} className="cursor-pointer hover:bg-muted/50 text-center">Load {renderSortIcon('currentLoad')}</TableHead>
                <TableHead className="text-center">Order Summary</TableHead>
                <TableHead onClick={() => handleSort('rating')} className="cursor-pointer hover:bg-muted/50 text-center">Rating {renderSortIcon('rating')}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPartners.map((partner) => {
                const currentPartnerOrders = partnerOrderData[partner.id];
                const orders = currentPartnerOrders?.orders || { active: [], delivered: [], cancelled: [] };
                const isLoadingOrders = currentPartnerOrders?.isLoading === true;
                const orderError = currentPartnerOrders?.error;

                return (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <Mail className="h-3.5 w-3.5" /> {partner.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <Phone className="h-3.5 w-3.5" /> {partner.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(partner.status)} className={cn("capitalize", getStatusBadgeClass(partner.status))}>
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {partner.assignedAreas.join(', ')}
                    </TableCell>
                    <TableCell className="text-center">{partner.currentLoad}</TableCell>
                    <TableCell className="text-center text-xs align-top pt-3">
                      {isLoadingOrders ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : orderError ? (
                        <div className="text-destructive text-xs" title={orderError}>Error loading orders</div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>Act: <Badge variant="outline" className="px-1.5 py-0 text-xs">{orders.active.length}</Badge></div>
                          <div>Del: <Badge variant="outline" className="px-1.5 py-0 text-xs">{orders.delivered.length}</Badge></div>
                          <div>Can: <Badge variant="outline" className="px-1.5 py-0 text-xs">{orders.cancelled.length}</Badge></div>
                        </div>
                      )}
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" disabled={isLoadingOrders || !!orderError}>
                            <EyeIcon className="mr-1 h-3 w-3" /> View Details
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-0"
                          onOpenAutoFocus={(e) => e.preventDefault()} 
                        >
                          <AssignedOrdersPopoverContent 
                            partnerId={partner.id}
                            partnerName={partner.name}
                            activeOrders={orders.active}
                            deliveredOrders={orders.delivered}
                            cancelledOrders={orders.cancelled}
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-center">{partner.rating.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditPartner && (
                            <DropdownMenuItem onClick={() => onEditPartner(partner.id)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {onDeletePartner && (
                            <DropdownMenuItem 
                              onClick={() => onDeletePartner(partner.id)} 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
    
