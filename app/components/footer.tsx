import { Facebook, Instagram,  } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-red-500 to-black text-white py-8">
      <div className="container mx-auto px-4 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">CoachInostroza</h3>
            <p className="text-sm font-bold uppercase tracking-wide">Entrena inteligente, domina tu técnica, evita lesiones.</p>
          </div>
          <div>
            <h4 className="font-semibold text-md mb-4">Contacto</h4>
            <p className="text-sm mb-2">
              <a href="mailto:davidinostroza98@gmail.com" className="hover:underline">davidinostroza98@gmail.com</a>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-md mb-4">Síguenos</h4>
            <div className="flex justify-center space-x-4">
              <a href="https://www.facebook.com/profile.php?id=100079043483265" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook className="w-6 h-6 text-white hover:text-gray-200 transition-colors" />
              </a>
              <a href="https://www.instagram.com/coach_inostroza10/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="w-6 h-6 text-white hover:text-gray-200 transition-colors" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 text-center">
          <p className="text-sm">&copy; {new Date().getFullYear()} CoachInostroza. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

