
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Ensure Card components are properly imported
import { Label } from "@/components/ui/label"; // Ensure Label is properly imported
import { CalendarIcon, FilterX } from "lucide-react";
import { format } from "date-fns";
import { AVAILABLE_AREAS, ORDER_STATUSES } from "@/lib/constants";
import type { OrderStatus } from '@/lib/types';

interface OrderFiltersProps {
  onFilterChange: (filters: { status?: OrderStatus | "all"; area?: string | "all"; date?: Date }) => void;
  onClearFilters: () => void;
}

export function OrderFilters({ onFilterChange, onClearFilters }: OrderFiltersProps) {
  const [status, setStatus] = useState<OrderStatus | "all" | undefined>(undefined);
  const [area, setArea] = useState<string>(""); // Empty string means placeholder is shown
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleApplyFilters = () => {
    onFilterChange({ 
      status: status || undefined, // Pass undefined if status is empty or "all" if selected
      area: area || undefined, // Pass undefined if area is empty string, or "all" if selected
      date 
    });
  };

  const handleClear = () => {
    setStatus(undefined);
    setArea(""); // Set to empty string to show placeholder
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
            <Select 
              value={status || ""} // Control select with empty string for placeholder
              onValueChange={(value) => setStatus(value === "all" ? "all" : value as OrderStatus)}
            >
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
             <Select 
                value={area} // Controlled by area state (empty string for placeholder)
                onValueChange={(value) => setArea(value)} // value will be "all" or specific area
             >
              <SelectTrigger id="areaFilter">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                {/* Changed value from "" to "all" */}
                <SelectItem value="all">All Areas</SelectItem> 
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
