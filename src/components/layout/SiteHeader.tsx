
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  // Check main NAV_LINKS
  let currentLink = NAV_LINKS.find(link => pathname.startsWith(link.href));
  
  let pageTitle = currentLink ? currentLink.label : APP_NAME;
  if (pathname === '/settings') {
    pageTitle = "Settings";
  } else if (!currentLink && pathname !== '/dashboard') { // Adjusted to ensure APP_NAME is default on non-nav pages
    pageTitle = APP_NAME;
  } else if (pathname === '/dashboard' && !currentLink) { // Specifically handle dashboard if not in NAV_LINKS
    pageTitle = "Dashboard";
  }


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <SidebarTrigger className="mr-2" /> {/* Always visible trigger */}
        
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{pageTitle}</h2>
        </div>
        
      </div>
    </header>
  );
}

