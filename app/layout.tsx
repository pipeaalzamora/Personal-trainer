import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react';
import Footer from '@/app/components/footer';
import { CartProvider } from '@/hooks/useCart'
import { CoursesProvider } from '@/hooks/useCourses'
import CartIcon from '@/app/components/CartIcon';
import Image from 'next/image';
import logo from '@/public/logo.png';
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000033'
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://coach-inostroza.vercel.app'),
  title: 'Coach Inostroza - Programas de entrenamiento personalizados',
  description: 'Transforma tu cuerpo con nuestros programas de entrenamiento personalizados. Ganancia muscular, pérdida de grasa, powerlifting y más.',
  keywords: 'entrenamiento personal, ganancia muscular, pérdida de grasa, powerlifting, fuerza, fitness, coach online, rutinas personalizadas, nutrición deportiva',
  authors: [{ name: 'Coach Inostroza' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Coach Inostroza - Programas de entrenamiento personalizados',
    description: 'Transforma tu cuerpo con nuestros programas de entrenamiento personalizados',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Coach Inostroza',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Coach Inostroza Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coach Inostroza - Programas de entrenamiento personalizados',
    description: 'Transforma tu cuerpo con nuestros programas de entrenamiento personalizados',
    images: ['/logo.png'],
  },
  icons: [
    { rel: 'icon', url: '/logo.png' },
    { rel: 'apple-touch-icon', url: '/logo.png' },
    { rel: 'shortcut icon', url: '/logo.png' }
  ]
}

// Componente fallback para uso con Suspense en toda la aplicación
function GlobalLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-red-500 to-black" role="alert" aria-busy="true">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent border-solid rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <p className="text-white text-xl">Cargando...</p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#000033" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-cover bg-center min-h-screen flex flex-col`} style={{ backgroundColor: '#000033' }}>
        <CoursesProvider>
        <CartProvider>
          <nav className="bg-gradient-to-r from-red-500 to-black text-white p-4" role="navigation" aria-label="Navegación principal" id="main-nav">
            <div className="container mx-auto flex justify-between items-center">
              <div className="w-10"></div>
              <Link href="/" className="flex items-center justify-center" aria-label="Ir a la página principal">
                <Image 
                  src={logo} 
                  alt="CoachInostroza Logo" 
                  width={300} 
                  height={300} 
                  className="rounded-full"
                  priority
                  loading="eager"
                />
              </Link>
              <div className="flex gap-4">
                <CartIcon />
              </div>
            </div>
          </nav>
          <main className="flex-grow" role="main">
            <Suspense fallback={<GlobalLoadingFallback />}>
              {children}
            </Suspense>
          </main>
          <Footer/>
        </CartProvider>
        </CoursesProvider>
        <Toaster />
      </body>
    </html>
  )
}

