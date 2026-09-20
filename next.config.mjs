/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hanya aktifkan static export jika environment STATIC_EXPORT diaktifkan (untuk Capacitor)
  // Default: Fullstack mode untuk mendukung REST API routes dan database SQLite
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Pengalihan otomatis /uploads/ ke rute terproteksi /api/uploads/
  async redirects() {
    return [
      {
        source: '/uploads/:filename*',
        destination: '/api/uploads/:filename*',
        permanent: false,
      },
    ];
  },
  // Perlindungan Keamanan Website (Security Headers)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
