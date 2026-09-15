import { describe, expect, it } from "vitest";

import { canSeeCredential, visibleCredentialsWhere } from "@/lib/credentials";

describe("qui veu cada contrasenya", () => {
  const shared = { superAdminOnly: false };
  const restricted = { superAdminOnly: true };

  it("el superadministrador les veu totes", () => {
    expect(canSeeCredential("SUPER_ADMIN", shared)).toBe(true);
    expect(canSeeCredential("SUPER_ADMIN", restricted)).toBe(true);
    expect(visibleCredentialsWhere("SUPER_ADMIN")).toEqual({});
  });

  it("la coordinació TIC no veu les marcades com a només superadministrador", () => {
    expect(canSeeCredential("ADMIN", shared)).toBe(true);
    expect(canSeeCredential("ADMIN", restricted)).toBe(false);
    expect(visibleCredentialsWhere("ADMIN")).toEqual({ superAdminOnly: false });
  });

  it("el professorat i consergeria no en veuen cap", () => {
    for (const role of ["PROFESSOR", "CONSERGERIA"] as const) {
      expect(canSeeCredential(role, shared)).toBe(false);
      expect(visibleCredentialsWhere(role)).toEqual({ id: { in: [] } });
    }
  });
});
