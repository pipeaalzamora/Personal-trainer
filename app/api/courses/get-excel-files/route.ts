import { NextResponse } from 'next/server';
import { getCoursesExcelFiles } from '@/lib/supabase-api';

// Cabeceras CORS para permitir peticiones desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Manejador para solicitudes OPTIONS (pre-flight CORS)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    // Obtener IDs de cursos de la solicitud
    const { courseIds } = await request.json();
    
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de cursos' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Obteniendo archivos Excel para ${courseIds.length} cursos:`, courseIds);
    
    // Obtener archivos Excel para los cursos
    const excelFiles = await getCoursesExcelFiles(courseIds);
    
    // Filtrar los archivos válidos
    const validFiles = excelFiles.filter(file => file.data !== null);
    console.log(`Se encontraron ${validFiles.length} archivos Excel válidos`);
    
    // Crear array de archivos adjuntos para el email
    const attachments = validFiles.map(file => ({
      filename: file.filename || `curso_${file.courseId}.xlsx`,
      content: file.data,
      contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }));
    
    // Devolver los archivos adjuntos
    return NextResponse.json(
      { 
        success: true, 
        attachments,
        message: `Se encontraron ${attachments.length} archivos adjuntos de ${courseIds.length} cursos solicitados`
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error al obtener archivos Excel:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener archivos Excel',
        success: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 