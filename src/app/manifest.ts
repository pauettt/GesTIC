import type { MetadataRoute } from "next";

/**
 * Perquè gesTIC es pugui afegir a la pantalla d'inici del mòbil i s'obri com una
 * aplicació, sense la barra del navegador. Les icones surten de
 * `scripts/generate-icons.mjs`; la «maskable» és la que Android retalla amb la
 * forma de cada mòbil.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "gesTIC",
    short_name: "gesTIC",
    description: "Coordinació TIC del centre: incidències, inventari, carros i tutorials.",
    lang: "ca",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Mantenint premuda la icona (Android; l'iPhone no en fa cas). Són els mateixos
    // per a tothom: només hi va el que pot fer qualsevol persona del claustre.
    shortcuts: [
      {
        name: "Nova incidència",
        url: "/incidencies/nova",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Reserva un carro",
        url: "/chromebooks",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
