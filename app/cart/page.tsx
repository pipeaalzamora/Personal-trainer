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
    try {
      const response = await fetch('/api/transbank/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalPrice,
          email: email,
          cart: cart,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error al crear la transacción:', errorData);
        toast({
          title: "Error al procesar el pago",
          description: errorData.message || "Hubo un problema al procesar tu pago.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { url, token } = await response.json();
      window.location.href = url;
      localStorage.setItem('transbank_token', token);

    } catch (error) {
      console.error('Error inesperado:', error);
      toast({
        title: "Error inesperado",
        description: "Hubo un error inesperado al procesar tu pago.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const removeFromCart = (courseId: number) => {
    const updatedCart = cart.filter(course => Number(course.id) !== courseId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

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
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromCart(Number(course.id))}
                  >
                    Eliminar
                  </Button>
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