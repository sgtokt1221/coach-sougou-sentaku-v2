import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ignoreBuildErrors を撤去し、型エラーをビルドゲートで検出する運用に戻した
  // (docs/app-improvement-multi-perspective.md P0 #3 対応)
  generateBuildId: () => `build-${Date.now()}`,
  allowedDevOrigins: ['192.168.1.80'],
  // pdf-parse（中の pdfjs）は自分の横の pdf.worker.mjs を読みに行く。束ねると見失い、
  // 発表資料のPDFが毎回読めなかった。束ねずに node_modules から読ませる
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // worker は実行時に名前で読むため、本番へ載せるファイルの追跡から漏れる（ローカルでは動いて本番だけ落ちる）
  outputFileTracingIncludes: {
    "/api/interview/upload-presentation": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  async headers() {
    /**
     * 変わらない画像・アイコンを CDN とブラウザに覚えさせる（2026-11-26）。
     * 既定の max-age=0 だと毎回サーバーへ確かめに行き、サーバーが止まっていると
     * 立ち上がり（約13秒）に巻き込まれていた（本番の5秒超のリクエストの多くがこれ）。
     * stale-while-revalidate で、古くなっても先に返して裏で取り直す。
     * Service Worker（firebase-messaging-sw.js）は更新を届けたいので含めない。
     */
    const stableAsset = [
      { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000' },
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      { source: '/universities/:path*', headers: stableAsset },
      { source: '/icons/:path*', headers: stableAsset },
      { source: '/images/:path*', headers: stableAsset },
      { source: '/:file(logo|logo-dark|logo-vertical)\\.:ext(svg|png)', headers: stableAsset },
      { source: '/:file(favicon\\.ico|icon\\.png|icon\\.svg|apple-icon\\.png|apple-touch-icon\\.png|apple-touch-icon-precomposed\\.png)', headers: stableAsset },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
