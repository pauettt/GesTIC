import type { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { navItemsFor } from "@/components/layout/nav-items";
import { canAccessKeys, canAccessStudentLoans, isAdmin, isConcierge, isSuperAdmin } from "@/lib/roles";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "CONSERGERIA", "PROFESSOR"];
const allowed = (check: (role: Role) => boolean) => ROLES.filter(check);
const hrefs = (role: Role, isTutor = false) => navItemsFor({ role, isTutor }).map((item) => item.href);

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

  it("al préstec a l'alumnat hi entren els tutors/es i la coordinació", () => {
    expect(allowed((role) => canAccessStudentLoans({ role, isTutor: false }))).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(canAccessStudentLoans({ role: "PROFESSOR", isTutor: true })).toBe(true);
  });
});

describe("menú per rol", () => {
  it("consergeria només veu el control de claus", () => {
    expect(hrefs("CONSERGERIA")).toEqual(["/consergeria"]);
  });

  it("el professorat no veu cap pantalla de gestió", () => {
    const professor = hrefs("PROFESSOR");
    expect(professor).toEqual(expect.arrayContaining(["/", "/incidencies", "/chromebooks", "/cites"]));
    for (const href of ["/panell", "/usuaris", "/administracio", "/espais", "/consergeria", "/alumnat"]) {
      expect(professor).not.toContain(href);
    }
  });

  it("el professorat veu el préstec de material on la coordinació veu l'inventari", () => {
    const label = (role: Role) => navItemsFor({ role, isTutor: false }).find((item) => item.href === "/inventari")?.label;
    expect(label("PROFESSOR")).toBe("Préstec de material");
    expect(label("ADMIN")).toBe("Inventari TIC");
    expect(label("SUPER_ADMIN")).toBe("Inventari TIC");
  });

  it("el tutor/a veu el préstec a l'alumnat, a part dels carros", () => {
    expect(hrefs("PROFESSOR", true)).toEqual(expect.arrayContaining(["/chromebooks", "/alumnat"]));
  });

  it("consergeria no veu el préstec a l'alumnat encara que dugui la marca de tutor", () => {
    expect(hrefs("CONSERGERIA", true)).toEqual(["/consergeria"]);
  });

  it("la coordinació gestiona però no reparteix permisos ni administra", () => {
    const admin = hrefs("ADMIN");
    expect(admin).toEqual(expect.arrayContaining(["/panell", "/espais", "/consergeria", "/alumnat"]));
    expect(admin).not.toContain("/usuaris");
    expect(admin).not.toContain("/administracio");
  });

  it("el superadministrador ho veu tot", () => {
    expect(hrefs("SUPER_ADMIN")).toEqual(expect.arrayContaining(["/usuaris", "/administracio"]));
  });
});
