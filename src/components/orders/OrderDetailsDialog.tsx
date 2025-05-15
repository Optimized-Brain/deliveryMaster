
"use client";

import type { Order } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, isOpen, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) {
    return null;
  }

  const getStatusBadgeVariant = (status: Order["status"]) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'assigned': return 'default';
      case 'picked': return 'outline'; // Changed from 'in-transit'
      case 'delivered': return 'default';
      // 'cancelled' case removed
      default: return 'secondary';
    }
  };
   const getStatusBadgeClass = (status: Order["status"]) => {
     switch (status) {
      case 'delivered': return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      case 'assigned': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'picked': return 'bg-amber-500 hover:bg-amber-600 text-white'; // Changed from 'in-transit'
      default: return '';
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details: {order.id}</DialogTitle>
          <DialogDescription>
            Comprehensive details for the selected order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Customer Name:</span>
            <span>{order.customerName}</span>
          </div>
          {order.customerPhone && (
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <span className="font-semibold text-muted-foreground">Customer Phone:</span>
              <span>{order.customerPhone}</span>
            </div>
          )}
          <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Delivery Address:</span>
            <span>{order.deliveryAddress}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Area:</span>
            <span>{order.area}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Order Value:</span>
            <span>${order.orderValue.toFixed(2)}</span>
          </div>
           <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Status:</span>
            <Badge 
                variant={getStatusBadgeVariant(order.status)} 
                className={cn("capitalize", getStatusBadgeClass(order.status))}
            >
                {order.status}
            </Badge>
          </div>
          {order.assignedPartnerId && (
            <div className="grid grid-cols-[150px_1fr] items-center gap-2">
              <span className="font-semibold text-muted-foreground">Assigned Partner:</span>
              <span>{order.assignedPartnerId}</span>
            </div>
          )}
          <div className="grid grid-cols-[150px_1fr] items-center gap-2">
            <span className="font-semibold text-muted-foreground">Creation Date:</span>
            <span suppressHydrationWarning>
              {order.creationDate ? format(new Date(order.creationDate), "PPp") : 'N/A'}
            </span>
          </div>
          
          <Separator className="my-2" />

          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground">Items:</h4>
            {order.items && order.items.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.name} (Quantity: {item.quantity})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No items listed for this order.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
