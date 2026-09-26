"use client";

import { CheckIcon } from "lucide-react";

import { dismissEmailFailures } from "@/actions/email-failures";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function DismissEmailFailuresButton({ upToId }: { upToId: string }) {
  const { run, isPending } = useServerAction(dismissEmailFailures, {
    successMessage: "Avís de correus tret",
  });

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={() => run({ upToId })}>
      <CheckIcon className="size-4" />
      Ja està revisat
    </Button>
  );
}
