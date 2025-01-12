"use client"
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Course } from '../../lib/courses'
import { useToast } from "@/hooks/use-toast"

export default function AddToCartButton({ course }: { course: Course }) {
  const [isAdded, setIsAdded] = useState(false)
  const { toast } = useToast()

  const handleAddToCart = async () => {
    // Obtener el carrito actual del localStorage
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]')
    
    // Agregar el curso al carrito
    const updatedCart = [...currentCart, course]
    
    // Guardar el carrito actualizado en localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    
    // Llamar al endpoint de Transbank
    const response = await fetch('/api/transbank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: course.price, orderId: course.id }),
    })

    if (response.ok) {
      setIsAdded(true)
      toast({
        title: "Curso añadido al carrito",
        description: `${course.title} ha sido añadido a tu carrito.`,
      })
    } else {
      toast({
        title: "Error",
        description: "No se pudo procesar la transacción.",
      })
    }
  }

  return (
    <Button 
      onClick={handleAddToCart} 
      disabled={isAdded}
      className="w-full"
    >
      {isAdded ? 'Añadido al Carrito' : 'Añadir al Carrito'}
    </Button>
  )
}

