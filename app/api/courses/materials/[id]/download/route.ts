import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateDownloadUrl } from '@/lib/s3';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Buscar el material en la base de datos
    const material = await prisma.courseMaterial.findUnique({
      where: { id }
    });
    
    if (!material) {
      return NextResponse.json(
        { error: 'Material no encontrado' },
        { status: 404 }
      );
    }
    
    // Generar URL de descarga
    const downloadUrl = await generateDownloadUrl(material.fileUrl);
    
    // Redirigir al usuario a la URL de descarga
    return NextResponse.redirect(downloadUrl);
  } catch (error: unknown) {
    console.error('Error generando URL de descarga:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al generar URL de descarga' }, 
      { status: 500 }
    );
  }
} 