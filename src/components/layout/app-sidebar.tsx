"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/components/layout/nav-items";

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex print:hidden">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="text-lg font-semibold">
          gesTIC
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
