
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  // Check main NAV_LINKS
  let currentLink = NAV_LINKS.find(link => pathname.startsWith(link.href));
  
  // If not found in main NAV_LINKS, check if it's the settings page
  let pageTitle = currentLink ? currentLink.label : APP_NAME;
  if (pathname === '/settings') {
    pageTitle = "Settings";
  } else if (!currentLink) { // Fallback if not in NAV_LINKS and not /settings
    pageTitle = APP_NAME; // Or derive from pathname if more specific logic is needed
  }


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          {/* Placeholder for potential logo/brand icon if Sidebar is collapsed */}
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <h1 className="text-xl font-semibold md:hidden">{APP_NAME}</h1>
          <h2 className="text-lg font-medium hidden md:block">{pageTitle}</h2>
          <nav className="flex items-center">
            {/* Placeholder for User Profile Dropdown */}
          </nav>
        </div>
      </div>
    </header>
  );
}
