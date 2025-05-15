"use client";

import React, { useState } from 'react';
import { PartnerTable } from "@/components/partners/PartnerTable";
import { PartnerRegistrationForm } from "@/components/partners/PartnerRegistrationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SAMPLE_PARTNERS } from "@/lib/constants";
import type { Partner } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnersPage() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>(SAMPLE_PARTNERS); // In real app, this would be fetched and updatable
  const [activeTab, setActiveTab] = useState<string>("list");


  const handleEditPartner = (partnerId: string) => {
    toast({ title: "Edit Partner", description: `Editing partner ${partnerId}` });
    // Logic to show edit form or navigate
  };

  const handleDeletePartner = (partnerId: string) => {
    if (window.confirm("Are you sure you want to delete this partner?")) {
      setPartners(prev => prev.filter(p => p.id !== partnerId));
      toast({ title: "Partner Deleted", description: `Partner ${partnerId} has been deleted.`, variant: "destructive" });
    }
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
          <PartnerTable 
            partners={partners} 
            onEditPartner={handleEditPartner} 
            onDeletePartner={handleDeletePartner} 
          />
        </TabsContent>
        <TabsContent value="register" className="mt-6">
          <PartnerRegistrationForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
