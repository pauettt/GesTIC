import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Les proves corren en una zona horària llunyana a propòsit. Les dates del
// centre s'han de calcular sempre en hora d'Espanya, i si algun helper depengués
// de la zona del servidor (a Vercel és UTC), aquí fallaria.
process.env.TZ = "America/Los_Angeles";

/**
 * Proves unitàries de les regles pures: dates, estats, permisos i validacions.
 * Les pàgines i els fluxos sencers es proven amb Playwright (carpeta `e2e/`),
 * perquè Vitest no sap renderitzar Server Components asíncrons.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
