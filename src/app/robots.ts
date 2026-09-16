import type { MetadataRoute } from "next";

/**
 * gesTIC no ha de sortir a cap cerca: és de portes endins del centre. L'única
 * pàgina que un cercador pot arribar a veure és la d'inici de sessió, perquè la
 * resta hi redirigeix, però ni tan sols aquesta hi ha de sortir.
 *
 * Això demana que no s'hi entri. La capçalera `X-Robots-Tag: noindex` de
 * `next.config.ts` hi va a sobre i cobreix el cas que un cercador hi arribi
 * igualment, per exemple si algú enganxa l'enllaç en una pàgina pública: llavors
 * el fitxer no l'atura, però la capçalera li diu que no l'indexi.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
