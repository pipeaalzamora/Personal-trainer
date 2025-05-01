import { NextResponse } from 'next/server';
import { sendPaymentReceiptEmail } from '@/lib/email';

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
    const { 
      email, 
      transactionId,
      cardNumber,
      amount,
      date,
      authCode
    } = await request.json();
    
    if (!email || !transactionId || !cardNumber || !amount) {
      return NextResponse.json(
        { 
          error: 'Faltan datos requeridos', 
          requiredFields: ['email', 'transactionId', 'cardNumber', 'amount'] 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Enviar email de comprobante de pago
    const emailSent = await sendPaymentReceiptEmail(
      email,
      {
        transactionId,
        cardNumber,
        amount,
        date: date || new Date().toLocaleString('es-ES'),
        authCode: authCode || 'N/A'
      }
    );
    
    if (!emailSent) {
      console.error('Error al enviar comprobante de pago');
      return NextResponse.json(
        { success: false, message: 'Error al enviar comprobante de pago' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Comprobante de pago enviado correctamente' },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 