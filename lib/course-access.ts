import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserByEmail } from '@/lib/supabase-api';
import { getUserEmailFromRequest, isAdminRequest } from '@/lib/server-auth';

export async function userHasCompletedCourseAccess(email: string, courseId: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  if (!user) return false;

  const { data, error } = await supabaseAdmin
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
    .eq('order.status', 'COMPLETED')
    .limit(1);

  if (error) {
    throw new Error(`Error al verificar acceso: ${error.message}`);
  }

  return Boolean(data && data.length > 0);
}

export async function requireCourseAccess(request: Request, courseId: string): Promise<NextResponse | null> {
  if (isAdminRequest(request)) {
    return null;
  }

  const email = getUserEmailFromRequest(request);
  if (!email) {
    return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
  }

  const hasAccess = await userHasCompletedCourseAccess(email, courseId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'No tienes acceso a este curso' }, { status: 403 });
  }

  return null;
}
