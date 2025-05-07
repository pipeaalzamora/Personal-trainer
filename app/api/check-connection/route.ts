import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/supabase';

export async function GET() {
  try {
    const result = await testConnection();
    
    if (!result.success) {
      console.error('Error de conexión a Supabase:', result.error);
      return NextResponse.json({ 
        success: false, 
        message: 'Error de conexión a la base de datos', 
        error: result.error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexión a la base de datos establecida correctamente',
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Error inesperado al verificar conexión:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error inesperado al verificar conexión', 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 