/**
 * Qui pot entrar amb Google i com a quin usuari. Va a part de `auth.ts` perquè
 * són regles pures i es poden provar sense Auth.js ni base de dades.
 */

export type GoogleSignInRejection =
  | "domain-not-configured"
  | "outside-domain"
  | "not-workspace-account"
  | "linked-to-another-user";

export type GoogleSignInVerdict =
  | { allowed: true; email: string }
  | { allowed: false; reason: GoogleSignInRejection };

export function checkGoogleSignIn({
  googleEmail,
  hostedDomain,
  userEmail,
  workspaceDomain,
  adminEmails = [],
}: {
  /** Correu del compte de Google amb què s'entra. */
  googleEmail: string | null | undefined;
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

  // Els superadministradors designats a ADMIN_EMAILS poden tenir compte extern (p. ex. @gmail.com)
  const isSuperAdmin = adminEmails?.includes(email);

  if (!isSuperAdmin) {
    if (!email.endsWith(`@${workspaceDomain}`)) {
      return { allowed: false, reason: "outside-domain" };
    }

    // Google només posa `hd` als comptes gestionats per una organització de
    // Workspace. Un compte personal de Google creat amb una adreça del centre
    // passaria el filtre del correu, però no porta `hd`.
    if (typeof hostedDomain !== "string" || !hostedDomain) {
      return { allowed: false, reason: "not-workspace-account" };
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
