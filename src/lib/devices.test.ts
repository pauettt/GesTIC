import { describe, expect, it } from "vitest";

import { deviceCount, deviceSummary, parseDeviceType } from "@/lib/devices";

describe("recompte de dispositius", () => {
  it("diu què porta un carro, en singular o plural", () => {
    expect(deviceCount("CHROMEBOOK", 1)).toBe("1 Chromebook");
    expect(deviceCount("PORTATIL", 3)).toBe("3 portàtils");
    expect(deviceCount("ALTRE", 2)).toBe("2 altres dispositius");
  });

  it("un carro mixt es resumeix per tipus, sempre en el mateix ordre", () => {
    const devices = [
      { deviceType: "IPAD" as const },
      { deviceType: "CHROMEBOOK" as const },
      { deviceType: "CHROMEBOOK" as const },
    ];
    expect(deviceSummary(devices)).toBe("2 Chromebooks · 1 iPad");
    expect(deviceSummary([])).toBe("");
  });
});

describe("parseDeviceType", () => {
  it("reconeix el tipus tal com s'escriu en un full", () => {
    expect(parseDeviceType("Chromebook Spin 511")).toBe("CHROMEBOOK");
    expect(parseDeviceType("iPad 9a gen.")).toBe("IPAD");
    expect(parseDeviceType("Portátil HP")).toBe("PORTATIL");
    expect(parseDeviceType("Tablet Samsung")).toBe("TAULETA");
  });

  it("una cel·la buida no diu res, i una altra cosa és un altre dispositiu", () => {
    expect(parseDeviceType("  ")).toBeNull();
    expect(parseDeviceType("Càmera de documents")).toBe("ALTRE");
  });
});
