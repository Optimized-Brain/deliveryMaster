
"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const themes = [
    { name: "Light", value: "light", icon: Sun },
    { name: "Dark", value: "dark", icon: Moon },
    { name: "System", value: "system", icon: Laptop },
  ];

  return (
    <div className="flex space-x-2 rounded-md bg-muted p-1">
      {themes.map((t) => (
        <Button
          key={t.value}
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-center gap-2",
            theme === t.value && "bg-background shadow-sm text-foreground"
          )}
          onClick={() => setTheme(t.value)}
        >
          <t.icon className="h-4 w-4" />
          {t.name}
        </Button>
      ))}
    </div>
  );
}
