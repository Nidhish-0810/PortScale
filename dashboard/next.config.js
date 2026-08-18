/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Allow unoptimized images (GitHub avatars) without needing Next.js image optimization server
    unoptimized: true,
  },
  // Disable ESLint during builds (the project may have issues that shouldn't block deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds even with type errors
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
