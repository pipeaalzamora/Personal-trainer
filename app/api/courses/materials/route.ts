import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, title, description, fileUrl, fileType } = body;
    
    if (!courseId || !title || !fileUrl || !fileType) {
      return NextResponse.json(
        { error: 'courseId, title, fileUrl y fileType son requeridos' }, 
        { status: 400 }
      );
    }
    
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
    
    // Crear el material en la base de datos
    const material = await prisma.courseMaterial.create({
      data: {
        courseId,
        title,
        description,
        fileUrl,
        fileType
      }
    });
    
    return NextResponse.json(material);
  } catch (error: unknown) {
    console.error('Error creando material:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al crear el material' }, 
      { status: 500 }
    );
  }
}

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