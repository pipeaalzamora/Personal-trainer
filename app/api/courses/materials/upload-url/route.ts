import { NextRequest, NextResponse } from 'next/server';
import { generateCourseMaterialPath, generateUploadUrl } from '@/lib/s3';

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
    
    // Generar la ruta del archivo en S3
    const key = generateCourseMaterialPath(courseId, fileName);
    
    // Generar URL prefirmada para subir el archivo
    const uploadUrl = await generateUploadUrl(key, contentType);
    
    return NextResponse.json({ uploadUrl, key });
  } catch (error: unknown) {
    console.error('Error generando URL de carga:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al generar URL de carga' }, 
      { status: 500 }
    );
  }
} 