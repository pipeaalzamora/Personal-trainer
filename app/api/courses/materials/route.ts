import { NextRequest, NextResponse } from 'next/server';
import { getCourseById, getCourseFiles } from '@/lib/supabase-api';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminRequest } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    const { courseId, title, description, path, fileType, fileSize, fileName } = body;

    if (!courseId || !path || !fileType || !fileSize || !fileName) {
      return NextResponse.json(
        { error: 'courseId, path, fileType, fileSize y fileName son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el curso existe
    const course = await getCourseById(courseId);

    if (!course) {
      return NextResponse.json(
        { error: 'El curso no existe' },
        { status: 404 }
      );
    }

    // Registrar el archivo en la base de datos
    const { data, error } = await supabaseAdmin.from('files').insert([
      {
        course_id: courseId,
        name: fileName,
        path: path,
        type: fileType,
        size: fileSize,
        description: description || ''
      }
    ]).select().single();

    if (error) {
      throw new Error(`Error al registrar el archivo: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creando material:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear el material' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'El parámetro courseId es requerido' },
        { status: 400 }
      );
    }

    // Obtener los archivos del curso
    const files = await getCourseFiles(courseId);

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error obteniendo materiales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener los materiales' },
      { status: 500 }
    );
  }
}
