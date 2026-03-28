import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import { AppHeader } from "@/components/app-header";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "BreachVector",
  description:
    "BreachVector is an AI-powered website security review app for polished, showcase-ready executive and technical reports.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          bodyFont.variable,
          headingFont.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased"
        )}
      >
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}