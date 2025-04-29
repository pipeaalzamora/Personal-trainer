import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CommitTransactionResponse } from '@/app/types/transbank.types';
import { supabase } from '@/lib/supabase';
import { sendOrderConfirmationEmail } from '@/lib/email';

// Configuración de Transbank según el ambiente
const options = new Options(
  config.commerceCode, 
  config.apiKey, 
  config.environment as Environment
);

// Inicializar la transacción con la configuración
const tx = new WebpayPlus.Transaction(options);

export async function POST(req: NextRequest) {
  try {
    // Obtener el token y verifica si es válido
    const body = await req.formData();
    const token = body.get('token_ws') as string;

    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 400 });
    }

    // Confirmar la transacción con Transbank
    const response = await tx.commit(token) as CommitTransactionResponse;

    // Verificar si la transacción fue exitosa (0 = aprobada)
    const isSuccessful = response.response_code === 0;

    // Buscar la orden asociada a esta transacción
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_token', token)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: `Orden no encontrada: ${orderError?.message || ''}` }, 
        { status: 404 }
      );
    }

    // Actualizar el estado de la orden
    const newStatus = isSuccessful ? 'COMPLETED' : 'FAILED';
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        transaction_response: response 
      })
      .eq('id', order.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Error al actualizar la orden: ${updateError.message}` }, 
        { status: 500 }
      );
    }

    // Si la transacción fue exitosa, enviar correo de confirmación
    if (isSuccessful) {
      // Obtener datos del usuario
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', order.user_id)
        .single();

      // Obtener datos de los cursos comprados
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('course_id')
        .eq('order_id', order.id);

      if (user && orderItems && orderItems.length > 0) {
        // Obtener títulos de los cursos
        const courseIds = orderItems.map(item => item.course_id);
        const { data: courses } = await supabase
          .from('courses')
          .select('title')
          .in('id', courseIds);

        const courseTitles = courses ? courses.map(course => course.title) : [];

        // Enviar correo de confirmación
        await sendOrderConfirmationEmail(user.email, {
          orderId: order.id,
          buyOrder: order.buy_order,
          courseTitles,
          totalAmount: order.total_amount
        });
      }

      // Redirigir a la página de éxito
      return NextResponse.redirect(
        new URL(`/payment/success?order_id=${order.id}`, req.nextUrl.origin)
      );
    } else {
      // Redirigir a la página de error
      return NextResponse.redirect(
        new URL(`/payment/error?code=${response.response_code}`, req.nextUrl.origin)
      );
    }
  } catch (error) {
    console.error('Error procesando el pago:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    // En caso de error, redirigir a página de error
    return NextResponse.redirect(
      new URL(`/payment/error?message=${encodeURIComponent(errorMessage)}`, req.nextUrl.origin)
    );
  }
}