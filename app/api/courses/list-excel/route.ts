import { NextResponse } from 'next/server';
import { getAllExcelFiles } from '@/lib/supabase-api';

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

// Listar todos los archivos Excel disponibles en el bucket
export async function GET(request: Request) {
  try {
    console.log('Obteniendo listado de archivos Excel disponibles');
    
    const files = await getAllExcelFiles();
    
    console.log(`Se encontraron ${files.length} archivos Excel`);
    
    // Agrupar los archivos por curso
    const filesByCourse = files.reduce((acc, file) => {
      const courseId = file.course_id;
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(file);
      return acc;
    }, {} as Record<string, typeof files>);
    
    return NextResponse.json(
      { 
        success: true, 
        totalFiles: files.length,
        totalCourses: Object.keys(filesByCourse).length,
        files,
        filesByCourse
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error al listar archivos Excel:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 