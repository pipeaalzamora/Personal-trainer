import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireCourseAccess } from '@/lib/course-access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar el archivo en la base de datos
    const { data: fileData, error: fetchError } = await supabaseAdmin
      .from('files')
      .select('path, name, course_id')
      .eq('id', id)
      .single();

    if (fetchError || !fileData) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    const file = fileData as { path: string; name: string; course_id: string };

    const unauthorized = await requireCourseAccess(req, file.course_id);
    if (unauthorized) return unauthorized;

    // Generar URL de descarga firmada (válida por 60 minutos)
    const { data: signedUrl, error: signedUrlError } = await supabaseAdmin.storage
      .from('course-files')
      .createSignedUrl(file.path, 60 * 60);

    if (signedUrlError) {
      throw new Error(`Error al generar URL de descarga: ${signedUrlError.message}`);
    }

    // Redirigir al usuario a la URL de descarga
    return NextResponse.redirect(signedUrl.signedUrl);
  } catch (error) {
    console.error('Error generando URL de descarga:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar URL de descarga' },
      { status: 500 }
    );
  }
}
