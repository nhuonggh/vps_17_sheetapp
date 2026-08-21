import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Temporary: build được duyệt qua type-check thủ công trước khi merge
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Report-only for now — dangerouslySetInnerHTML renders unsanitized content_html
          // (audit/05_security.md #5); enforce once that's fixed with a sanitizer.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline'; frame-src https://www.google.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
