"use client"
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Course } from '../../lib/courses'
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/useCart"
import { useRouter } from 'next/navigation'

export default function AddToCartButton({ course }: { course: Course }) {
  const [isAdded, setIsAdded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { addToCart, cart } = useCart()
  const router = useRouter()

  const handleAddToCart = async () => {
    setIsProcessing(true)
    
    // Verificar si el curso ya está en el carrito
    const isCourseInCart = cart.some(item => item.id === course.id)
    
    if (isCourseInCart) {
      toast({
        title: "Curso ya en el carrito",
        description: `${course.title} ya está en tu carrito.`,
      });
      setIsProcessing(false)
      return;
    }
    
    // Agregar el curso al carrito
    addToCart(course)
    
    // Llamar al endpoint de Transbank
    try {
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
        
        // Redirigir al usuario a la página del carrito
        router.push('/cart')
      } else {
        toast({
          title: "Error",
          description: "No se pudo procesar la transacción.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar tu solicitud.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Button 
      onClick={handleAddToCart} 
      disabled={isAdded || isProcessing}
      className="w-full"
    >
      {isProcessing ? 'Procesando...' : isAdded ? 'Añadido al Carrito' : 'Añadir al Carrito'}
    </Button>
  )
}