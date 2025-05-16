
"use client"; // Ensure this page is a client component if it wasn't already, or keep it if it was

import { SmartAssignmentForm } from "@/components/assignment/SmartAssignmentForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// A simple loading component for Suspense fallback
function AssignmentFormLoading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-10">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading assignment form...</p>
    </div>
  );
}

export default function AssignmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Smart Order Assignment</h1>
      <Suspense fallback={<AssignmentFormLoading />}>
        <SmartAssignmentForm />
      </Suspense>
    </div>
  );
}
