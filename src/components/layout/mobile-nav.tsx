"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navSectionsFor } from "@/components/layout/nav-items";

export function MobileNav({ role, isTutor }: { role: Role; isTutor: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = navSectionsFor({ role, isTutor });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Obre el menú de navegació"
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Menú de navegació</SheetTitle>
        <div className="flex h-14 items-center gap-2.5 border-b px-6 text-lg font-bold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground text-xs font-bold shadow-xs">
            gT
          </span>
          <span>gesTIC</span>
        </div>
        <nav className="space-y-4 overflow-y-auto p-3">
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
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-primary-foreground" : item.iconColor ?? "text-muted-foreground",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
