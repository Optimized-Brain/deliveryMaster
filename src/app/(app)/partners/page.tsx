
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
    setIsLoading(true);
    try {
      const response = await fetch('/api/partners');
      if (!response.ok) {
        let errorDetails = `Failed to fetch partners (status: ${response.status} ${response.statusText})`;
        try {
          const errorText = await response.text();
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch partners. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else if (errorText) {
            const errorData = JSON.parse(errorText); 
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
           // Error parsing JSON or non-JSON error response
        }
        throw new Error(errorDetails);
      }
      const data: Partner[] = await response.json();
      setPartners(data);
    } catch (error) {
      toast({ 
        title: "Error Loading Partners", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleEditPartner = (partnerId: string) => {
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
    const partnerToDelete = partners.find(p => p.id === partnerId);
    if (!partnerToDelete) {
      toast({ title: "Error", description: "Partner not found for deletion in local list.", variant: "destructive" });
      return;
    }

    console.log(`[PartnersPage] handleDeletePartner ENTERED for ID: ${partnerId}, Name: ${partnerToDelete.name}`);

    if (window.confirm(`Are you sure you want to delete partner "${partnerToDelete.name}"? This action cannot be undone.`)) {
      console.log(`[PartnersPage] User confirmed deletion for partner: ${partnerToDelete.name}. API call to /api/partners/${partnerId}`);
      try {
        const response = await fetch(`/api/partners/${partnerId}`, { method: 'DELETE' });
        
        console.log(`[PartnersPage] DELETE /api/partners/${partnerId} response status: ${response.status}, statusText: ${response.statusText}`);
        
        const resultText = await response.text(); // Get text first to avoid parsing errors on empty/non-JSON
        let result;
        try {
          result = JSON.parse(resultText);
          console.log(`[PartnersPage] DELETE /api/partners/${partnerId} response body:`, result);
        } catch (e) {
          console.error(`[PartnersPage] Failed to parse JSON response from DELETE /api/partners/${partnerId}. Raw text: ${resultText}`);
          if (!response.ok) { // If response was not ok AND we couldn't parse JSON
             throw new Error(`Deletion failed. Server responded with status ${response.status} and non-JSON content.`);
          }
          // If response was ok but content wasn't JSON (e.g. 204 No Content, though our API returns JSON)
          // This path should ideally not be hit if API always returns JSON or specific error.
          result = { message: `Partner deleted (status ${response.status}, no JSON body).` }; 
        }


        if (!response.ok) {
          const errorMessage = result.error || result.message || `Failed to delete partner. Status: ${response.status}`;
          console.error(`[PartnersPage] Deletion failed for partner ${partnerToDelete.name}. Error: ${errorMessage}`);
          throw new Error(errorMessage);
        }
        
        // If response.ok, it means API returned 200 (deletion confirmed by API)
        setPartners(prevPartners => prevPartners.filter(p => p.id !== partnerId));
        toast({ title: "Partner Deleted", description: result.message || `Partner ${partnerToDelete.name} has been successfully deleted.`, variant: "default" });
        console.log(`[PartnersPage] Successfully deleted partner ${partnerToDelete.name} from UI and showed toast.`);

      } catch (error) {
        console.error(`[PartnersPage] Error during partner deletion process for ${partnerToDelete.name}:`, error);
        toast({ 
          title: "Deletion Failed", 
          description: (error as Error).message || "An unexpected error occurred during deletion.", 
          variant: "destructive" 
        });
      }
    } else {
      console.log(`[PartnersPage] Deletion of partner ${partnerToDelete.name} was cancelled by user.`);
      toast({ title: "Deletion Cancelled", description: `Deletion of partner ${partnerToDelete.name} was cancelled.`, variant: "default" });
    }
  };

  const handlePartnerRegistered = () => {
    fetchPartners(); 
    setEditingPartner(null); 
    setActiveTab("list"); 
  };
  
  const handlePartnerUpdated = () => {
    fetchPartners();
    setEditingPartner(null);
    setActiveTab("list");
    toast({title: "Partner Updated", description: "Partner details have been successfully updated."})
  }

  const handleTabChange = (newTab: string) => {
    if (newTab === "list") {
      setEditingPartner(null); 
    }
    setActiveTab(newTab);
  }

  const handleAddNewPartnerClick = () => {
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
