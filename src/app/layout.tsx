import type { Metadata, Viewport } from "next";
import { Sora, Zen_Kaku_Gothic_New, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});



export const metadata: Metadata = {
  title: "coach for 総合型選抜",
  description: "AI搭載の総合型選抜対策プラットフォーム",
  manifest: "/manifest.webmanifest",
  // iOS はホーム画面に追加したPWAでないと Web Push が届かない
  appleWebApp: {
    capable: true,
    title: "coach",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${sora.variable} ${zenKaku.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-grain" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
