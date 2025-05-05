import { NextResponse } from 'next/server';
import { sendPaymentReceiptEmail } from '@/lib/email';

export async function GET(request: Request) {
  try {
    // Obtener el email de la query string
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'test@example.com';
    
    // Enviar un email de prueba directamente
    const emailSent = await sendPaymentReceiptEmail(
      email,
      {
        transactionId: "TEST-123",
        cardNumber: "4242",
        amount: 19990,
        date: new Date().toLocaleString('es-ES'),
        authCode: "123456"
      }
    );
    
    // Devolver el resultado
    return NextResponse.json({
      success: emailSent,
      message: emailSent ? "Email enviado correctamente" : "Error al enviar email",
      email: email
    });
  } catch (error) {
    console.error('Error al enviar email de prueba:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
} 