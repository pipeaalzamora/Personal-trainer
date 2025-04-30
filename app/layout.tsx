import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react';
import Footer from '@/app/components/footer';
import { CartProvider } from '@/hooks/useCart'
import CartIcon from '@/app/components/CartIcon';
import Image from 'next/image';
import logo from '@/public/logo.png';
import { Toaster } from "@/components/ui/toaster"
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Personal Trainer - Programas de entrenamiento personalizados',
  description: 'Transforma tu cuerpo con nuestros programas de entrenamiento personalizados. Ganancia muscular, pérdida de grasa, powerlifting y más.',
  keywords: 'entrenamiento personal, ganancia muscular, pérdida de grasa, powerlifting, fuerza, fitness',
  authors: [{ name: 'Personal Trainer' }],
  openGraph: {
    title: 'Personal Trainer - Programas de entrenamiento personalizados',
    description: 'Transforma tu cuerpo con nuestros programas de entrenamiento personalizados',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} bg-cover bg-center min-h-screen flex flex-col`} style={{ backgroundColor: '#000033' }}>
        <CartProvider>
          <nav className="bg-gradient-to-r from-red-500 to-black text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="w-10"></div>
            <Link href="/" className="flex items-center justify-center">
              <Image 
                src={logo} 
                alt="CoachInostroza Logo" 
                width={150} 
                height={150} 
                className="rounded-full"
              />
            </Link>
            <div className="flex gap-4">
                <CartIcon />
            </div>
          </div>
        </nav>
          <main className="flex-grow">
        {children}
          </main>
        <Footer/>
        </CartProvider>
        <Toaster />
      </body>
    </html>
  )
}

