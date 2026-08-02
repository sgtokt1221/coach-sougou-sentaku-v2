import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト。
 *
 * これが無いとホーム画面に追加してもPWAとして扱われず、iOS では Web Push が
 * 使えない（iOS 16.4 以降、ホーム画面に追加したPWAでのみ通知が届く）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "coach for 総合型選抜",
    short_name: "coach",
    description: "AI搭載の総合型選抜対策プラットフォーム",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    lang: "ja",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
