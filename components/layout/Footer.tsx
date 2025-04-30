import Link from 'next/link'
import { Instagram, Facebook, Twitter } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-black text-white border-t border-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Personal Trainer</h3>
            <p className="text-gray-400 mb-4">
              Transformando vidas a través del entrenamiento personalizado y la nutrición adaptada a tus objetivos.
            </p>
            <div className="flex space-x-4">
              <SocialLink href="https://instagram.com" icon={<Instagram className="w-5 h-5" />} />
              <SocialLink href="https://facebook.com" icon={<Facebook className="w-5 h-5" />} />
              <SocialLink href="https://twitter.com" icon={<Twitter className="w-5 h-5" />} />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Programas</h3>
            <ul className="space-y-2">
              <FooterLink href="/#ganancia-muscular">Ganancia Muscular</FooterLink>
              <FooterLink href="/#perdida-grasa">Pérdida de Grasa</FooterLink>
              <FooterLink href="/#ganancia-fuerza">Ganancia de Fuerza</FooterLink>
              <FooterLink href="/#powerlifting">Powerlifting</FooterLink>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Recursos</h3>
            <ul className="space-y-2">
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/faq">Preguntas Frecuentes</FooterLink>
              <FooterLink href="/testimonios">Testimonios</FooterLink>
              <FooterLink href="/calculadoras">Calculadoras</FooterLink>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Contacto</h3>
            <address className="not-italic text-gray-400">
              <p>Email: contacto@personaltrainer.com</p>
              <p>Teléfono: +569 1234 5678</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between">
          <p className="text-gray-400">
            &copy; {currentYear} Personal Trainer. Todos los derechos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <FooterLink href="/terminos">Términos y Condiciones</FooterLink>
            <FooterLink href="/privacidad">Política de Privacidad</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  )
}

interface SocialLinkProps {
  href: string
  icon: React.ReactNode
}

function SocialLink({ href, icon }: SocialLinkProps) {
  return (
    <Link 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-gray-400 hover:text-red-500 transition-colors"
    >
      {icon}
    </Link>
  )
}

interface FooterLinkProps {
  href: string
  children: React.ReactNode
}

function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <li>
      <Link 
        href={href} 
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        {children}
      </Link>
    </li>
  )
} 