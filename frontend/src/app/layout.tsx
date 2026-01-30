import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS - AI-Powered Life Dashboard",
  description:
    "Your intelligent personal assistant powered by Nova. Capture, process, and get insights from your digital life.",
  keywords: [
    "AI",
    "personal assistant",
    "productivity",
    "life dashboard",
    "Nova",
  ],
  authors: [{ name: "LifeOS" }],
  creator: "LifeOS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png", sizes: "192x192" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeOS",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "LifeOS",
    title: "LifeOS - AI-Powered Life Dashboard",
    description:
      "Your intelligent personal assistant powered by Nova. Capture, process, and get insights from your digital life.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeOS - AI-Powered Life Dashboard",
    description:
      "Your intelligent personal assistant powered by Nova. Capture, process, and get insights from your digital life.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-bg-primary text-text-primary min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
