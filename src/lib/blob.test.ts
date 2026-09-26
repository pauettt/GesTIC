import { describe, expect, it } from "vitest";

import { isBlobUrl, ownBlobHost } from "@/lib/blob";

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

  it("al servidor, només els del nostre store", () => {
    const host = ownBlobHost("vercel_blob_rw_AbC123_secret");
    expect(host).toBe("abc123.public.blob.vercel-storage.com");
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/foto.jpg", host)).toBe(true);
    expect(isBlobUrl("https://altre.public.blob.vercel-storage.com/foto.jpg", host)).toBe(false);
  });

  it("sense token (el navegador) n'hi ha prou amb el domini", () => {
    expect(ownBlobHost(undefined)).toBeNull();
    expect(ownBlobHost("")).toBeNull();
    expect(isBlobUrl("https://altre.public.blob.vercel-storage.com/foto.jpg", null)).toBe(true);
  });
});
