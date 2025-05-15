import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { DASHBOARD_METRICS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <MetricsGrid metrics={DASHBOARD_METRICS} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent orders and partner assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent activity chart or list */}
            <div className="flex items-center justify-center h-64 bg-secondary rounded-md">
              <p className="text-muted-foreground">Recent Activity Chart Coming Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order Processing</span>
              <span className="font-semibold text-emerald-500">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Partner Network</span>
              <span className="font-semibold text-emerald-500">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI Assignment</span>
              <span className="font-semibold text-emerald-500">Active</span>
            </div>
             <Image 
                src="https://placehold.co/600x400.png" 
                alt="System status illustration"
                width={600}
                height={400}
                className="rounded-md mt-4"
                data-ai-hint="system network" 
              />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
