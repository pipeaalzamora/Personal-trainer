import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// En una aplicación real, necesitarías implementar autenticación
// Este endpoint simplificado verifica si el email almacenado en cookies
// ha comprado el curso solicitado

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'El parámetro courseId es requerido' }, 
        { status: 400 }
      );
    }
    
    // En una implementación real, obtendrías el usuario de la sesión autenticada
    // Para este ejemplo, usamos una cookie para almacenar el email
    const cookieStore = cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' }, 
        { status: 401 }
      );
    }
    
    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }
    
    // Verificar si el usuario ha comprado el curso
    const order = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        items: {
          some: {
            courseId
          }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'No has comprado este curso' }, 
        { status: 403 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Tienes acceso a este curso' 
    });
  } catch (error: unknown) {
    console.error('Error verificando acceso:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al verificar acceso' }, 
      { status: 500 }
    );
  }
} 