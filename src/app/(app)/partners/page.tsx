
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PartnerTable } from "@/components/partners/PartnerTable";
import { PartnerRegistrationForm } from "@/components/partners/PartnerRegistrationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { SAMPLE_PARTNERS } from "@/lib/constants"; // Will fetch from API
import type { Partner } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("list");

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/partners');
      if (!response.ok) {
        let errorDetails = `Failed to fetch partners (status: ${response.status})`;
        try {
          // Attempt to parse the error response from the API
          const errorData = await response.json();
          if (errorData.message && errorData.error) {
            errorDetails = `${errorData.message} Details: ${errorData.error}`;
          } else if (errorData.message) {
            errorDetails = errorData.message;
          } else if (errorData.error) {
            errorDetails = errorData.error;
          }
        } catch (parseError) {
          // If parsing fails, use the status text or the initial generic message
          errorDetails = `Failed to fetch partners (status: ${response.status} ${response.statusText}). Could not parse error response.`;
          console.error("Failed to parse error response from API:", parseError);
        }
        throw new Error(errorDetails);
      }
      const data: Partner[] = await response.json();
      setPartners(data);
    } catch (error) {
      console.error("Error fetching partners client-side:", error);
      toast({ 
        title: "Error Loading Partners", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleEditPartner = (partnerId: string) => {
    toast({ title: "Edit Partner", description: `Editing partner ${partnerId}` });
    // Logic to show edit form or navigate
    // For a real app, you might fetch the partner data and populate an edit form.
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (window.confirm("Are you sure you want to delete this partner?")) {
      try {
        const response = await fetch(`/api/partners/${partnerId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete partner');
        }
        setPartners(prev => prev.filter(p => p.id !== partnerId));
        toast({ title: "Partner Deleted", description: `Partner ${partnerId} has been deleted.`, variant: "default" });
      } catch (error) {
        console.error("Error deleting partner:", error);
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const handlePartnerRegistered = () => {
    fetchPartners(); // Refetch partners list
    setActiveTab("list"); // Switch to list view
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Partners</h1>
        {activeTab === "list" && (
           <Button onClick={() => setActiveTab("register")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Partner
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="list">Partner List</TabsTrigger>
          <TabsTrigger value="register">Register New Partner</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading partners...</p>
            </div>
          ) : (
            <PartnerTable 
              partners={partners} 
              onEditPartner={handleEditPartner} 
              onDeletePartner={handleDeletePartner} 
            />
          )}
        </TabsContent>
        <TabsContent value="register" className="mt-6">
          <PartnerRegistrationForm onPartnerRegistered={handlePartnerRegistered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

