import { NextRequest, NextResponse } from 'next/server';
import { getCourseById, getCourseFiles } from '@/lib/supabase-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    
    // Verificar si el curso existe
    const course = await getCourseById(courseId);
    
    if (!course) {
      return NextResponse.json(
        { error: 'El curso no existe' },
        { status: 404 }
      );
    }
    
    // Obtener los materiales del curso
    const materials = await getCourseFiles(courseId);
    
    return NextResponse.json(materials);
  } catch (error) {
    console.error('Error obteniendo materiales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener los materiales' }, 
      { status: 500 }
    );
  }
} 