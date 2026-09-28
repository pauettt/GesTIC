"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { navItemsFor } from "@/components/layout/nav-items";

export function AppSidebar({ role, isTutor }: { role: Role; isTutor: boolean }) {
  const pathname = usePathname();
  const items = navItemsFor({ role, isTutor });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex print:hidden">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground text-xs font-bold shadow-xs transition-transform group-hover:scale-105">
            gT
          </span>
          <span>gesTIC</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-105", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
