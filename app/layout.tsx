import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

// Noto Sans JP covers kanji, hiragana and katakana; Google serves it in
// unicode-range chunks so the browser only downloads glyphs that are used.
const noto = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "J-app · JLPT flashcards",
  description: "Swipe through JLPT N5–N2 vocabulary flashcards",
  appleWebApp: { capable: true, title: "J-app", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${noto.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </main>
        <ServiceWorker />
      </body>
    </html>
  );
}
