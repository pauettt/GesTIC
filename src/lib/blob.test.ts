import { describe, expect, it } from "vitest";

import { isBlobUrl } from "@/lib/blob";

describe("isBlobUrl", () => {
  it("accepta els fitxers del nostre blob store", () => {
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/foto-xyz.jpg")).toBe(true);
  });

  it("rebutja el que no ho és, encara que s'hi assembli", () => {
    expect(isBlobUrl("http://abc123.public.blob.vercel-storage.com/foto.jpg")).toBe(false);
    expect(isBlobUrl("https://evil.com/abc.public.blob.vercel-storage.com/foto.jpg")).toBe(false);
    expect(isBlobUrl("https://abc.public.blob.vercel-storage.com.evil.com/foto.jpg")).toBe(false);
    expect(isBlobUrl("javascript:alert(1)")).toBe(false);
    expect(isBlobUrl("no és una adreça")).toBe(false);
  });
});
