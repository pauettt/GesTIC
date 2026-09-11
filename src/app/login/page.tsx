import Image from "next/image";

import { signInWithGoogle } from "@/actions/auth";
import { devLogin } from "@/actions/dev-login";
import { isDevLoginEnabled } from "@/lib/dev-login-enabled";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Inicia sessió" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold">
            TIC
          </div>
          <CardTitle className="text-xl">gesTIC</CardTitle>
          <CardDescription>
            Coordinació TIC del centre: incidències, inventari, Chromebooks,
            formació i tutorials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGoogle}>
            <input
              type="hidden"
              name="callbackUrl"
              value={typeof callbackUrl === "string" ? callbackUrl : "/"}
            />
            <Button type="submit" className="w-full" size="lg">
              <Image
                src="/google.svg"
                alt=""
                width={18}
                height={18}
                className="mr-2"
              />
              Inicia sessió amb Google
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Només comptes del domini institucional del centre.
          </p>

          {isDevLoginEnabled() && (
            <>
              <Separator className="my-4" />
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Previsualització local (no disponible en producció)
              </p>
              <div className="flex flex-col gap-2">
                <form action={devLogin.bind(null, "SUPER_ADMIN")}>
                  <Button type="submit" variant="outline" className="w-full">
                    Super admin
                  </Button>
                </form>
                <div className="flex gap-2">
                  <form action={devLogin.bind(null, "ADMIN")} className="flex-1">
                    <Button type="submit" variant="outline" className="w-full">
                      Coordinador/a TIC
                    </Button>
                  </form>
                  <form action={devLogin.bind(null, "CONSERGERIA")} className="flex-1">
                    <Button type="submit" variant="outline" className="w-full">
                      Consergeria
                    </Button>
                  </form>
                </div>
                <div className="flex gap-2">
                  <form action={devLogin.bind(null, "PROFESSOR")} className="flex-1">
                    <Button type="submit" variant="outline" className="w-full">
                      Professorat 1
                    </Button>
                  </form>
                  <form action={devLogin.bind(null, "PROFESSOR_2")} className="flex-1">
                    <Button type="submit" variant="outline" className="w-full">
                      Professorat 2
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
