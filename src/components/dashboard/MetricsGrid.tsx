import type { Metric } from "@/lib/types";
import { MetricCard } from "./MetricCard";

interface MetricsGridProps {
  metrics: Metric[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  if (!metrics || metrics.length === 0) {
    return <p>No metrics to display.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
