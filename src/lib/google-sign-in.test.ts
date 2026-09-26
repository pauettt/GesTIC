import { describe, expect, it } from "vitest";

import { checkGoogleSignIn } from "@/lib/google-sign-in";

type Input = Parameters<typeof checkGoogleSignIn>[0];

const COORDTIC: Input = {
  googleEmail: "coordtic@iesjmthomas.eu",
  hostedDomain: "iesjmthomas.eu",
  userEmail: "coordtic@iesjmthomas.eu",
  workspaceDomain: "iesjmthomas.eu",
};

const rejection = (overrides: Partial<Input>) => {
  const verdict = checkGoogleSignIn({ ...COORDTIC, ...overrides });
  return verdict.allowed ? null : verdict.reason;
};

describe("entrada amb Google", () => {
  it("un compte del Workspace entra com el seu propi usuari", () => {
    expect(checkGoogleSignIn(COORDTIC)).toEqual({
      allowed: true,
      email: "coordtic@iesjmthomas.eu",
    });
  });

  it("les majúscules del correu no compten", () => {
    expect(checkGoogleSignIn({ ...COORDTIC, googleEmail: "CoordTIC@IESJMTHOMAS.EU" })).toEqual({
      allowed: true,
      email: "coordtic@iesjmthomas.eu",
    });
  });

  it("sense domini configurat no entra ningú", () => {
    expect(rejection({ workspaceDomain: undefined })).toBe("domain-not-configured");
  });

  it("els correus d'un altre domini no entren, tampoc els que només hi acaben igual", () => {
    expect(rejection({ googleEmail: "coordtic@gmail.com" })).toBe("outside-domain");
    expect(rejection({ googleEmail: "coordtic@noiesjmthomas.eu" })).toBe("outside-domain");
    expect(rejection({ googleEmail: null })).toBe("outside-domain");
  });

  it("un compte personal de Google amb una adreça del centre no entra", () => {
    expect(rejection({ hostedDomain: undefined })).toBe("not-workspace-account");
    expect(rejection({ hostedDomain: "" })).toBe("not-workspace-account");
  });

  it("un compte de Google vinculat a l'usuari d'una altra persona no hi entra", () => {
    // El que va passar el 2026-09-13: el compte de coordtic va quedar vinculat a
    // l'usuari d'un professor i hi entrava amb els seus permisos.
    expect(rejection({ userEmail: "ptarazona@iesjmthomas.eu" })).toBe("linked-to-another-user");
  });

  describe("superadministradors de fora del domini (ADMIN_EMAILS)", () => {
    const GMAIL_ADMIN: Input = {
      googleEmail: "pauettt@gmail.com",
      emailVerified: true,
      hostedDomain: undefined,
      userEmail: "pauettt@gmail.com",
      workspaceDomain: "iesjmthomas.eu",
      adminEmails: ["pauettt@gmail.com"],
    };
    const external = (overrides: Partial<Input>) => {
      const verdict = checkGoogleSignIn({ ...GMAIL_ADMIN, ...overrides });
      return verdict.allowed ? null : verdict.reason;
    };

    it("un @gmail.com de la llista entra", () => {
      expect(checkGoogleSignIn(GMAIL_ADMIN)).toEqual({ allowed: true, email: "pauettt@gmail.com" });
    });

    it("un @gmail.com que no és a la llista no entra", () => {
      expect(external({ googleEmail: "altre@gmail.com", userEmail: "altre@gmail.com" })).toBe(
        "outside-domain",
      );
    });

    it("sense el correu verificat per Google no entra", () => {
      expect(external({ emailVerified: false })).toBe("unverified-external-account");
      expect(external({ emailVerified: undefined })).toBe("unverified-external-account");
    });

    it("un compte de Google fet amb l'adreça d'un altre proveïdor no entra", () => {
      // Google no n'és el propietari: l'adreça podria haver canviat de mans.
      const outlook = "pau@outlook.com";
      expect(external({ googleEmail: outlook, userEmail: outlook, adminEmails: [outlook] })).toBe(
        "unverified-external-account",
      );
    });

    it("un compte de Workspace d'una altra organització sí que entra", () => {
      const other = "pau@altrecentre.cat";
      expect(
        external({
          googleEmail: other,
          userEmail: other,
          adminEmails: [other],
          hostedDomain: "altrecentre.cat",
        }),
      ).toBeNull();
    });

    it("un superadmin del domini del centre ha de ser igualment un compte de Workspace", () => {
      expect(rejection({ adminEmails: ["coordtic@iesjmthomas.eu"], hostedDomain: undefined })).toBe(
        "not-workspace-account",
      );
    });
  });
});
