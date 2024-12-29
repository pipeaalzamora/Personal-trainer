"use client"
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Course } from '../../lib/courses'
import { useToast } from "@/hooks/use-toast"

export default function AddToCartButton({ course }: { course: Course }) {
  const [isAdded, setIsAdded] = useState(false)
  const { toast } = useToast()

  const handleAddToCart = () => {
    // Obtener el carrito actual del localStorage
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]')
    
    // Agregar el curso al carrito
    const updatedCart = [...currentCart, course]
    
    // Guardar el carrito actualizado en localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    
    setIsAdded(true)
    toast({
      title: "Curso añadido al carrito",
      description: `${course.title} ha sido añadido a tu carrito.`,
    })
    
    setTimeout(() => setIsAdded(false), 2000)
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

