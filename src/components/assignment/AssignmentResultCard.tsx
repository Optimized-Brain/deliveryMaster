
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, UserCheck, XCircle } from "lucide-react";

interface AssignmentSuggestion {
  suggestedPartnerName?: string;
  reason?: string;
  suggestionMade: boolean;
}

interface AssignmentResultCardProps {
  suggestion: AssignmentSuggestion | null;
}

export function AssignmentResultCard({ suggestion }: AssignmentResultCardProps) {
  if (!suggestion) {
    return null;
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-md mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          <CardTitle>AI Suggestion</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {suggestion.suggestionMade && suggestion.suggestedPartnerName ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              <p className="text-lg font-semibold">
                Suggested Partner: <span className="text-primary">{suggestion.suggestedPartnerName}</span>
              </p>
            </div>
            {suggestion.reason && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Reasoning:</span> {suggestion.reason}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <p className="text-lg font-semibold">No specific partner suggested.</p>
            </div>
            {suggestion.reason && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Reasoning:</span> {suggestion.reason}
              </p>
            )}
             <p className="text-xs text-muted-foreground mt-2">You can still manually select a partner below.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
