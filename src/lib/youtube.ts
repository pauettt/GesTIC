/**
 * Vídeos de YouTube dels tutorials. De cada vídeo només es guarda
 * l'identificador: l'enllaç, la miniatura i el reproductor se'n deriven.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const PATH_KINDS = new Set(["shorts", "embed", "live", "v"]);

/**
 * Identificador del vídeo a partir de l'enllaç tal com es copia de YouTube:
 * `watch?v=`, `youtu.be/`, `shorts/`, `embed/` o `live/`. Qualsevol altra cosa
 * (un canal, una llista de reproducció, un altre domini) torna `null`.
 */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  let candidate: string | null | undefined = null;
  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else {
      const [, kind, id] = url.pathname.split("/");
      if (PATH_KINDS.has(kind)) candidate = id;
    }
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Mode de privadesa millorada: YouTube no desa res al navegador fins que es
 * reprodueix. `hl=ca` posa els controls del reproductor en català.
 */
export function youtubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&hl=ca`;
}

/** `hqdefault` existeix per a tots els vídeos; `maxresdefault`, no. */
export function youtubeThumbnailUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export type YoutubeLookup = { ok: true; title: string } | { ok: false; error: string };

/**
 * Títol del vídeo, amb l'oEmbed públic de YouTube (no demana clau). Un vídeo
 * privat o esborrat hi respon amb error, i així es detecta en desar-lo i no
 * quan algú el vol mirar. Els vídeos ocults (no llistats) hi responen bé.
 */
export async function lookupYoutubeVideo(id: string): Promise<YoutubeLookup> {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchUrl(id))}`;

  let response: Response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  } catch {
    return { ok: false, error: "No s'ha pogut consultar YouTube. Torna-ho a provar d'aquí a una estona." };
  }
  if (!response.ok) {
    return { ok: false, error: "YouTube no deixa veure aquest vídeo: és privat o s'ha esborrat." };
  }

  const data: unknown = await response.json().catch(() => null);
  const title =
    typeof data === "object" && data !== null && "title" in data && typeof data.title === "string"
      ? data.title.trim()
      : "";
  return title ? { ok: true, title } : { ok: false, error: "YouTube no ha tornat el títol del vídeo." };
}
