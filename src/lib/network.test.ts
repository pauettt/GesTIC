import { describe, expect, it } from "vitest";

import { compareIPs, freeRanges, normalizeIPv4, summarizeSubnets } from "@/lib/network";

describe("normalizeIPv4", () => {
  it("accepta una IPv4 i en treu els espais i els zeros de davant", () => {
    expect(normalizeIPv4(" 10.1.2.3 ")).toBe("10.1.2.3");
    expect(normalizeIPv4("192.168.001.010")).toBe("192.168.1.10");
    expect(normalizeIPv4("10.0.0.0")).toBe("10.0.0.0");
  });

  it("rebutja el que no ho és", () => {
    expect(normalizeIPv4("10.1.2")).toBeNull();
    expect(normalizeIPv4("10.1.2.256")).toBeNull();
    expect(normalizeIPv4("10.1.2.a")).toBeNull();
    expect(normalizeIPv4("10.1..3")).toBeNull();
    expect(normalizeIPv4("")).toBeNull();
  });
});

describe("compareIPs", () => {
  it("ordena com a números, no com a text", () => {
    expect(["10.0.0.10", "10.0.0.9", "9.255.0.1"].sort(compareIPs)).toEqual(["9.255.0.1", "10.0.0.9", "10.0.0.10"]);
  });
});

describe("freeRanges", () => {
  it("agrupa les lliures en trams, sense la .0 ni la .255", () => {
    const hosts = Array.from({ length: 254 }, (_, index) => index + 1).filter((host) => ![5, 6, 7, 200].includes(host));
    expect(freeRanges(hosts)).toEqual([
      { from: 5, to: 7 },
      { from: 200, to: 200 },
    ]);
    expect(freeRanges([])).toEqual([{ from: 1, to: 254 }]);
  });
});

describe("summarizeSubnets", () => {
  it("una entrada per /24 en ús, amb la primera lliure", () => {
    expect(summarizeSubnets(["10.1.2.1", "10.1.2.2", "10.1.2.10", "10.1.1.50"])).toEqual([
      {
        subnet: "10.1.1",
        used: 1,
        free: 253,
        firstFree: "10.1.1.1",
        freeRanges: ["10.1.1.1 – 10.1.1.49", "10.1.1.51 – 10.1.1.254"],
      },
      {
        subnet: "10.1.2",
        used: 3,
        free: 251,
        firstFree: "10.1.2.3",
        freeRanges: ["10.1.2.3 – 10.1.2.9", "10.1.2.11 – 10.1.2.254"],
      },
    ]);
  });
});
