import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/supabase-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extraer el token de verificación de la URL
    const searchParams = new URL(request.url).searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token de verificación no proporcionado' },
        { status: 400 }
      );
    }

    // Verificar el usuario con el token proporcionado
    const success = await verifyUser(token);

    if (!success) {
      return NextResponse.json(
        { error: 'Token de verificación inválido o expirado' },
        { status: 400 }
      );
    }

    // Redirigir al usuario a una página de éxito
    return NextResponse.redirect(new URL('/verify-success', request.url));
  } catch (error) {
    console.error('Error al verificar email:', error);
    
    return NextResponse.json(
      { error: 'Ocurrió un error al verificar tu correo electrónico' },
      { status: 500 }
    );
  }
} 