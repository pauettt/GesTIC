import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// next/font descarrega i serveix la tipografia des del nostre domini: no hi ha
// cap petició a Google des del navegador del professorat.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  // Cada pàgina posa el seu títol i queda "Inventari TIC · gesTIC" a la
  // pestanya: amb diverses obertes alhora, es distingeixen d'un cop d'ull.
  title: { default: "gesTIC", template: "%s · gesTIC" },
  description: "Coordinació TIC del centre: incidències, inventari, carros i tutorials.",
  // En afegir-la a la pantalla d'inici, l'iPhone proposa aquest nom en comptes
  // del títol de la pàgina on s'és («Inicia sessió · gesTIC»).
  appleWebApp: { title: "gesTIC" },
};

// La barra d'estat del mòbil agafa el color de la capçalera de l'aplicació.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ca" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
