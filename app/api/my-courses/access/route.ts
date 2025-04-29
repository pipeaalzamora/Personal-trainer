import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmail } from '@/lib/supabase-api';
import { supabase } from '@/lib/supabase';

// En una aplicación real, necesitarías implementar autenticación
// Este endpoint simplificado verifica si el email almacenado en cookies
// ha comprado el curso solicitado

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'El parámetro courseId es requerido' }, 
        { status: 400 }
      );
    }
    
    // En una implementación real, obtendrías el usuario de la sesión autenticada
    // Para este ejemplo, usamos una cookie para almacenar el email
    const cookieStore = cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' }, 
        { status: 401 }
      );
    }
    
    // Buscar el usuario por email
    const user = await getUserByEmail(userEmail);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }
    
    // Verificar si el usuario ha comprado el curso
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        id,
        order:orders!inner(
          id,
          user_id,
          status
        )
      `)
      .eq('course_id', courseId)
      .eq('order.user_id', user.id)
      .eq('order.status', 'COMPLETED');
      
    if (error) {
      throw new Error(`Error al verificar acceso: ${error.message}`);
    }
    
    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: 'No has comprado este curso' }, 
        { status: 403 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Tienes acceso a este curso' 
    });
  } catch (error) {
    console.error('Error verificando acceso:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al verificar acceso' }, 
      { status: 500 }
    );
  }
} 