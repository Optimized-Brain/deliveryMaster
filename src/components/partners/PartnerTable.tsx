
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Partner, PartnerStatus, Order } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ArrowUpDown, MoreHorizontal, Edit2, Trash2, Phone, Mail, ListOrdered, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { PARTNER_STATUSES } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface PartnerTableProps {
  partners: Partner[];
  onEditPartner?: (partnerId: string) => void;
  onDeletePartner?: (partnerId: string) => void;
}

interface AssignedOrdersPopoverContentProps {
  partnerId: string;
  partnerName: string;
}

function AssignedOrdersPopoverContent({ partnerId, partnerName }: AssignedOrdersPopoverContentProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAssignedOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders?assignedPartnerId=${partnerId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch orders for partner ${partnerId}` }));
        throw new Error(errorData.message);
      }
      const data: Order[] = await response.json();
      // Filter for active assignments ('assigned' or 'picked')
      const activeAssignments = data.filter(order => order.status === 'assigned' || order.status === 'picked');
      setOrders(activeAssignments);
    } catch (e) {
      console.error(`Error fetching orders for partner ${partnerId}:`, e);
      setError((e as Error).message);
      toast({
        title: "Error Loading Assigned Orders",
        description: (e as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [partnerId, toast]);

  useEffect(() => {
    if (partnerId) { // Only fetch if popover is opened (partnerId would be set)
      fetchAssignedOrders();
    }
  }, [partnerId, fetchAssignedOrders]); // Rerun when partnerId changes (though popover typically re-mounts)

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading assigned orders...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-destructive">Error: {error}</div>;
  }

  if (orders.length === 0) {
    return <div className="p-4 text-muted-foreground">No active orders assigned to {partnerName}.</div>;
  }

  return (
    <div className="p-4 space-y-3 max-w-xs">
      <h4 className="font-semibold text-sm">Active Assignments for {partnerName}:</h4>
      <ul className="space-y-1 text-xs list-disc list-inside">
        {orders.map(order => (
          <li key={order.id}>
            ID: {order.id.substring(0, 8)}... ({order.customerName}) - Status: {order.status}
          </li>
        ))}
      </ul>
      <Button variant="link" size="sm" asChild className="p-0 h-auto text-primary hover:underline mt-2">
        <Link href={`/orders?assignedPartnerId=${partnerId}`}>
          View All on Orders Page
        </Link>
      </Button>
    </div>
  );
}


type SortKey = keyof Partner | '';

export function PartnerTable({ partners, onEditPartner, onDeletePartner }: PartnerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');

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
        
        if (typeof valA === 'string' && typeof valB === 'string') {
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
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/50">
                  Name {renderSortIcon('name')}
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-muted/50">
                  Status {renderSortIcon('status')}
                </TableHead>
                <TableHead>Areas</TableHead>
                <TableHead onClick={() => handleSort('currentLoad')} className="cursor-pointer hover:bg-muted/50 text-center">
                  Load {renderSortIcon('currentLoad')}
                </TableHead>
                <TableHead>Assigned Orders</TableHead>
                <TableHead onClick={() => handleSort('rating')} className="cursor-pointer hover:bg-muted/50 text-center">
                  Rating {renderSortIcon('rating')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPartners.map((partner) => (
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
                  <TableCell className="text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          View ({partner.currentLoad}) <ListOrdered className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto" 
                        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
                      >
                        <AssignedOrdersPopoverContent partnerId={partner.id} partnerName={partner.name} />
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
                        <DropdownMenuItem onClick={() => onEditPartner?.(partner.id)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeletePartner?.(partner.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
