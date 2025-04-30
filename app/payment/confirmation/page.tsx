"use client"

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";

// Definir la estructura de la respuesta de Transbank
interface TransactionResponse {
  vci: string;
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  card_detail: {
    card_number: string;
  };
  accounting_date: string;
  transaction_date: string;
  authorization_code: string;
  payment_type_code: string;
  response_code: number;
  installments_number?: number;
}

// Componente contenedor que usa useSearchParams
function ConfirmationContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Procesando el pago...');
  const [transactionData, setTransactionData] = useState<TransactionResponse | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const processingCompleteRef = useRef(false);
  
  useEffect(() => {
    // Evitar que se ejecute varias veces
    if (processingCompleteRef.current) {
      return;
    }
    
    const token = searchParams.get('token_ws');
    
    if (!token) {
      setStatus('error');
      setStatusMessage('Error: Token no encontrado');
      processingCompleteRef.current = true;
      return;
    }
    
    const confirmPayment = async () => {
      try {
        // Marcar como en proceso para evitar múltiples ejecuciones
        processingCompleteRef.current = true;
        
        console.log('Confirmando transacción con token:', token);
        
        // Usar nuestro endpoint de API para confirmar la transacción
        const response = await fetch('/api/transbank/commit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error al confirmar la transacción:', errorText);
          throw new Error(`Error al confirmar la transacción: ${response.status} ${response.statusText}`);
        }
        
        const data: TransactionResponse = await response.json();
        console.log('Respuesta de confirmación:', data);
        setTransactionData(data);
        
        if (data.response_code === 0) {
          // Pago exitoso
          setStatus('success');
          setStatusMessage('¡Pago realizado con éxito!');
          
          // Limpiar el carrito
          clearCart();
          
          // Guardar información de la transacción en localStorage para mostrarla en "Mis Cursos"
          const cartData = localStorage.getItem('tbk_cart');
          if (cartData) {
            const cart = JSON.parse(cartData);
            const email = localStorage.getItem('tbk_email') || '';
            
            const coursePurchases = cart.map((course: any) => ({
              courseId: course.id,
              courseTitle: course.title,
              purchaseDate: new Date().toISOString(),
              amount: course.price,
              transactionId: data.buy_order,
              email: email
            }));
            
            // Obtener compras previas o inicializar un array vacío
            const previousPurchases = JSON.parse(localStorage.getItem('user_courses') || '[]');
            const updatedPurchases = [...previousPurchases, ...coursePurchases];
            localStorage.setItem('user_courses', JSON.stringify(updatedPurchases));
          }
          
          // Mostrar toast de éxito
          toast({
            title: "Pago exitoso",
            description: `Tu compra por $${data.amount} ha sido procesada correctamente.`,
          });
          
          // Limpiar datos temporales de Transbank
          localStorage.removeItem('tbk_cart');
          localStorage.removeItem('tbk_email');
          localStorage.removeItem('tbk_buy_order');
          localStorage.removeItem('tbk_session_id');
          localStorage.removeItem('tbk_amount');
          localStorage.removeItem('tbk_token');
          
        } else {
          // Pago rechazado
          setStatus('error');
          setStatusMessage(`Pago rechazado. Código: ${data.response_code}`);
          
          toast({
            title: "Pago rechazado",
            description: `La transacción fue rechazada con código ${data.response_code}.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error:', error);
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Error al confirmar el pago');
        
        toast({
          title: "Error de procesamiento",
          description: "Hubo un problema al confirmar tu pago.",
          variant: "destructive",
        });
      }
    };
    
    confirmPayment();
    
    // Cleanup function - asegurarse de que no se llame múltiples veces
    return () => {
      processingCompleteRef.current = true;
    };
  }, [searchParams, toast, clearCart]); // Quitar router de las dependencias
  
  const handleContinue = () => {
    if (status === 'success') {
      router.push('/my-courses');
    } else {
      router.push('/cart');
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          {status === 'loading' ? 'Procesando pago' : 
           status === 'success' ? '¡Pago exitoso!' : 'Error en el pago'}
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'loading' ? 'Por favor espera mientras confirmamos tu pago.' : 
           status === 'success' ? 'Tu pago ha sido procesado correctamente.' : 
           'Lo sentimos, hubo un problema con tu pago.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center py-6">
        {status === 'loading' ? (
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle className="h-16 w-16 text-green-500" />
        ) : (
          <XCircle className="h-16 w-16 text-red-500" />
        )}
        
        <p className="mt-4 text-center">{statusMessage}</p>
        
        {status === 'success' && transactionData && (
          <div className="mt-6 w-full space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Orden:</span>
              <span>{transactionData.buy_order}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Monto:</span>
              <span>${transactionData.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tarjeta:</span>
              <span>**** **** **** {transactionData.card_detail.card_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Fecha:</span>
              <span>{new Date(transactionData.transaction_date).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <Button 
          onClick={handleContinue} 
          disabled={status === 'loading'}
        >
          {status === 'success' ? 'Ver mis cursos' : 'Volver al carrito'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente fallback para Suspense
function ConfirmationFallback() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          Cargando datos de pago
        </CardTitle>
        <CardDescription className="text-center">
          Por favor espera mientras cargamos la información de tu pago.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-center">Cargando...</p>
      </CardContent>
    </Card>
  );
}

// Componente principal que envuelve todo con Suspense
export default function ConfirmationPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Suspense fallback={<ConfirmationFallback />}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
} 