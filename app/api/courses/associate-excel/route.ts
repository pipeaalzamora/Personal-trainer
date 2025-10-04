import { NextResponse } from 'next/server';
import { associateExcelToCourse } from '@/lib/supabase-api';

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

// Asociar un archivo Excel específico a un curso
export async function POST(request: Request) {
  try {
    // Obtener datos de la solicitud
    const { courseId, excelFile } = await request.json();
    
    if (!courseId || !excelFile) {
      return NextResponse.json(
        { error: 'Se requiere courseId y excelFile' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Asociando archivo Excel al curso ${courseId}:`, excelFile.filename);
    
    // Asociar archivo al curso
    const success = await associateExcelToCourse(courseId, excelFile);
    
    if (success) {
      return NextResponse.json(
        { 
          success: true, 
          message: `Archivo ${excelFile.filename} asociado correctamente al curso ${courseId}`
        },
        { headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: `Error al asociar archivo ${excelFile.filename} al curso ${courseId}`
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error al asociar archivo Excel:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Asociar automáticamente todos los archivos Excel a sus cursos
export async function GET(request: Request) {
  try {
    console.log('Endpoint GET deshabilitado - función associateAllExcelFilesToCourses no implementada');
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Esta funcionalidad no está implementada. Use el método POST para asociar archivos individuales.'
      },
      { status: 501, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error en endpoint GET:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 