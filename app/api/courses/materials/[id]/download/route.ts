import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Buscar el archivo en la base de datos
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('path, name')
      .eq('id', id)
      .single();
    
    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
    
    // Generar URL de descarga firmada (válida por 60 minutos)
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
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