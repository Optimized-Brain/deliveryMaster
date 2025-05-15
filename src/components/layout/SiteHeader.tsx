"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  const currentLink = NAV_LINKS.find(link => pathname.startsWith(link.href));
  const pageTitle = currentLink ? currentLink.label : APP_NAME;

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
