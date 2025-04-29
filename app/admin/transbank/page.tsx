"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

export default function TransbankConfigPage() {
  const [commerceCode, setCommerceCode] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [environment, setEnvironment] = useState('Integration')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Esta función en un entorno real guardaría la configuración
  // Por ahora solo mostrará instrucciones
  const handleSaveConfig = () => {
    setIsSaving(true)
    
    // Simulamos una operación asíncrona
    setTimeout(() => {
      setIsSaving(false)
      
      toast({
        title: "Configuración guardada",
        description: "Para aplicar estos cambios, debes actualizar tu archivo .env.local",
      })
    }, 1000)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Configuración de Transbank</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Credenciales de Transbank</CardTitle>
            <CardDescription>
              Configura tus credenciales para procesar pagos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commerceCode">Código de Comercio</Label>
              <Input 
                id="commerceCode"
                value={commerceCode}
                onChange={(e) => setCommerceCode(e.target.value)}
                placeholder="597055555532" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C" 
              />
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <RadioGroup 
                value={environment} 
                onValueChange={setEnvironment}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Integration" id="integration" />
                  <Label htmlFor="integration">Integración (Pruebas)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Production" id="production" />
                  <Label htmlFor="production">Producción</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveConfig} 
              disabled={isSaving || !commerceCode || !apiKey}
            >
              {isSaving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
            <CardDescription>
              Cómo configurar Transbank en tu aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Crea un archivo .env.local</h3>
              <p className="text-sm text-gray-600">
                En la raíz de tu proyecto, crea un archivo .env.local con las siguientes variables:
              </p>
              <pre className="bg-gray-100 p-3 rounded-md mt-2 text-xs overflow-x-auto">
                {`# URL base del sitio (sin barra final)
NEXT_PUBLIC_BASE_URL=https://personal-trainer-roan.vercel.app

# Credenciales de Transbank
TRANSBANK_COMMERCE_CODE=${commerceCode || "597055555532"}
TRANSBANK_API_KEY=${apiKey || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"}
TRANSBANK_ENVIRONMENT=${environment}
`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">2. Reinicia el servidor</h3>
              <p className="text-sm text-gray-600">
                Para que los cambios surtan efecto, reinicia el servidor de desarrollo:
              </p>
              <pre className="bg-gray-100 p-3 rounded-md mt-2 text-xs">
                npm run dev
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">3. Prueba la integración</h3>
              <p className="text-sm text-gray-600">
                Para el ambiente de integración, puedes usar las siguientes tarjetas de prueba:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                <li>VISA: 4051 8856 0044 6623</li>
                <li>AMEX: 3700 0000 0002 032</li>
                <li>MASTERCARD: 5186 0595 5959 0568</li>
                <li>Fecha expiración: Cualquiera en el futuro</li>
                <li>CVV: 123</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 