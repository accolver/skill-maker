/** @type {import('next').NextConfig} */
const nextConfig = {
  // REQUIRED for Lambda deployment - produces a minimal standalone build
  output: "standalone",

  // Image optimization configuration for AWS
  images: {
    // Use a custom loader if deploying image optimization as a separate Lambda
    // loader: "custom",
    // loaderFile: "./image-loader.js",

    // Or use unoptimized if you don't need on-the-fly optimization
    // unoptimized: true,

    // Allowed image domains
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.example.com",
      },
    ],
  },

  // Headers for cache control
  async headers() {
    return [
      {
        // Hashed static assets - immutable
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // HTML pages - must revalidate
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable compression (CloudFront also compresses, but this helps Lambda responses)
  compress: true,

  // Strict mode for catching issues early
  reactStrictMode: true,

  // Environment variables available at build time
  // NEXT_PUBLIC_* vars are automatically included
  // Server-side vars should come from SSM at runtime, not here
};

module.exports = nextConfig;
