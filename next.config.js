/** @type {import('next').NextConfig} */
const nextConfig = {
  // MIGRATION NOTE: Add image domains here when migrating to production CDN.
  // Example: images: { domains: ['your-cdn.example.com'] }
  images: {
    remotePatterns: [
      {
        // Supabase Storage — replace with your own CDN when migrating away from Supabase.
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0' }],
      },
    ]
  },
}

module.exports = nextConfig
