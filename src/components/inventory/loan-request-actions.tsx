"use client";

import { CheckIcon, MailIcon, RotateCcwIcon, XIcon } from "lucide-react";

import {
  cancelLoanRequest,
  markLoanReturned,
  remindOverdueLoan,
  respondLoanRequest,
} from "@/actions/loans";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function RespondLoanRequestButtons({ id }: { id: string }) {
  const approve = useServerAction(respondLoanRequest, { successMessage: "Préstec aprovat" });
  const reject = useServerAction(respondLoanRequest, { successMessage: "Sol·licitud rebutjada" });

  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={approve.isPending || reject.isPending}
        onClick={() => approve.run({ id, status: "APROVADA" })}
      >
        <CheckIcon className="size-4" />
        Aprova
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={approve.isPending || reject.isPending}
        onClick={() => reject.run({ id, status: "REBUTJADA" })}
      >
        <XIcon className="size-4" />
        Rebutja
      </Button>
    </div>
  );
}

export function MarkLoanReturnedButton({ id }: { id: string }) {
  const { run, isPending } = useServerAction(markLoanReturned, { successMessage: "Préstec marcat com a retornat" });

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => run({ id })}>
      <RotateCcwIcon className="size-4" />
      Marca com retornat
    </Button>
  );
}

export function RemindOverdueLoanButton({ id }: { id: string }) {
  const { run, isPending } = useServerAction(remindOverdueLoan, {
    successMessage: "Recordatori enviat",
  });

  return (
    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run({ id })}>
      <MailIcon className="size-4" />
      {isPending ? "Enviant…" : "Recorda-ho"}
    </Button>
  );
}

export function CancelLoanRequestButton({ id }: { id: string }) {
  const { run, isPending } = useServerAction(cancelLoanRequest, { successMessage: "Sol·licitud cancel·lada" });

  return (
    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run({ id })}>
      Cancel·la
    </Button>
  );
}
