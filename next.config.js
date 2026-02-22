/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eaphfgwyiaqelppopcrt.supabase.co',
      },
    ],
  },
  experimental: {
    // Otimizações para navegação instantânea
    optimisticClientCache: true,
  },
}

module.exports = nextConfig
