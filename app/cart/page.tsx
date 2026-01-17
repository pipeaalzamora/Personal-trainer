"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useCart } from '@/hooks/useCart'
import { saveTransactionData } from '@/lib/secure-storage'

// Función simple de validación de email
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CartPage() {
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { cart, removeFromCart } = useCart()
  
  const totalPrice = cart.reduce((sum, course) => sum + course.price, 0)
  const isValid = validateEmail(email) && cart.length > 0
  
  const handleCheckout = async () => {
    if (!email) {
      toast({
        title: "Email requerido",
        description: "Por favor, introduce tu email para continuar con la compra.",
        variant: "destructive",
      });
      return;
    }
    
    if (!validateEmail(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, introduce un email válido.",
        variant: "destructive",
      });
      return;
    }
    
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "No hay productos en el carrito.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Generar identificadores únicos
      const buyOrder = `OC${Date.now()}${Math.floor(Math.random() * 10000)}`.substring(0, 26);
      const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const sessionId = `S${emailPrefix}${Date.now()}`.substring(0, 61);
      const returnUrl = `${window.location.origin}/payment/confirmation`;
      
      // Guardar datos de transacción en cookies seguras
      saveTransactionData({
        email,
        buyOrder,
        sessionId,
        amount: totalPrice,
      });
      
      // Llamar a la API para crear la transacción
      const response = await fetch('/api/transbank/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante para enviar cookies
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: totalPrice,
          return_url: returnUrl,
          email: email,
          cart: cart
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'Error al conectar con Transbank';
        
        if (response.status === 422) {
          errorMessage = 'Error 422: Datos inválidos para Transbank.';
          if (errorData.details) {
            errorMessage += ` ${errorData.details}`;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Actualizar token en cookies
      saveTransactionData({
        email,
        buyOrder,
        sessionId,
        amount: totalPrice,
        token: data.token,
      });
      
      // Actualizar estado de la transacción
      try {
        await fetch('/api/transbank/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            buyOrder,
            token: data.token,
            status: 'IN_PROCESS',
            additionalData: {
              redirectUrl: data.url,
              timestamp: new Date().toISOString(),
            }
          })
        });
      } catch (statusError) {
        console.error('Error al actualizar estado:', statusError);
      }
      
      // Pequeña pausa antes de redirigir
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirigir a Transbank usando formulario
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.url;
      
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token_ws';
      tokenInput.value = data.token;
      
      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error al procesar el pago",
        description: error instanceof Error ? error.message : "Hubo un error al conectar con Transbank",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-[60vh]">
      <Card className="max-w-2xl mx-auto mb-8">
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
                  <span>CLP ${course.price.toLocaleString('es-CL')}</span>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromCart(course.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <p className="font-bold text-lg">Total: CLP ${totalPrice.toLocaleString('es-CL')}</p>
              </div>
            </>
          )}
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4"
            autoComplete="email"
          />
          <Button 
            onClick={handleCheckout}
            disabled={!isValid || isProcessing}
            className="w-full mt-4"
          >
            {isProcessing ? 'Procesando...' : 'Proceder al Pago'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
