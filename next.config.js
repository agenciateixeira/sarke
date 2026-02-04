/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eaphfgwyiaqelppopcrt.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
