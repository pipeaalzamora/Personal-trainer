import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function GET(request: Request) {
  try {
    // Obtener el email de la query string
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'test@example.com';
    
    // Enviar un email de prueba
    const emailSent = await sendOrderConfirmationEmail(
      email,
      {
        orderId: "TEST-123",
        buyOrder: "TEST-ORDER",
        courseTitles: ["Curso de Prueba 1", "Curso de Prueba 2"],
        totalAmount: 19990
      }
    );
    
    // Responder con el resultado
    return NextResponse.json({
      success: emailSent,
      message: emailSent ? "Email enviado correctamente" : "Error al enviar email",
      to: email
    });
  } catch (error) {
    // Manejar errores
    console.error('Error al enviar email de prueba:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
} 