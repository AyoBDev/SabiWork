// dashboard/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
