import { NextRequest, NextResponse } from 'next/server';
import { getCourseById, getCourseFiles } from '@/lib/supabase-api';
import { requireCourseAccess } from '@/lib/course-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const unauthorized = await requireCourseAccess(req, courseId);
    if (unauthorized) return unauthorized;

    // Verificar si el curso existe
    const course = await getCourseById(courseId);

    if (!course) {
      return NextResponse.json(
        { error: 'El curso no existe' },
        { status: 404 }
      );
    }

    // Obtener los materiales del curso
    const files = await getCourseFiles(courseId);
    const materials = files.map(file => ({
      id: file.id,
      title: file.name,
      description: 'description' in file ? file.description : null,
      fileType: file.type,
      createdAt: file.created_at,
    }));

    return NextResponse.json(materials);
  } catch (error) {
    console.error('Error obteniendo materiales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener los materiales' },
      { status: 500 }
    );
  }
}
