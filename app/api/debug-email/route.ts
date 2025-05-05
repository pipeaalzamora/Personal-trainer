import { NextResponse } from 'next/server';
import { sendPaymentReceiptEmail } from '@/lib/email';
import { Resend } from 'resend';

export async function GET(request: Request) {
  try {
    // Obtener el email de la query string
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'test@example.com';
    const action = url.searchParams.get('action') || 'info';
    
    // Información de configuración
    const config = {
      resendApiKey: process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ No configurada',
      fromEmail: 'onboarding@resend.dev',
      nodeEnv: process.env.NODE_ENV,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    };
    
    // Si la acción es enviar, enviar un correo de prueba
    if (action === 'send') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // 1. Envío directo con Resend
        const { data: directData, error: directError } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Prueba directa de Resend',
          html: '<strong>Esto es una prueba directa de Resend</strong>'
        });
        
        // 2. Envío a través de nuestra función helper
        const helperResult = await sendPaymentReceiptEmail(
          email,
          {
            transactionId: "DEBUG-123",
            cardNumber: "4242",
            amount: 19990,
            date: new Date().toLocaleString('es-ES'),
            authCode: "DEBUG-987"
          }
        );
        
        return NextResponse.json({
          status: 'success',
          config,
          emailSent: {
            direct: {
              success: !directError,
              messageId: directData?.id,
              error: directError ? directError.message : null
            },
            helper: {
              success: helperResult
            }
          },
          targetEmail: email
        });
      } catch (sendError) {
        return NextResponse.json({
          status: 'error',
          config,
          error: sendError instanceof Error ? sendError.message : 'Error desconocido al enviar',
          targetEmail: email
        }, { status: 500 });
      }
    } else {
      // Solo retornar la información de configuración
      return NextResponse.json({
        status: 'success',
        config,
        message: 'Utiliza ?action=send&email=tu@correo.com para enviar un correo de prueba'
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 