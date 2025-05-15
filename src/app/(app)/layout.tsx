import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteSidebarNavigation } from "@/components/layout/SiteSidebarNavigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SiteSidebarNavigation />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
