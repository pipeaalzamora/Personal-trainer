import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
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
    
    // Obtener los cursos comprados por el usuario
    const purchasedCourses = await prisma.course.findMany({
      where: {
        orderItems: {
          some: {
            order: {
              userId: user.id,
              status: 'COMPLETED'
            }
          }
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        image: true
      }
    });
    
    return NextResponse.json(purchasedCourses);
  } catch (error: unknown) {
    console.error('Error obteniendo cursos:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al obtener los cursos' }, 
      { status: 500 }
    );
  }
} 