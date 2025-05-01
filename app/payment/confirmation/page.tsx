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

// Página principal de confirmación
export default function ConfirmationPage() {
  return (
    <div className="container mx-auto py-10">
      <Suspense fallback={<PaymentLoading />}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}

// Componente de carga
function PaymentLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="h-16 w-16 text-primary animate-spin" />
      <p className="mt-4 text-center">Procesando tu pago, por favor espera...</p>
    </div>
  );
}

function ConfirmationContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Procesando tu pago...');
  const [transactionData, setTransactionData] = useState<TransactionResponse | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { clearCart } = useCart();
  
  // Referencia para evitar procesamiento múltiple
  const processingCompleteRef = useRef(false);
  
  useEffect(() => {
    // Evitar que se ejecute varias veces
    if (processingCompleteRef.current) {
      return;
    }
    
    const token = searchParams.get('token_ws');
    if (!token) {
      setStatus('error');
      setStatusMessage('No se ha recibido un token de pago válido.');
      return;
    }
    
    confirmPayment();
    
    async function confirmPayment() {
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
            
            // Enviar comprobante de pago y confirmación de compra por email
            if (email) {
              try {
                // 1. Primero enviar el comprobante de la transacción
                await fetch('/api/auth/send-payment-receipt', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email,
                    transactionId: data.buy_order,
                    cardNumber: data.card_detail.card_number,
                    amount: data.amount,
                    date: new Date(data.transaction_date).toLocaleString('es-ES'),
                    authCode: data.authorization_code
                  }),
                });
                
                // 2. Luego enviar la confirmación de compra
                const courseTitles = cart.map((course: any) => course.title);
                
                await fetch('/api/auth/send-order-email', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email,
                    orderId: `ORD-${Date.now()}`, // Generar un ID de orden único
                    buyOrder: data.buy_order,
                    courseTitles,
                    totalAmount: data.amount
                  }),
                });
                
                console.log('Emails de confirmación enviados correctamente');
              } catch (emailError) {
                console.error('Error al procesar el envío de email:', emailError);
                // No interrumpimos el flujo principal si falla el envío de email
              }
            }
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
          // Pago fallido
          setStatus('error');
          setStatusMessage(`Error en el pago: ${data.response_code}`);
          
          toast({
            title: "Error en el pago",
            description: `No se pudo completar la transacción. Código: ${data.response_code}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error al procesar la transacción:', error);
        setStatus('error');
        setStatusMessage(error instanceof Error ? error.message : 'Error desconocido');
        
        toast({
          title: "Error en el pago",
          description: error instanceof Error ? error.message : 'Error desconocido',
          variant: "destructive",
        });
      }
    }
  }, [searchParams, clearCart, toast]);
  
  const handleReturnToHome = () => {
    router.push('/');
  };
  
  const handleViewCourses = () => {
    router.push('/my-courses');
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
      
      <CardFooter className="flex flex-col gap-2">
        {status === 'success' ? (
          <>
            <Button onClick={handleViewCourses} className="w-full">
              Ver mis cursos
            </Button>
            <Button onClick={handleReturnToHome} variant="outline" className="w-full">
              Volver al inicio
            </Button>
          </>
        ) : status === 'error' ? (
          <Button onClick={handleReturnToHome} className="w-full">
            Volver al inicio
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
} 