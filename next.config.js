/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ws"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "images.genius.com",
      },
      {
        protocol: "https",
        hostname: "legato.lunive.app",
      },
    ],
  },
  // Enable standalone output for Docker/hosting
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/ws",
        destination: "/api/ws",
      },
    ];
  },
};

module.exports = nextConfig;
