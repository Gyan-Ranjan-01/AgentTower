/** @type {import('next').NextConfig} */
const backendPort = process.env.AGENTTOWER_PORT || '8001';

const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://127.0.0.1:${backendPort}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
