"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Course } from '../../lib/courses'
import { useToast } from "@/hooks/use-toast"

export default function CartPage() {
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [cart, setCart] = useState<Course[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]')
    setCart(savedCart)
  }, [])

  const totalPrice = cart.reduce((sum, course) => sum + course.price, 0)

  const handleCheckout = async () => {
    setIsProcessing(true)
    // Simular procesamiento de pago
    await new Promise(resolve => setTimeout(resolve, 2000))
    // Simular envío de correo
    console.log(`Correo enviado a ${email} con confirmación de compra`)
    setIsProcessing(false)
    localStorage.removeItem('cart')
    setCart([])
    toast({
      title: "¡Compra realizada con éxito!",
      description: "Se ha enviado un correo de confirmación.",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Carrito de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <p>Tu carrito está vacío.</p>
          ) : (
            <>
              {cart.map((course) => (
                <div key={course.id} className="flex justify-between items-center mb-4">
                  <span>{course.title}</span>
                  <span>${course.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <p className="font-bold text-lg">Total: ${totalPrice.toFixed(2)}</p>
              </div>
            </>
          )}
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4"
          />
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCheckout} 
            disabled={isProcessing || !email || cart.length === 0}
            className="w-full"
          >
            {isProcessing ? 'Procesando...' : 'Realizar Pago'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

