import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

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
      orderId,
      buyOrder, 
      courseTitles, 
      totalAmount,
      attachments
    } = await request.json();
    
    if (!email || !orderId || !buyOrder || !courseTitles || !totalAmount) {
      return NextResponse.json(
        { 
          error: 'Faltan datos requeridos', 
          requiredFields: ['email', 'orderId', 'buyOrder', 'courseTitles', 'totalAmount'] 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Convertir los attachments de base64 a Buffer si existen
    let processedAttachments;
    if (attachments && Array.isArray(attachments)) {
      try {
        processedAttachments = attachments.map(attachment => {
          // Si el contenido ya está en formato Buffer, usarlo directamente
          let content = attachment.content;
          
          // Si es una cadena base64, convertirla a Buffer
          if (typeof attachment.content === 'string') {
            content = Buffer.from(attachment.content, 'base64');
          }
          
          return {
            filename: attachment.filename,
            content,
            contentType: attachment.contentType
          };
        });
        
        console.log(`Preparados ${processedAttachments.length} archivos adjuntos para enviar por email`);
      } catch (attachError) {
        console.error('Error al procesar archivos adjuntos:', attachError);
        // Continuar sin archivos adjuntos
        processedAttachments = undefined;
      }
    }
    
    // Enviar email de confirmación
    const emailSent = await sendOrderConfirmationEmail(
      email,
      {
        orderId,
        buyOrder,
        courseTitles,
        totalAmount,
        attachments: processedAttachments
      }
    );
    
    if (!emailSent) {
      console.error('Error al enviar email de confirmación');
      return NextResponse.json(
        { success: false, message: 'Error al enviar email de confirmación' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Email de confirmación enviado correctamente',
        withAttachments: !!processedAttachments
      },
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