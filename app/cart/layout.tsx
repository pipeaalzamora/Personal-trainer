import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carrito de Compras - Coach Inostroza',
  description: 'Revisa y completa tu compra de programas de entrenamiento personalizados.',
  openGraph: {
    title: 'Carrito de Compras - Coach Inostroza',
    description: 'Revisa y completa tu compra de programas de entrenamiento personalizados.',
  }
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 