import { requireUser } from "@/lib/permissions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6 print:hidden">
          <MobileNav role={user.role} />
          <span className="font-semibold md:hidden">CoordTIC</span>
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6 print:bg-white print:p-0">{children}</main>
      </div>
    </div>
  );
}
