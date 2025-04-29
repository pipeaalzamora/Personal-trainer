"use client"
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Check, X } from "lucide-react"

export default function PaymentStatusPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    const token_ws = searchParams.get('token_ws')
    const token = token_ws || localStorage.getItem('transbank_token')
    
    if (!token) {
      setStatus('error')
      toast({
        title: "Error en la transacción",
        description: "No se encontró información de la transacción",
        variant: "destructive",
      })
      return
    }

    const commitTransaction = async () => {
      try {
        const response = await fetch('/api/transbank/commit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()
        
        if (response.ok && data.status === 'AUTHORIZED') {
          setStatus('success')
          setDetails(data)
          localStorage.removeItem('cart')
          localStorage.removeItem('transbank_token')
          
          toast({
            title: "¡Pago exitoso!",
            description: "Tu compra ha sido procesada correctamente",
          })
        } else {
          setStatus('error')
          setDetails(data)
          toast({
            title: "Error en el pago",
            description: data.error || "Hubo un problema con tu pago",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error al procesar la transacción:', error)
        setStatus('error')
        toast({
          title: "Error inesperado",
          description: "Ocurrió un error al procesar la transacción",
          variant: "destructive",
        })
      }
    }

    commitTransaction()
  }, [searchParams, toast])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Estado del Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-center">Procesando tu pago...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-green-600">¡Pago exitoso!</h3>
              <p className="mt-2 text-center">Tu compra ha sido procesada correctamente</p>
              
              {details && (
                <div className="mt-6 w-full border rounded-lg p-4 bg-gray-50">
                  <p><strong>Orden:</strong> {details.buy_order}</p>
                  <p><strong>Autorización:</strong> {details.authorization_code}</p>
                  <p><strong>Monto:</strong> ${details.amount}</p>
                  <p><strong>Tarjeta:</strong> **** **** **** {details.card_detail?.card_number}</p>
                </div>
              )}
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-red-100 p-3">
                <X className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-red-600">Error en el pago</h3>
              <p className="mt-2 text-center">Hubo un problema al procesar tu pago</p>
              
              {details && details.error && (
                <div className="mt-6 w-full border rounded-lg p-4 bg-gray-50">
                  <p className="text-red-600">{details.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 