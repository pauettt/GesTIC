import { CircleCheckIcon } from "lucide-react";

/** Confirmació que es queda a la pantalla, a diferència d'un toast, que en un mòbil passa desapercebut. */
export function SuccessNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900"
    >
      <CircleCheckIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
