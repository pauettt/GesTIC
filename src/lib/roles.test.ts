import type { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { navItemsForRole } from "@/components/layout/nav-items";
import { canAccessKeys, isAdmin, isConcierge, isSuperAdmin } from "@/lib/roles";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "CONSERGERIA", "PROFESSOR"];
const allowed = (check: (role: Role) => boolean) => ROLES.filter(check);
const hrefs = (role: Role) => navItemsForRole(role).map((item) => item.href);

describe("comprovacions de rol", () => {
  it("la coordinació TIC inclou el superadministrador", () => {
    expect(allowed(isAdmin)).toEqual(["SUPER_ADMIN", "ADMIN"]);
  });

  it("només el superadministrador reparteix permisos", () => {
    expect(allowed(isSuperAdmin)).toEqual(["SUPER_ADMIN"]);
  });

  it("consergeria no és mai coordinació", () => {
    expect(allowed(isConcierge)).toEqual(["CONSERGERIA"]);
    expect(isAdmin("CONSERGERIA")).toBe(false);
  });

  it("les claus les porten consergeria i la coordinació, no el professorat", () => {
    expect(allowed(canAccessKeys)).toEqual(["SUPER_ADMIN", "ADMIN", "CONSERGERIA"]);
  });
});

describe("menú per rol", () => {
  it("consergeria només veu el control de claus", () => {
    expect(hrefs("CONSERGERIA")).toEqual(["/consergeria"]);
  });

  it("el professorat no veu cap pantalla de gestió", () => {
    const professor = hrefs("PROFESSOR");
    expect(professor).toEqual(expect.arrayContaining(["/", "/incidencies", "/chromebooks", "/cites"]));
    for (const href of ["/panell", "/usuaris", "/administracio", "/espais", "/consergeria"]) {
      expect(professor).not.toContain(href);
    }
  });

  it("la coordinació gestiona però no reparteix permisos ni administra", () => {
    const admin = hrefs("ADMIN");
    expect(admin).toEqual(expect.arrayContaining(["/panell", "/espais", "/consergeria"]));
    expect(admin).not.toContain("/usuaris");
    expect(admin).not.toContain("/administracio");
  });

  it("el superadministrador ho veu tot", () => {
    expect(hrefs("SUPER_ADMIN")).toEqual(expect.arrayContaining(["/usuaris", "/administracio"]));
  });
});
