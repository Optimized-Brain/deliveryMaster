
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
    console.log("[PartnersPage] fetchPartners: Initiating fetch.");
    setIsLoading(true);
    try {
      const response = await fetch('/api/partners');
      console.log("[PartnersPage] fetchPartners: API response status:", response.status);
      if (!response.ok) {
        let errorDetails = `Failed to fetch partners (status: ${response.status} ${response.statusText})`;
        try {
          const errorText = await response.text();
          console.error("[PartnersPage] fetchPartners: Raw error response:", errorText);
          if (errorText.toLowerCase().includes("<!doctype html>")) {
             errorDetails = `Failed to fetch partners. Server returned an HTML error page (status: ${response.status}). Check server logs.`;
          } else if (errorText) {
            const errorData = JSON.parse(errorText);
            errorDetails = errorData.error || errorData.message || errorDetails;
          }
        } catch (parseError) {
           console.error("[PartnersPage] fetchPartners: Failed to parse error response:", parseError);
        }
        throw new Error(errorDetails);
      }
      const data: Partner[] = await response.json();
      console.log("[PartnersPage] fetchPartners: Successfully fetched partners:", data.length);
      setPartners(data);
    } catch (error) {
      console.error("[PartnersPage] fetchPartners: Catch block error:", error);
      toast({
        title: "Error Loading Partners",
        description: (error as Error).message,
        variant: "destructive"
      });
      setPartners([]);
    } finally {
      setIsLoading(false);
      console.log("[PartnersPage] fetchPartners: Fetch complete, isLoading set to false.");
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
    console.log(`[PartnersPage] handleDeletePartner: Entered for ID: ${partnerId}`);
    const partnerToDelete = partners.find(p => p.id === partnerId);
    if (!partnerToDelete) {
      toast({ title: "Error", description: "Partner not found for deletion in local state.", variant: "destructive" });
      console.error(`[PartnersPage] handleDeletePartner: Partner with ID ${partnerId} not found in local state.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete partner "${partnerToDelete.name}"? This action cannot be undone.`)) {
      console.log(`[PartnersPage] handleDeletePartner: User confirmed deletion for partner "${partnerToDelete.name}". API call to /api/partners/${partnerId}`);
      try {
        const response = await fetch(`/api/partners/${partnerId}`, { method: 'DELETE' });
        console.log(`[PartnersPage] handleDeletePartner: API response status: ${response.status}, statusText: ${response.statusText}`);

        let result;
        const responseText = await response.text(); // Get raw text first
        console.log(`[PartnersPage] handleDeletePartner: API response raw text: "${responseText}"`);

        try {
          result = JSON.parse(responseText); // Attempt to parse JSON
          console.log(`[PartnersPage] handleDeletePartner: API response parsed JSON:`, result);
        } catch (e) {
          // If parsing fails, means response was not JSON (e.g. empty, or HTML error not caught by !response.ok)
          if (response.ok && responseText.trim() === "") { 
             console.warn(`[PartnersPage] handleDeletePartner: API response was OK (${response.status}) but body was empty or not JSON. This might indicate an issue if JSON was expected.`);
             // If API successfully deletes and returns 204 No Content, this path might be taken.
             // Our API is designed to send JSON even on 200 success.
             if (response.status === 200 || response.status === 204) { // Check for 200 or 204
                 setPartners(prevPartners => prevPartners.filter(p => p.id !== partnerId));
                 toast({ title: "Partner Deleted", description: `Partner ${partnerToDelete.name} may have been deleted (server sent empty success response). Refresh if not updated.`, variant: "default" });
                 console.log(`[PartnersPage] handleDeletePartner: Partner ${partnerId} removed from UI based on empty success response.`);
                 return;
             }
          }
          // If not OK or not empty, then it's a problem to be thrown
          console.error(`[PartnersPage] handleDeletePartner: Failed to parse API response text as JSON. Status: ${response.status}. Body: ${responseText.substring(0, 100)}...`);
          throw new Error(`Failed to parse API response. Status: ${response.status}.`);
        }
        

        if (!response.ok) {
          // Prioritize API's error message from parsed JSON
          const errorMessage = result.error || result.message || `Failed to delete partner. Status: ${response.status}`;
          console.error(`[PartnersPage] handleDeletePartner: API error: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Explicitly check for status 200 and a success message as per API design
        if (response.status === 200 && result.message && result.message.toLowerCase().includes("deleted successfully")) {
            setPartners(prevPartners => prevPartners.filter(p => p.id !== partnerId));
            toast({ title: "Partner Deleted", description: result.message, variant: "default" });
            console.log(`[PartnersPage] handleDeletePartner: Partner ${partnerId} deleted successfully from UI based on API message.`);
        } else {
            // If response.ok but not status 200 or message is not as expected
            console.warn(`[PartnersPage] handleDeletePartner: API response was OK (${response.status}) but result.message was unexpected or missing:`, result);
            // Don't update UI if success isn't definitively confirmed
            throw new Error(result.message || `Deletion status uncertain: API responded with ${response.status} but success message was unclear.`);
        }

      } catch (error) {
        console.error("[PartnersPage] handleDeletePartner: Catch block error:", error);
        toast({
          title: "Deletion Operation Failed",
          description: (error as Error).message || "An unexpected error occurred during deletion.",
          variant: "destructive"
        });
      }
    } else {
      toast({ title: "Deletion Cancelled", description: `Deletion of partner ${partnerToDelete.name} was cancelled.`, variant: "default" });
      console.log(`[PartnersPage] handleDeletePartner: User cancelled deletion for partner "${partnerToDelete.name}".`);
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
