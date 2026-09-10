import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <SearchXIcon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Aquesta pàgina no existeix</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Potser l&apos;element s&apos;ha eliminat o no hi tens accés.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>
        Torna a l&apos;inici
      </Button>
    </div>
  );
}
