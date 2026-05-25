import { NextRequest, NextResponse } from 'next/server';
import { deleteCourseFile } from '@/lib/supabase-api';
import { requireAdminRequest } from '@/lib/server-auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const { id } = await params;

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
