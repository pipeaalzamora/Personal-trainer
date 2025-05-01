import { NextResponse } from 'next/server';
import { config } from '@/config/config';
import { updateOrderTransaction, getOrderByBuyOrder, addOrderTransactionHistory } from '@/lib/supabase-api';

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
    // Obtener el token de la solicitud
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('🔄 Confirmando transacción con token:', token);
    
    // Confirmar la transacción con Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`;
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error al confirmar la transacción:', errorText);
      throw new Error(`Error al confirmar la transacción: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Respuesta de confirmación:', data);
    
    // Determinar el estado según la respuesta
    const status = data.response_code === 0 ? 'COMPLETED' : 'FAILED';
    console.log(`Estado determinado: ${status}, código de respuesta: ${data.response_code}`);
    
    // Verificar si la orden existe
    try {
      const existingOrder = await getOrderByBuyOrder(data.buy_order);
      console.log(`Orden encontrada: ${existingOrder ? existingOrder.id : 'No encontrada'}`);
      
      if (!existingOrder) {
        console.warn(`⚠️ No se encontró la orden con buy_order=${data.buy_order}`);
      } else {
        console.log(`Estado actual de la orden: ${existingOrder.status}`);
      }
    } catch (orderError) {
      console.error('❌ Error al buscar la orden:', orderError);
    }
    
    // Actualizar la orden en Supabase
    try {
      const updatedOrder = await updateOrderTransaction(
        data.buy_order,
        status,
        data,
        token
      );
      console.log(`✅ Orden ${data.buy_order} actualizada en base de datos con estado: ${status}`);
      console.log(`ID de la orden actualizada: ${updatedOrder.id}`);
      
      // Registrar en el historial de transacciones
      if (updatedOrder && updatedOrder.id) {
        await addOrderTransactionHistory(
          updatedOrder.id,
          status,
          {
            token,
            amount: data.amount,
            timestamp: new Date().toISOString(),
            response_code: data.response_code,
            transaction_date: data.transaction_date,
            card_number: data.card_detail?.card_number || ''
          }
        );
        
        console.log(`✅ Historial de transacción registrado para orden ${data.buy_order}: ${status}`);
      } else {
        console.error('❌ No se pudo registrar historial: updatedOrder no válido');
      }
    } catch (dbError) {
      console.error('❌ Error al actualizar la orden en la base de datos:', dbError);
      // No interrumpimos el flujo principal si falla la actualización en BD
    }
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 