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
    // Obtener el token de la solicitud
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('Consultando estado de transacción con token:', token);
    
    // Consultar el estado de la transacción con Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al consultar la transacción:', errorText);
      throw new Error(`Error al consultar la transacción: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Respuesta de consulta de estado:', data);
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 