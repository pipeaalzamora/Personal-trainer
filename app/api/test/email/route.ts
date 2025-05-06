import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

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
    // Obtener email de destino de la solicitud
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Se requiere una dirección de email' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Enviando email de prueba a: ${email}`);
    
    // Crear HTML para el email de prueba - Optimizado para iCloud
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; padding: 0;">Coach Inostroza</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
          <h2 style="color: #dc2626; margin-top: 0;">Email de Prueba</h2>
          <p>Hola,</p>
          <p>Este es un email de prueba para verificar la configuración de envío de correos.</p>
          <p>Si estás recibiendo este correo, significa que nuestro sistema de envío de emails funciona correctamente con cuentas de iCloud.</p>
          
          <p style="margin-top: 30px;">Saludos,<br><strong>El equipo de Coach Inostroza</strong></p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Coach Inostroza. Todos los derechos reservados.</p>
          <p>Este correo fue enviado a ${email} como prueba de configuración.</p>
        </div>
      </div>
    `;
    
    // Enviar el email de prueba
    const emailSent = await sendEmail({
      to: email,
      subject: 'Prueba de configuración de correo - Coach Inostroza',
      html,
    });
    
    if (!emailSent) {
      console.error('Error al enviar email de prueba');
      return NextResponse.json(
        { success: false, message: 'Error al enviar email de prueba' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Email de prueba enviado correctamente' },
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