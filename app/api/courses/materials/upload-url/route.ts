import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
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
    const { data, error } = await supabase.storage
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