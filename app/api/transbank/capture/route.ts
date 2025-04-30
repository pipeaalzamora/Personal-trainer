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
    const { token, buy_order, authorization_code, capture_amount } = await request.json();
    
    if (!token || !buy_order || !authorization_code || !capture_amount) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: token, buy_order, authorization_code, capture_amount' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('Procesando captura para transacción:', {
      token,
      buy_order,
      authorization_code,
      capture_amount
    });
    
    // URL de la API de captura de Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}/capture`;
    
    // Realizar solicitud de captura a Transbank
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey
      },
      body: JSON.stringify({
        buy_order: buy_order,
        authorization_code: authorization_code,
        capture_amount: capture_amount
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al capturar la transacción:', errorText);
      throw new Error(`Error al capturar la transacción: ${response.status} ${response.statusText}`);
    }
    
    // Devolver respuesta al cliente
    const data = await response.json();
    console.log('Respuesta de captura:', data);
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 