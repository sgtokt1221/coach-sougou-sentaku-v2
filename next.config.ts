import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ignoreBuildErrors を撤去し、型エラーをビルドゲートで検出する運用に戻した
  // (docs/app-improvement-multi-perspective.md P0 #3 対応)
  generateBuildId: () => `build-${Date.now()}`,
  allowedDevOrigins: ['192.168.1.80'],
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
      ]
    }];
  },
};

export default nextConfig;
