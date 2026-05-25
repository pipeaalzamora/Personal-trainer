import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserOrders, getOrderItems } from '@/lib/supabase-api';
import { getUserEmailFromRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(req);

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

    // Obtener las órdenes completadas del usuario
    const userOrders = await getUserOrders(user.id);
    const completedOrders = userOrders.filter(order => order.status === 'COMPLETED');

    if (completedOrders.length === 0) {
      return NextResponse.json([]);
    }

    // Obtener los cursos únicos de todas las órdenes completadas
    const purchasedCourseIds = new Set<string>();
    let purchasedCourses = [];

    for (const order of completedOrders) {
      const orderItems = await getOrderItems(order.id);

      for (const item of orderItems) {
        if (!purchasedCourseIds.has(item.course_id)) {
          purchasedCourseIds.add(item.course_id);
          purchasedCourses.push(item.course);
        }
      }
    }

    return NextResponse.json(purchasedCourses);
  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener los cursos' },
      { status: 500 }
    );
  }
}
