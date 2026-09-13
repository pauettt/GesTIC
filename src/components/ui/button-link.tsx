import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Enllaç amb aspecte de botó.
 *
 * Abans es feia amb `<Button nativeButton={false} render={<Link />}>`, però Base
 * UI hi posa `role="button"`, i els lectors de pantalla anunciaven com a botons
 * enllaços que porten a una altra pàgina o canvien un filtre. Aquí l'element és
 * un `<a>` i ho continua sent. `current` marca el filtre actiu d'un grup.
 */
export function ButtonLink({
  href,
  variant,
  size,
  current,
  className,
  children,
}: {
  href: Route;
  current?: boolean;
  className?: string;
  children: ReactNode;
} & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}
