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

  it("un @gmail.com no entra, encara que sigui a ADMIN_EMAILS", () => {
    expect(rejection({ googleEmail: "pauettt@gmail.com", userEmail: "pauettt@gmail.com" })).toBe(
      "outside-domain",
    );
  });
});
