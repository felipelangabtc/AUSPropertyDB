/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Otimizações de imagem
  images: {
    domains: [
      'images.unsplash.com',
      'via.placeholder.com',
      'cdn.ausproperty.app',
      'storage.googleapis.com',
    ],
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Headers de segurança
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
  ],

  // Variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: 'AUS Property Intelligence',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Webpack otimizações
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.usedExports = true;
    }
    return config;
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@mui/material', 'react-icons'],
  },
};

export default nextConfig;
