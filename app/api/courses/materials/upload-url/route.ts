import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminRequest } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    const { courseId, fileName, contentType } = body;

    if (!courseId || !fileName || !contentType) {
      return NextResponse.json(
        { error: 'courseId, fileName y contentType son requeridos' },
        { status: 400 }
      );
    }

    // Generar un nombre único para el archivo
    const uniqueFileName = `courses/${courseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9\.-]/g, '_')}`;

    // Generar URL prefirmada para subir el archivo
    const { data, error } = await supabaseAdmin.storage
      .from('course-files')
      .createSignedUploadUrl(uniqueFileName);

    if (error) {
      throw new Error(`Error al generar URL de carga: ${error.message}`);
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: uniqueFileName,
      token: data.token
    });
  } catch (error) {
    console.error('Error generando URL de carga:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar URL de carga' },
      { status: 500 }
    );
  }
}
