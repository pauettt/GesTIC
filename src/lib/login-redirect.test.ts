import { describe, expect, it } from "vitest";

import { loginPath } from "@/lib/login-redirect";

describe("loginPath", () => {
  it("torna on s'anava, amb la consulta inclosa", () => {
    expect(loginPath("/q/carro/abc")).toBe("/login?callbackUrl=%2Fq%2Fcarro%2Fabc");
    expect(loginPath("/chromebooks/abc?week=2026-09-14")).toBe(
      "/login?callbackUrl=%2Fchromebooks%2Fabc%3Fweek%3D2026-09-14",
    );
  });

  it("sense un camí intern, porta a l'inici de sessió a seques", () => {
    expect(loginPath(null)).toBe("/login");
    expect(loginPath("")).toBe("/login");
    expect(loginPath("https://exemple.com/q/carro/abc")).toBe("/login");
    expect(loginPath("//exemple.com")).toBe("/login");
    expect(loginPath("/\\exemple.com")).toBe("/login");
  });
});
