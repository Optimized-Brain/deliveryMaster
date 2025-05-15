
import type { AssignOrderOutput } from "@/ai/flows/smart-order-assignment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle } from "lucide-react";

interface AssignmentResultCardProps {
  suggestion: AssignOrderOutput;
}

export function AssignmentResultCard({ suggestion }: AssignmentResultCardProps) {
  return (
    <Card className={`w-full max-w-md shadow-lg ${suggestion.suggestionMade ? 'border-blue-500' : 'border-amber-500'}`}>
      <CardHeader className={`${suggestion.suggestionMade ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          {suggestion.suggestionMade ? <Lightbulb className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          <CardTitle className="text-xl">{suggestion.suggestionMade ? 'AI Suggestion' : 'AI Analysis'}</CardTitle>
        </div>
        <CardDescription className={`${suggestion.suggestionMade ? 'text-blue-600' : 'text-amber-600'}`}>
          {suggestion.suggestionMade ? "AI recommends the following partner:" : "AI could not identify a suitable partner based on current criteria."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {suggestion.suggestionMade && suggestion.suggestedPartnerId && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Suggested Partner ID</p>
            <p className="text-lg font-semibold">{suggestion.suggestedPartnerId}</p>
          </div>
        )}
        {!suggestion.suggestionMade && (
           <div>
            <p className="text-sm font-medium text-muted-foreground">Details</p>
            <p className="text-sm">The AI was unable to find a suitable partner. Please review available partners and assign manually if appropriate.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
