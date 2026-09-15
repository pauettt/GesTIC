import { afterEach, describe, expect, it, vi } from "vitest";

import { lookupYoutubeVideo, parseYoutubeId } from "@/lib/youtube";

const ID = "jNQXAC9IVRw";

describe("parseYoutubeId", () => {
  it("reconeix els enllaços tal com es copien de YouTube", () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}?si=abc123`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `youtube.com/watch?v=${ID}`,
      `  https://youtu.be/${ID}  `,
    ]) {
      expect(parseYoutubeId(url), url).toBe(ID);
    }
  });

  it("rebutja el que no és un vídeo de YouTube", () => {
    for (const value of [
      "",
      "Crear una classe",
      ID,
      "https://vimeo.com/123456789",
      "https://www.youtube.com/@canal",
      "https://www.youtube.com/playlist?list=PL123",
      "https://www.youtube.com/watch?v=curt",
      `https://evil.com/watch?v=${ID}`,
      `https://youtube.com.evil.com/watch?v=${ID}`,
      "javascript:alert(1)",
    ]) {
      expect(parseYoutubeId(value), value).toBeNull();
    }
  });
});

describe("lookupYoutubeVideo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("torna el títol d'un vídeo que es pot veure", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ title: "  Crear una classe  " }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupYoutubeVideo(ID)).resolves.toEqual({ ok: true, title: "Crear una classe" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(encodeURIComponent(`watch?v=${ID}`));
  });

  it("un vídeo privat o esborrat no es pot desar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unauthorized", { status: 401 })));

    await expect(lookupYoutubeVideo(ID)).resolves.toMatchObject({ ok: false });
  });

  it("si YouTube no respon, ho diu en comptes de petar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(lookupYoutubeVideo(ID)).resolves.toMatchObject({ ok: false });
  });
});
