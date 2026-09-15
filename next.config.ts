import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // Des de Next 15 el navegador no guarda cap pàgina dinàmica (0 s), i totes
    // ho són perquè llegeixen la sessió: tornar a una secció ja visitada la
    // demanava sencera al servidor i tornava a sortir l'esquelet de càrrega.
    // Durant 30 s es reaprofita. Els canvis propis es veuen igualment, perquè
    // qualsevol Server Action que crida `revalidatePath` buida aquesta memòria;
    // els d'altres persones poden trigar fins a 30 s a sortir si no es recarrega.
    staleTimes: { dynamic: 30 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // Miniatures dels tutorials. Passen per l'optimitzador de Next i se serveixen
      // des del nostre domini: obrir la llista no fa cap petició a YouTube.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
