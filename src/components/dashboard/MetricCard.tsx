import type { Metric } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
        <metric.icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        {metric.change && (
          <p className={cn(
            "text-xs text-muted-foreground",
            metric.changeType === "positive" && "text-emerald-500",
            metric.changeType === "negative" && "text-red-500"
          )}>
            {metric.change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
