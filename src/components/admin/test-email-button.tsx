"use client";

import { MailIcon } from "lucide-react";

import { sendTestEmail } from "@/actions/admin";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function TestEmailButton({ disabled }: { disabled: boolean }) {
  const { run, isPending } = useServerAction(sendTestEmail, {
    successMessage: "Correu enviat: mira la teva bústia",
  });

  return (
    <Button variant="outline" size="sm" disabled={disabled || isPending} onClick={() => run(undefined)}>
      <MailIcon className="size-4" />
      {isPending ? "Enviant…" : "Envia'm un correu de prova"}
    </Button>
  );
}
