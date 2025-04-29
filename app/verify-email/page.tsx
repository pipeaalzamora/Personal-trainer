"use client"
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Check, AlertTriangle } from "lucide-react"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      toast({
        title: "Error de verificación",
        description: "Token de verificación no proporcionado",
        variant: "destructive",
      })
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          setStatus('success')
          toast({
            title: "¡Email verificado!",
            description: "Tu dirección de correo electrónico ha sido verificada correctamente",
          })
        } else {
          setStatus('error')
          const data = await response.json()
          toast({
            title: "Error de verificación",
            description: data.error || "No se pudo verificar tu correo electrónico",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error al verificar email:', error)
        setStatus('error')
        toast({
          title: "Error inesperado",
          description: "Ocurrió un error al procesar la verificación",
          variant: "destructive",
        })
      }
    }

    verifyEmail()
  }, [searchParams, toast])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Verificación de correo electrónico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-center">Verificando tu correo electrónico...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-green-600">¡Verificación exitosa!</h3>
              <p className="mt-2 text-center">Tu dirección de correo electrónico ha sido verificada correctamente.</p>
              <p className="mt-4 text-center">Ahora podrás recibir confirmaciones de compras y notificaciones importantes sobre tus cursos.</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-red-600">Error de verificación</h3>
              <p className="mt-2 text-center">No se pudo verificar tu dirección de correo electrónico.</p>
              <p className="mt-4 text-center">El enlace puede haber caducado o no ser válido. Por favor, intenta registrarte nuevamente o contacta con soporte.</p>
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