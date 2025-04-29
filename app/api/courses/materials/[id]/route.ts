import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

export async function DELETE(
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
    
    // Eliminar el archivo de S3
    await deleteFile(material.fileUrl);
    
    // Eliminar el material de la base de datos
    await prisma.courseMaterial.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Material eliminado correctamente' 
    });
  } catch (error: unknown) {
    console.error('Error eliminando material:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al eliminar el material' }, 
      { status: 500 }
    );
  }
} 