"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isSettings = pathname === "/settings";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5 group">
        {/* Logo mark */}
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">D</span>
        </div>
        <span className="font-semibold text-foreground">Dolittle</span>
        <span className="text-xs text-muted-foreground hidden sm:block">
          AI Brainstorm Coach
        </span>
      </Link>

      <Link
        href="/settings"
        className={cn(
          "p-2 rounded-lg transition-colors",
          isSettings
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" />
      </Link>
    </header>
  );
}
