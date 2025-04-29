import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    
    // Verificar si el curso existe
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    
    if (!course) {
      return NextResponse.json(
        { error: 'El curso no existe' },
        { status: 404 }
      );
    }
    
    // Obtener los materiales del curso
    const materials = await prisma.courseMaterial.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(materials);
  } catch (error: unknown) {
    console.error('Error obteniendo materiales:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al obtener los materiales' }, 
      { status: 500 }
    );
  }
} 