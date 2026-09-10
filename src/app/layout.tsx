import type { Metadata } from "next";
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
  description: "Coordinació TIC del centre: incidències, inventari, Chromebooks, formació i tutorials.",
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
