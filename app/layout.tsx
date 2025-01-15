import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Dumbbell } from 'lucide-react';
import  Footer  from '@/app/components/footer';
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
    <html lang="en">
      <body className={`${inter.className} bg-cover bg-center`} style={{ backgroundColor: '#000033' }}>
        <nav className=" bg-gradient-to-r from-red-500 to-black text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Dumbbell/>
            CoachInostroza
          </Link>
            <Link href="/cart" className="hover:underline">Carrito</Link>
          </div>
        </nav>
        {children}
      </body>
  <Footer/>
    </html>
  )
}

