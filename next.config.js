/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        pathname: '/api/portraits/**',
      },
      {
        protocol: 'https',
        hostname: 'personal-trainer-roan.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'coach-inostroza.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'www.coachinostroza.cl',
      },
      {
        protocol: 'https',
        hostname: 'coachinostroza.cl',
      },
      {
        protocol: 'https',
        hostname: 'oyfpzkozkmlgowbsshbt.supabase.co',
      },
    ],
  },
  output: 'standalone',
}

module.exports = nextConfig
