"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FilterX } from "lucide-react";
import { format } from "date-fns";
import { AVAILABLE_AREAS, ORDER_STATUSES } from "@/lib/constants";
import type { OrderStatus } from '@/lib/types';

interface OrderFiltersProps {
  onFilterChange: (filters: { status?: OrderStatus; area?: string; date?: Date }) => void;
  onClearFilters: () => void;
}

export function OrderFilters({ onFilterChange, onClearFilters }: OrderFiltersProps) {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [area, setArea] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleApplyFilters = () => {
    onFilterChange({ status, area: area || undefined, date });
  };

  const handleClear = () => {
    setStatus(undefined);
    setArea("");
    setDate(undefined);
    onClearFilters();
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Filter Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="statusFilter">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
              <SelectTrigger id="statusFilter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ORDER_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="areaFilter">Area</Label>
             <Select value={area} onValueChange={setArea}>
              <SelectTrigger id="areaFilter">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Areas</SelectItem>
                {AVAILABLE_AREAS.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dateFilter">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="dateFilter"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
            <Button onClick={handleClear} variant="outline" className="w-auto" aria-label="Clear filters">
              <FilterX className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dummy Card components for compilation if not globally available in this context
// In a real app, these would be imported from '@/components/ui/card'
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => <div className={className}>{children}</div>;
const CardHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const CardTitle = ({className, children}: {className?: string, children: React.ReactNode}) => <h3 className={className}>{children}</h3>;
const CardContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Label = ({htmlFor, children}: {htmlFor: string, children: React.ReactNode}) => <label htmlFor={htmlFor} className="text-sm font-medium mb-1 block">{children}</label>;
