import { NextRequest, NextResponse } from 'next/server';
import { getCourseById } from '@/lib/supabase-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Obtener el curso por su ID
    const course = await getCourseById(id);
    
    if (!course) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error obteniendo curso:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener el curso' }, 
      { status: 500 }
    );
  }
} 