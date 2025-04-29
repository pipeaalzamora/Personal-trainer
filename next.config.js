/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['personal-trainer-roan.vercel.app', 'oyfpzkozkmlgowbsshbt.supabase.co'],
  },
  eslint: {
    // Ignorar errores de ESLint durante la compilación
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar errores de TypeScript durante la compilación
    ignoreBuildErrors: true,
  },
  experimental: {
    // Permitir errores en rutas específicas durante la compilación estática
    workerThreads: false,
    cpus: 1,
    outputFileTracingRoot: process.cwd(),
  },
  // Ignorar errores durante la exportación estática
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Configurar rutas que deben ser dinámicas (solo se renderizan en el lado del cliente)
  output: 'standalone',
}

module.exports = nextConfig 