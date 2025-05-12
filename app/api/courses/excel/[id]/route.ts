import { NextRequest, NextResponse } from 'next/server';
import { getCourseExcelFile } from '@/lib/supabase-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const searchParams = req.nextUrl.searchParams;
    const fileIndex = searchParams.get('fileIndex');
    
    // Obtener el archivo Excel del curso
    const result = await getCourseExcelFile(id);
    
    if (!result.data && !result.isPackComplete) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Si es un pack completo
    if (result.isPackComplete && result.packFiles) {
      // Si no se especifica un índice, devolver la lista de archivos disponibles
      if (!fileIndex) {
        return NextResponse.json({
          isPackComplete: true,
          files: result.packFiles.map((file, index) => ({
            index,
            filename: file.filename,
            downloadUrl: `/api/courses/excel/${id}?fileIndex=${index}`
          }))
        });
      }

      // Si se especifica un índice, devolver ese archivo específico
      const fileIndexNum = parseInt(fileIndex);
      if (isNaN(fileIndexNum) || fileIndexNum < 0 || fileIndexNum >= result.packFiles.length) {
        return NextResponse.json(
          { error: 'Índice de archivo inválido' },
          { status: 400 }
        );
      }

      const selectedFile = result.packFiles[fileIndexNum];
      if (selectedFile.data && selectedFile.filename && selectedFile.contentType) {
        const response = new NextResponse(selectedFile.data);
        response.headers.set('Content-Type', selectedFile.contentType);
        response.headers.set('Content-Disposition', `attachment; filename="${selectedFile.filename}"`);
        return response;
      }
    }

    // Si no es un pack completo, enviar el archivo individual
    if (result.data && result.filename && result.contentType) {
      const response = new NextResponse(result.data);
      response.headers.set('Content-Type', result.contentType);
      response.headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
      return response;
    }

    return NextResponse.json(
      { error: 'Error al procesar el archivo' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error al descargar archivo Excel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al descargar archivo' },
      { status: 500 }
    );
  }
} 