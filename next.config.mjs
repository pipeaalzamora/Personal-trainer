/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activar el directorio app
  experimental: {
    serverActions: true,
  },

  // Configuración de dominios de imágenes
  images: {
    domains: [
      'images.unsplash.com',
      'plus.unsplash.com',
      'uploadthing.com',
      'utfs.io',
      'via.placeholder.com',
      'placehold.co',
      'loremflickr.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Reescrituras para manejo de CORS en Transbank
  async rewrites() {
    return [
      {
        source: '/webpay-api/:path*',
        destination: 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/:path*',
      },
    ];
  },

  // Cabeceras para CORS
  async headers() {
    return [
      {
        // Permitir CORS para todas las rutas de API
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // Reemplazar por tu dominio en producción
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
          },
        ],
      },
    ];
  },

  // Configuración para React Suspense y errores de hydration
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
