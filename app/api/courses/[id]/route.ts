import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Obtener el curso por su ID
    const course = await prisma.course.findUnique({
      where: { id }
    });
    
    if (!course) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(course);
  } catch (error: unknown) {
    console.error('Error obteniendo curso:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al obtener el curso' }, 
      { status: 500 }
    );
  }
} 