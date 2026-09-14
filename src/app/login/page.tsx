import Image from "next/image";

import { signInWithGoogle } from "@/actions/auth";
import { devLogin } from "@/actions/dev-login";
import { isDevLoginEnabled } from "@/lib/dev-login-enabled";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Inicia sessió" };

// Auth.js torna aquí amb `?error=` quan l'inici de sessió falla. Sense cap avís
// la pantalla es veia idèntica i semblava que calia entrar dues vegades. El cas
// habitual és `Configuration`: les cookies de l'OAuth caduquen als 15 minuts, i
// qui s'entreté a la pantalla de Google (contrasenya, clau d'accés) en torna
// sense poder completar l'entrada. El detall de l'error queda als logs.
function loginErrorMessage(error: string | string[] | undefined) {
  if (typeof error !== "string") return null;
  if (error === "AccessDenied") {
    // També surt quan el superadministrador ha retirat l'accés a algú que ja no
    // és al centre: per això no n'hi ha prou de dir que canviï de compte.
    return "Aquest compte no té accés a gesTIC. Entra amb el compte del centre; si ja ho has fet, parla amb la coordinació TIC.";
  }
  // El posa `auth.ts` quan el compte de Google ha quedat vinculat a l'usuari
  // d'una altra persona. No s'arregla tornant-ho a provar: cal tocar la base de
  // dades.
  if (error === "AccountLinked") {
    return "Aquest compte de Google està associat a l'usuari d'una altra persona. Avisa la coordinació TIC.";
  }
  return "No s'ha pogut completar l'inici de sessió, potser perquè ha passat massa estona a la pantalla de Google. Torna-ho a provar.";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl, error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold">
            TIC
          </div>
          <CardTitle className="text-xl">gesTIC</CardTitle>
          <CardDescription>
            Coordinació TIC del centre: incidències, inventari, Chromebooks i
            tutorials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p role="alert" className="mb-4 text-center text-sm text-destructive">
              {errorMessage}
            </p>
          )}
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
                    Superadministrador/a
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
                <form action={devLogin.bind(null, "PROFESSOR_TUTOR")}>
                  <Button type="submit" variant="outline" className="w-full">
                    Tutor/a
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
