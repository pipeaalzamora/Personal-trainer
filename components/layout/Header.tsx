"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import CartIcon from '@/app/components/CartIcon'
import logo from '@/public/logo.png'

export function Header() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 w-full bg-black/90 backdrop-blur-sm z-50 border-b border-gray-800">
      <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src={logo} 
            alt="Personal Trainer Logo" 
            width={40} 
            height={40}
            className="w-10 h-10"
          />
          <span className="text-white font-bold text-xl hidden sm:inline-block">Personal Trainer</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <NavLink href="/" active={pathname === '/'}>Inicio</NavLink>
          <NavLink href="/my-courses" active={pathname === '/my-courses'}>Mis Cursos</NavLink>
          <NavLink href="/about" active={pathname === '/about'}>Sobre Mí</NavLink>
          <NavLink href="/contact" active={pathname === '/contact'}>Contacto</NavLink>
        </nav>
        
        <div className="flex items-center space-x-4">
          <CartIcon />
          <Link 
            href="/login" 
            className="text-white hover:text-red-500 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </header>
  )
}

interface NavLinkProps {
  href: string
  active: boolean
  children: React.ReactNode
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link 
      href={href} 
      className={`text-sm font-medium transition-colors hover:text-red-500 ${
        active ? 'text-red-500' : 'text-white'
      }`}
    >
      {children}
    </Link>
  )
} 