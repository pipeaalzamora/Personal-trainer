import { NextRequest, NextResponse } from 'next/server';
import { deleteCourseFile } from '@/lib/supabase-api';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Eliminar el archivo de Supabase Storage y su registro en la base de datos
    await deleteCourseFile(id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Material eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error eliminando material:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al eliminar el material' }, 
      { status: 500 }
    );
  }
} 