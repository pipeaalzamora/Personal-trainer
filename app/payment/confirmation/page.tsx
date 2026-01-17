"use client"

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { getTransactionData, clearTransactionData, getCartData } from "@/lib/secure-storage";

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

export default function ConfirmationPage() {
  return (
    <div className="container mx-auto py-10">
      <Suspense fallback={<PaymentLoading />}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}

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
  
  const processingCompleteRef = useRef(false);
  
  useEffect(() => {
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
        processingCompleteRef.current = true;
        
        const response = await fetch('/api/transbank/commit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error al confirmar la transacción:', errorText);
          throw new Error(`Error al confirmar la transacción: ${response.status}`);
        }
        
        const data: TransactionResponse = await response.json();
        setTransactionData(data);
        
        if (data.response_code === 0) {
          setStatus('success');
          setStatusMessage('¡Pago realizado con éxito!');
          
          // Limpiar carrito y datos de transacción
          clearCart();
        } else if (data.response_code === -1) {
          setStatus('error');
          setStatusMessage('La transacción fue cancelada o rechazada. Puedes intentar nuevamente.');
          
          toast({
            title: "Pago cancelado",
            description: "La transacción fue cancelada. Puedes volver a intentarlo.",
            variant: "destructive",
          });
          return;
          
          // Guardar información de compra para "Mis Cursos"
          const cartData = getCartData();
          const txData = getTransactionData();
          
          if (cartData.length > 0) {
            const coursePurchases = cartData.map((course: any) => ({
              courseId: course.id,
              courseTitle: course.title,
              purchaseDate: new Date().toISOString(),
              amount: course.price,
              transactionId: data.buy_order,
              email: txData.email || ''
            }));
            
            // Guardar en localStorage (esto es seguro, no es sensible)
            const previousPurchases = JSON.parse(localStorage.getItem('user_courses') || '[]');
            const updatedPurchases = [...previousPurchases, ...coursePurchases];
            localStorage.setItem('user_courses', JSON.stringify(updatedPurchases));
          }
          
          // Limpiar datos de transacción de las cookies
          clearTransactionData();
          
          toast({
            title: "Pago exitoso",
            description: `Tu compra por $${data.amount.toLocaleString()} ha sido procesada correctamente.`,
          });
        } else {
          setStatus('error');
          setStatusMessage(`Error en el pago: código ${data.response_code}`);
          
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
        {status !== 'loading' && (
          <Button onClick={handleReturnToHome} className="w-full">
            Volver al inicio
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
