import type { Route } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type QueueItem = {
  id: string;
  href: Route;
  main: string;
  meta: string;
  badge: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } | null;
};

/** Una llista de feina pendent: què és, de qui i quan, amb enllaç per resoldre-ho. */
export function WorkQueue({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: QueueItem[];
  empty: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {items.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.main}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                  </span>
                  {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
