import { NextResponse } from 'next/server';
import { updateOrderTransaction, getOrderByBuyOrder, addOrderTransactionHistory } from '@/lib/supabase-api';

// Cabeceras CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    const { buyOrder, token, status, additionalData } = await request.json();
    
    if (!buyOrder || !status) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (buyOrder, status)' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Actualizando orden ${buyOrder} a estado: ${status}`);
    
    // Primero obtener la orden actual
    const existingOrder = await getOrderByBuyOrder(buyOrder);
    if (!existingOrder) {
      console.error(`Orden no encontrada: ${buyOrder}`);
      return NextResponse.json(
        { error: 'Orden no encontrada con ese buy_order' },
        { status: 404, headers: corsHeaders }
      );
    }
    
    console.log(`Orden encontrada: ${existingOrder.id}, estado actual: ${existingOrder.status}`);
    
    // Actualizar la orden en Supabase
    const updatedOrder = await updateOrderTransaction(
      buyOrder,
      status,
      additionalData || {},
      token || ''
    );
    
    console.log(`Orden actualizada: ${updatedOrder.id}, nuevo estado: ${updatedOrder.status}`);
    
    // Registrar en el historial de transacciones
    try {
      const historyEntry = await addOrderTransactionHistory(
        updatedOrder.id,
        status,
        {
          token,
          timestamp: new Date().toISOString(),
          ...additionalData
        }
      );
      console.log(`Historial de transacción registrado para orden ${buyOrder}: ${status}`);
    } catch (historyError) {
      console.error('Error al registrar historial de transacción:', historyError);
      // No interrumpimos el flujo principal si falla el registro del historial
    }
    
    return NextResponse.json(
      { 
        success: true, 
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          buy_order: updatedOrder.buy_order
        }
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 