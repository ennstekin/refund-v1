/** @type {import('next').NextConfig} */
const nextConfig = {
  // ikas build için static export
  output: 'export',

  // Portal sayfalarını exclude et
  // Sadece dashboard sayfalarını export et
  distDir: 'out/ikas',

  // API routes'ları ignore et (static export'ta çalışmazlar)
  // ikas app API'lere Vercel URL üzerinden erişecek

  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },

  // Trailing slash for static hosting
  trailingSlash: true,

  // Image optimization disabled for static export
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
