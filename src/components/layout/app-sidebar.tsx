"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { navSectionsFor } from "@/components/layout/nav-items";

export function AppSidebar({ role, isTutor }: { role: Role; isTutor: boolean }) {
  const pathname = usePathname();
  const sections = navSectionsFor({ role, isTutor });

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
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.key} className="space-y-1">
            {sections.length > 1 && (
              <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      active
                        ? "text-primary-foreground"
                        : item.iconColor ?? "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
