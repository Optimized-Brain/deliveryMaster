
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
      </header>

      <Separator />

      <section id="appearance" className="space-y-6">
        <h2 className="text-2xl font-semibold">Appearance</h2>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Select your preferred theme for the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>
      </section>

      {/* Future settings sections can be added here */}
      {/* 
      <Separator />
      <section id="notifications" className="space-y-6">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Manage your email notification preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification settings coming soon.</p>
          </CardContent>
        </Card>
      </section> 
      */}
    </div>
  );
}
