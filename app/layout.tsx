import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'

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
      <body className={inter.className}>
        <nav className=" bg-gradient-to-r from-red-500 to-black text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold"></Link>
            <Link href="/cart" className="hover:underline">Carrito</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}

