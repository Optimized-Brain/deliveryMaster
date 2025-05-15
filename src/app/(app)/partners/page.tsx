
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PartnerTable } from "@/components/partners/PartnerTable";
import { PartnerRegistrationForm } from "@/components/partners/PartnerRegistrationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Partner } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const fetchPartners = useCallback(async () => {
    console.log("[PartnersPage] Fetching partners...");
    setIsLoading(true);
    try {
      const response = await fetch('/api/partners');
      console.log("[PartnersPage] Fetch partners API response status:", response.status);
      if (!response.ok) {
        let errorDetails = `Failed to fetch partners (status: ${response.status} ${response.statusText})`;
        try {
          const errorText = await response.text();
          console.error("[PartnersPage] Raw error response from fetching partners:", errorText.substring(0, 500));
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch partners. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else if (errorText) {
            const errorData = JSON.parse(errorText);
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
           console.error("[PartnersPage] Failed to parse error response from fetching partners:", parseError);
        }
        throw new Error(errorDetails);
      }
      const data: Partner[] = await response.json();
      console.log("[PartnersPage] Successfully fetched and parsed partners:", data.length);
      setPartners(data);
    } catch (error) {
      console.error("[PartnersPage] Error in fetchPartners:", error);
      toast({ 
        title: "Error Loading Partners", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
      setPartners([]);
    } finally {
      setIsLoading(false);
      console.log("[PartnersPage] Finished fetching partners.");
    }
  }, [toast]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleEditPartner = (partnerId: string) => {
    console.log("[PartnersPage] handleEditPartner called for ID:", partnerId);
    const partnerToEdit = partners.find(p => p.id === partnerId);
    if (partnerToEdit) {
      setEditingPartner(partnerToEdit);
      setActiveTab("register"); 
      toast({ title: "Editing Partner", description: `Editing details for ${partnerToEdit.name}` });
    } else {
      toast({ title: "Error", description: "Could not find partner to edit.", variant: "destructive" });
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    console.log(`[PartnersPage] handleDeletePartner called for ID: ${partnerId}`);
    const partnerToDelete = partners.find(p => p.id === partnerId);
    if (!partnerToDelete) {
      toast({ title: "Error", description: "Partner not found for deletion.", variant: "destructive" });
      console.error(`[PartnersPage] Partner with ID ${partnerId} not found in local state for deletion.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete partner "${partnerToDelete.name}"? This action cannot be undone.`)) {
      console.log(`[PartnersPage] User confirmed deletion for partner: ${partnerToDelete.name}`);
      try {
        const response = await fetch(`/api/partners/${partnerId}`, { method: 'DELETE' });
        console.log(`[PartnersPage] DELETE /api/partners/${partnerId} response status: ${response.status}`);

        if (!response.ok) {
          let errorDetails = `Failed to delete partner ${partnerToDelete.name}. Status: ${response.status}`;
          try {
            const errorData = await response.json();
            console.log(`[PartnersPage] Error data from API for delete:`, errorData);
            errorDetails = errorData.message || errorData.error || errorDetails;
          } catch (e) {
            const errorText = await response.text().catch(() => "Could not retrieve error text");
            console.error(`[PartnersPage] Could not parse JSON error response from delete API for ${partnerId}. Raw text: ${errorText.substring(0,500)}`);
            if (errorText.toLowerCase().includes("<!doctype html>")) {
                errorDetails = `Failed to delete partner. Server returned an HTML error (status: ${response.status}).`;
            } else {
                errorDetails = `Failed to delete partner (status: ${response.status}). Server returned non-JSON response.`;
            }
          }
          console.error(`[PartnersPage] Delete failed: ${errorDetails}`);
          throw new Error(errorDetails);
        }
        
        // If deletion is successful (response.ok is true)
        console.log(`[PartnersPage] Successfully deleted partner ${partnerId} via API.`);
        setPartners(prevPartners => prevPartners.filter(p => p.id !== partnerId));
        toast({ title: "Partner Deleted", description: `Partner ${partnerToDelete.name} has been successfully deleted.`, variant: "default" });
      } catch (error) {
        console.error(`[PartnersPage] Error during handleDeletePartner for ${partnerId}:`, error);
        toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
      }
    } else {
      console.log(`[PartnersPage] User cancelled deletion for partner: ${partnerToDelete.name}`);
    }
  };

  const handlePartnerRegistered = () => {
    console.log("[PartnersPage] handlePartnerRegistered called");
    fetchPartners(); 
    setEditingPartner(null); 
    setActiveTab("list"); 
  };
  
  const handlePartnerUpdated = () => {
    console.log("[PartnersPage] handlePartnerUpdated called");
    fetchPartners();
    setEditingPartner(null);
    setActiveTab("list");
    toast({title: "Partner Updated", description: "Partner details have been successfully updated."})
  }

  const handleTabChange = (newTab: string) => {
    console.log("[PartnersPage] handleTabChange called, new tab:", newTab);
    if (newTab === "list") {
      setEditingPartner(null); 
    }
    setActiveTab(newTab);
  }

  const handleAddNewPartnerClick = () => {
    console.log("[PartnersPage] handleAddNewPartnerClick called");
    setEditingPartner(null); 
    setActiveTab("register");
  }
  
  const formTabTitle = editingPartner ? "Edit Partner Details" : "Register New Partner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Partners</h1>
        {activeTab === "list" && (
           <Button onClick={handleAddNewPartnerClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Partner
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="list">Partner List</TabsTrigger>
          <TabsTrigger value="register">{formTabTitle}</TabsTrigger>
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
          <PartnerRegistrationForm 
            partnerToEdit={editingPartner}
            onPartnerRegistered={handlePartnerRegistered} 
            onPartnerUpdated={handlePartnerUpdated}
            key={editingPartner ? editingPartner.id : 'register-new'} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
    
