"use client";

import { enrollInSession, unenrollFromSession } from "@/actions/training";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

export function EnrollButton({
  sessionId,
  isEnrolled,
  isFull,
}: {
  sessionId: string;
  isEnrolled: boolean;
  isFull: boolean;
}) {
  const enroll = useServerAction(enrollInSession, { successMessage: "Inscripció confirmada" });
  const unenroll = useServerAction(unenrollFromSession, { successMessage: "Inscripció cancel·lada" });

  if (isEnrolled) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={unenroll.isPending}
        onClick={() => unenroll.run({ sessionId })}
      >
        Cancel·la la inscripció
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={enroll.isPending || isFull}
      onClick={() => enroll.run({ sessionId })}
    >
      {isFull ? "Sense places" : "Inscriu-t'hi"}
    </Button>
  );
}
