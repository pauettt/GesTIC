import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isConcierge, requireUser } from "@/lib/permissions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  // Consergeria només té una feina a l'aplicació. Amagar-li els enllaços del
  // menú no n'hi ha prou: sense això, escrivint la URL entraria igualment.
  // La condició sobre `pathname` evita un bucle de redireccions si mai faltés
  // la capçalera; les pàgines sensibles ja tenen el seu propi requireAdmin.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (isConcierge(user.role) && pathname && !pathname.startsWith("/consergeria")) {
    redirect("/consergeria");
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6 print:hidden">
          <MobileNav role={user.role} />
          <span className="font-semibold md:hidden">gesTIC</span>
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6 print:bg-white print:p-0">{children}</main>
      </div>
    </div>
  );
}
