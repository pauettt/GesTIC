/**
 * Qui pot entrar amb Google i com a quin usuari. Va a part de `auth.ts` perquè
 * són regles pures i es poden provar sense Auth.js ni base de dades.
 */

export type GoogleSignInRejection =
  | "domain-not-configured"
  | "outside-domain"
  | "not-workspace-account"
  | "unverified-external-account"
  | "linked-to-another-user";

export type GoogleSignInVerdict =
  | { allowed: true; email: string }
  | { allowed: false; reason: GoogleSignInRejection };

export function checkGoogleSignIn({
  googleEmail,
  emailVerified,
  hostedDomain,
  userEmail,
  workspaceDomain,
  adminEmails = [],
}: {
  /** Correu del compte de Google amb què s'entra. */
  googleEmail: string | null | undefined;
  /** Camp `email_verified` del perfil de Google. */
  emailVerified?: unknown;
  /** Camp `hd` del perfil de Google. */
  hostedDomain: unknown;
  /**
   * Correu de l'usuari de gesTIC amb qui Auth.js hi farà entrar. Si el compte
   * de Google ja està vinculat, és el de la base de dades i no el de Google.
   */
  userEmail: string | null | undefined;
  /** `GOOGLE_WORKSPACE_DOMAIN`, en minúscules. */
  workspaceDomain: string | undefined;
  /** Correus de superadministradors (`ADMIN_EMAILS`), en minúscules. */
  adminEmails?: string[];
}): GoogleSignInVerdict {
  // Sense domini configurat no entra ningú. Abans, si la variable faltava,
  // el filtre se saltava i qualsevol compte de Google entrava com a
  // professorat: un oblit a Vercel obria l'aplicació a tothom sense que res
  // ho fes notar. Així, l'error surt el primer cop que algú prova d'entrar.
  if (!workspaceDomain) return { allowed: false, reason: "domain-not-configured" };

  const email = googleEmail?.toLowerCase();
  if (!email) return { allowed: false, reason: "outside-domain" };

  const hasHostedDomain = typeof hostedDomain === "string" && hostedDomain !== "";

  if (email.endsWith(`@${workspaceDomain}`)) {
    // Google només posa `hd` als comptes gestionats per una organització de
    // Workspace. Un compte personal de Google creat amb una adreça del centre
    // passaria el filtre del correu, però no porta `hd`. Val també per als
    // superadministradors del domini: són els comptes que més cal protegir.
    if (!hasHostedDomain) return { allowed: false, reason: "not-workspace-account" };
  } else {
    // De fora del domini només hi entren els superadministradors d'ADMIN_EMAILS
    // (p. ex. un @gmail.com).
    if (!adminEmails.includes(email)) return { allowed: false, reason: "outside-domain" };

    // Sense `hd`, el Workspace del centre ja no avala el compte: només es pot
    // confiar en el correu si Google n'és el propietari. Ho és d'un @gmail.com
    // i d'un compte de Workspace (amb `hd`), i ha de dir que l'ha verificat. Un
    // compte de Google fet amb una adreça d'un altre proveïdor no ho compleix.
    const googleOwnsAddress = email.endsWith("@gmail.com") || hasHostedDomain;
    if (emailVerified !== true || !googleOwnsAddress) {
      return { allowed: false, reason: "unverified-external-account" };
    }
  }

  // Un compte de Google només entra com l'usuari del seu mateix correu. Si ha
  // quedat vinculat a l'usuari d'una altra persona, entrar-hi donaria els
  // permisos de l'altre sense que res ho fes notar. El preu: si el centre canvia
  // el correu d'algú a Workspace, aquell compte no entra fins que es corregeix
  // la base de dades.
  if (userEmail?.toLowerCase() !== email) {
    return { allowed: false, reason: "linked-to-another-user" };
  }

  return { allowed: true, email };
}
