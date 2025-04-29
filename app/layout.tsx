import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Dumbbell, ShoppingCart } from 'lucide-react';
import Footer from '@/app/components/footer';
import { CartProvider } from '@/hooks/useCart'
import CartIcon from '@/app/components/CartIcon';
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Fitness Courses',
  description: 'High-quality fitness courses by professional trainers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-cover bg-center min-h-screen flex flex-col`} style={{ backgroundColor: '#000033' }}>
        <CartProvider>
          <nav className="bg-gradient-to-r from-red-500 to-black text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <Dumbbell/>
              CoachInostroza
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
      </body>
    </html>
  )
}

