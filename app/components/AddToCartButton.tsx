"use client"
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Course } from '@/hooks/useCourses'
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/useCart"
import { useRouter } from 'next/navigation'
import { getCourseUnavailableLabel } from '@/lib/course-availability'
import { productFromCourse, trackMarketingEvent } from '@/lib/marketing/client'

export default function AddToCartButton({ course }: { course: Course }) {
  const [isAdded, setIsAdded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { addToCart, cart } = useCart()
  const router = useRouter()
  const unavailableLabel = getCourseUnavailableLabel(course)

  const handleAddToCart = async () => {
    setIsProcessing(true)

    if (unavailableLabel) {
      toast({
        title: "Programa no disponible",
        description: `${course.title} no está disponible para compra.`,
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }
    
    // Verificar si el curso ya está en el carrito
    const isCourseInCart = cart.some(item => item.id === course.id)
    
    if (isCourseInCart) {
      toast({
        title: "Programa ya en el carrito",
        description: `${course.title} ya está en tu carrito.`,
      });
      setIsProcessing(false)
      return;
    }
    
    // Agregar el curso al carrito
    addToCart(course)
    trackMarketingEvent('AddToCart', {
      value: course.price,
      products: [productFromCourse(course)],
    })
    
    try {
      // Añadir el curso al carrito es suficiente, no necesitamos llamar a Transbank aquí
      setIsAdded(true)
      toast({
        title: "Programa añadido al carrito",
        description: `${course.title} ha sido añadido a tu carrito.`,
      })
      
      // Redirigir al usuario a la página del carrito
      router.push('/cart')
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
      disabled={Boolean(unavailableLabel) || isAdded || isProcessing}
      className="w-full"
    >
      {unavailableLabel || (isProcessing ? 'Procesando...' : isAdded ? 'Añadido al Carrito' : 'Añadir al Carrito')}
    </Button>
  )
}
