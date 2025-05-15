import type { AssignOrderOutput } from "@/ai/flows/smart-order-assignment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Info } from "lucide-react";

interface AssignmentResultCardProps {
  result: AssignOrderOutput;
}

export function AssignmentResultCard({ result }: AssignmentResultCardProps) {
  return (
    <Card className="w-full max-w-md shadow-lg border-emerald-500">
      <CardHeader className="bg-emerald-50 text-emerald-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6" />
          <CardTitle className="text-xl">Order Assigned Successfully!</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Assigned Partner ID</p>
          <p className="text-lg font-semibold">{result.assignedPartnerId}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Reason for Assignment</p>
          <div className="flex items-start gap-2 mt-1 p-3 bg-secondary rounded-md">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">{result.reason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
