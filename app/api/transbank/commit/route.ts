import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CommitTransactionResponse } from '@/app/types/transbank.types';
import { supabase } from '@/lib/supabase';
import { sendOrderConfirmationEmail } from '@/lib/email';

const options = new Options(config.commerceCode, config.apiKey, config.environment as Environment);
const tx = new WebpayPlus.Transaction(options);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'El token de transacción es requerido' }, 
        { status: 400 }
      );
    }
    
    // Buscar la orden asociada al token en Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(*),
        items:order_items(*, course:courses(*))
      `)
      .eq('transaction_token', token)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'No se encontró la orden asociada a esta transacción' },
        { status: 404 }
      );
    }
    
    // Confirmar la transacción con Transbank
    const response = await tx.commit(token) as CommitTransactionResponse;
    
    // Comprobar el estado de la transacción
    if (response.response_code === 0) {
      // La transacción fue aprobada
      // Actualizar la orden en Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'COMPLETED',
          authorization_code: response.authorization_code,
          payment_type: response.payment_type_code,
          card_number: response.card_detail ? response.card_detail.card_number : null
        })
        .eq('id', order.id);
      
      if (updateError) {
        throw new Error(`Error al actualizar la orden: ${updateError.message}`);
      }
      
      // Enviar correo de confirmación
      const courseTitles = order.items.map((item: any) => item.course.title as string);
      
      await sendOrderConfirmationEmail(
        order.user.email,
        {
          orderId: order.id,
          buyOrder: order.buy_order,
          courseTitles,
          totalAmount: order.total_amount
        }
      );
      
      return NextResponse.json({
        ...response,
        status: 'AUTHORIZED'
      });
    } else {
      // La transacción fue rechazada
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'FAILED'
        })
        .eq('id', order.id);
      
      if (updateError) {
        throw new Error(`Error al actualizar la orden: ${updateError.message}`);
      }
      
      return NextResponse.json({
        ...response,
        status: 'REJECTED',
        error: obtenerMensajeError(response.response_code)
      });
    }
  } catch (error: unknown) {
    console.error('Error confirmando transacción:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message || 'Error al confirmar la transacción',
        status: 'ERROR'
      }, 
      { status: 500 }
    );
  }
}

// Función para obtener mensajes de error según el código de respuesta
function obtenerMensajeError(responseCode: number): string {
  const mensajes: Record<number, string> = {
    '-1': 'Rechazo por error en el comercio',
    '-2': 'Rechazo por error en la tarjeta',
    '-3': 'Error en la transacción',
    '-4': 'Rechazo por monto inválido',
    '-5': 'Rechazo por error general',
    '-6': 'Rechazo por exceder el monto máximo permitido',
    '-7': 'Rechazo por exceder el límite de intentos permitidos',
  };

  return mensajes[responseCode] || `Error desconocido (código ${responseCode})`;
}