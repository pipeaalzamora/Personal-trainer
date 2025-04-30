/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['personal-trainer-roan.vercel.app', 'oyfpzkozkmlgowbsshbt.supabase.co', 'randomuser.me'],
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
        hostname: 'oyfpzkozkmlgowbsshbt.supabase.co',
      },
    ],
  }
};

export default nextConfig;
