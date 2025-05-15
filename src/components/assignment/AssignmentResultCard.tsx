
import type { AssignOrderOutput } from "@/ai/flows/smart-order-assignment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Info } from "lucide-react"; // Changed icon

interface AssignmentResultCardProps {
  suggestion: AssignOrderOutput; // Renamed prop
}

export function AssignmentResultCard({ suggestion }: AssignmentResultCardProps) {
  return (
    <Card className="w-full max-w-md shadow-lg border-blue-500"> {/* Changed border color */}
      <CardHeader className="bg-blue-50 text-blue-700 rounded-t-lg"> {/* Changed colors */}
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6" /> {/* Changed icon */}
          <CardTitle className="text-xl">AI Suggestion</CardTitle> {/* Changed title */}
        </div>
        <CardDescription className="text-blue-600">Here's what our AI recommends for this order:</CardDescription> {/* Added description */}
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Suggested Partner ID</p> {/* Changed text */}
          <p className="text-lg font-semibold">{suggestion.suggestedPartnerId}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">AI's Reasoning</p> {/* Changed text */}
          <div className="flex items-start gap-2 mt-1 p-3 bg-secondary rounded-md">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">{suggestion.reason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
