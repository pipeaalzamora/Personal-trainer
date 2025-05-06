"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useCart } from '@/hooks/useCart'

// Función simple de validación de email
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CartPage() {
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { cart, removeFromCart } = useCart()
  
  // Calcular el precio total aquí
  const totalPrice = cart.reduce((sum, course) => sum + course.price, 0)
  
  // Verificar que el email sea válido y que haya al menos un curso en el carrito
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
      // 1. Preparar los datos para Transbank
      const buyOrder = `OC${Date.now()}${Math.floor(Math.random() * 10000)}`.substring(0, 26);
      const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const sessionId = `S${emailPrefix}${Date.now()}`.substring(0, 61);
      const returnUrl = `${window.location.origin}/payment/confirmation`;
      
      // Guardar información del comprador
      localStorage.setItem('tbk_email', email);
      localStorage.setItem('tbk_cart', JSON.stringify(cart));
      localStorage.setItem('tbk_buy_order', buyOrder);
      localStorage.setItem('tbk_session_id', sessionId);
      localStorage.setItem('tbk_amount', totalPrice.toString());
      
      console.log('Iniciando transacción con Transbank:');
      console.log('- URL de retorno:', returnUrl);
      console.log('- Orden de compra:', buyOrder);
      console.log('- ID de sesión:', sessionId);
      console.log('- Monto:', totalPrice);
      
      // 2. Llamar a nuestra API proxy para crear la transacción
      const response = await fetch('/api/transbank/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: totalPrice,
          return_url: returnUrl,
          email: email,
          cart: cart
        })
      });
      
      let errorMessage = 'Error al conectar con Transbank';
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Error de Transbank:', errorData);
          
          // Mostrar información más detallada sobre el error
          if (response.status === 422) {
            errorMessage = 'Error 422: Datos inválidos para Transbank. ';
            if (errorData.details) {
              try {
                const detailsObj = typeof errorData.details === 'string' 
                  ? JSON.parse(errorData.details) 
                  : errorData.details;
                errorMessage += `Detalle: ${detailsObj.error_message || JSON.stringify(detailsObj)}`;
              } catch (e) {
                errorMessage += `Detalle: ${errorData.details}`;
              }
            }
          } else {
            errorMessage = `Error al crear transacción en Transbank: ${response.status} ${response.statusText}`;
            if (errorData.error) {
              errorMessage += `. ${errorData.error}`;
            }
          }
        } catch (parseError) {
          console.error('Error al parsear la respuesta:', parseError);
          errorMessage = `Error al procesar la respuesta: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Respuesta de Transbank:', data);
      
      // Guardar token en localStorage
      localStorage.setItem('tbk_token', data.token);
      
      // Actualizar el estado de la transacción a "IN_PROCESS"
      try {
        const statusResponse = await fetch('/api/transbank/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            buyOrder,
            token: data.token,
            status: 'IN_PROCESS',
            additionalData: {
              redirectUrl: data.url,
              timestamp: new Date().toISOString(),
              device: navigator.userAgent
            }
          })
        });
        
        if (statusResponse.ok) {
          console.log('Estado de transacción actualizado a IN_PROCESS');
        } else {
          console.error('Error al actualizar estado de transacción:', await statusResponse.text());
        }
      } catch (statusError) {
        console.error('Error al actualizar estado de transacción:', statusError);
        // No interrumpimos el flujo principal si falla la actualización
      }
      
      // Pequeña pausa para asegurar que la actualización se complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirigir al formulario de pago de Transbank
      // Usar un formulario temporal para evitar bloqueos por redirección
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
                    onClick={() => removeFromCart(Number(course.id))}
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