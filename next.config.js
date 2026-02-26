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
  webpack: (config, { isServer }) => {
    // Ignorar canvas em todos os ambientes (pdfjs-dist não precisa no browser)
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      }
    }

    return config
  },
}

module.exports = nextConfig
