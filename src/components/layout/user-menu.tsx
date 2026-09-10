"use client";

import { useTransition } from "react";
import { ChevronDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { Role } from "@prisma/client";

import { signOutAction } from "@/actions/auth";
import { roleLabels } from "@/lib/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
};

function initials(name?: string | null, email?: string | null) {
  const source = name ?? email ?? "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}
      >
        <Avatar className="size-8">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">
          {user.name ?? user.email}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{user.name ?? user.email}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {roleLabels[user.role]}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Aparença
          </DropdownMenuLabel>
          <DropdownMenuRadioItem value="light">
            <SunIcon className="size-4" />
            Clar
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon className="size-4" />
            Fosc
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon className="size-4" />
            Com el sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => startTransition(() => signOutAction())}
        >
          <LogOutIcon className="size-4" />
          Tanca la sessió
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
