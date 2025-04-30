import { NextResponse } from 'next/server';
import { config } from '@/config/config';

// Cabeceras CORS para permitir peticiones desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Manejador para solicitudes OPTIONS (pre-flight CORS)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    // Obtener datos de la solicitud
    const { token, amount } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!amount) {
      return NextResponse.json(
        { error: 'Monto no proporcionado' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('Procesando reembolso para token:', token, 'por monto:', amount);
    
    // Realizar el reembolso con Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}/refunds`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey
      },
      body: JSON.stringify({
        amount: amount
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al procesar reembolso:', errorText);
      throw new Error(`Error al procesar reembolso: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Respuesta de reembolso:', data);
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 