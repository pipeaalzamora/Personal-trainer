import { NextResponse } from 'next/server';
import { config } from '@/config/config';
import { updateOrderTransaction, getOrderByBuyOrder, addOrderTransactionHistory, getOrderItems, getUserByEmail, getCoursesExcelFiles } from '@/lib/supabase-api';
import { sendOrderConfirmationEmail, sendPaymentReceiptEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

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
    
    // Actualizar la orden en Supabase - OPERACIÓN CRÍTICA
    let updatedOrder = null;
    try {
      updatedOrder = await updateOrderTransaction(
        data.buy_order,
        status,
        data,
        token
      );
      console.log(`✅ Orden ${data.buy_order} actualizada en base de datos con estado: ${status}`);
    } catch (dbError) {
      console.error('❌ Error al actualizar orden:', dbError);
      // Continuar para devolver respuesta al cliente
    }
    
    // IMPORTANTE: En lugar de procesar todo aquí, delegamos el procesamiento de emails 
    // y archivos a una función asíncrona que se ejecutará después de devolver la respuesta
    
    // Iniciar el procesamiento posterior de forma asíncrona
    if (updatedOrder && status === 'COMPLETED') {
      // Esta función se ejecutará después de que hayamos respondido al cliente
      processPurchaseCompletionAsync(updatedOrder, data).catch(error => 
        console.error('❌ Error en procesamiento asíncrono:', error)
      );
    }
    
    // Devolver respuesta inmediatamente al cliente
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Función asíncrona para procesar operaciones no críticas después de completar la transacción
async function processPurchaseCompletionAsync(updatedOrder: any, transactionData: any) {
  try {
    // Registrar en el historial de transacciones
    const orderItems = await getOrderItems(updatedOrder.id);
    const courseNames = orderItems.map(item => item.course?.title || 'Curso desconocido');

    // 1. Agregar entrada en historial
    await addOrderTransactionHistory(
      updatedOrder.id,
      'COMPLETED',
      { courseNames }
    ).catch(err => console.error('Error al agregar historial:', err));
    
    console.log(`✅ Historial de transacción registrado para orden ${updatedOrder.id}`);
    
    // 2. Obtener email del usuario
    let email: string | null = null;
    
    // Intentar obtener el email de diferentes fuentes
    const transactionResponseData = updatedOrder.transaction_response;
    if (transactionResponseData && 
        typeof transactionResponseData === 'object' && 
        'sessionData' in transactionResponseData && 
        typeof transactionResponseData.sessionData === 'object' &&
        transactionResponseData.sessionData &&
        'email' in transactionResponseData.sessionData) {
      email = transactionResponseData.sessionData.email as string;
    }
    
    // Si no hay email en la transacción, intentar obtenerlo por user_id
    if (!email && updatedOrder.user_id) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', updatedOrder.user_id)
          .single();
        
        if (userData && userData.email) {
          email = userData.email;
        }
      } catch (userError) {
        console.error('Error al obtener usuario por ID:', userError);
      }
    }
    
    // Última opción: revisar el session_id
    if (!email) {
      const sessionParts = updatedOrder.session_id.split('-');
      const possibleEmail = sessionParts[0];
      if (possibleEmail && possibleEmail.includes('@')) {
        email = possibleEmail;
      }
    }
    
    if (email) {
      // 3. Procesar y enviar emails
      await processPurchaseEmails(email, updatedOrder, orderItems, transactionData);
    } else {
      console.error(`No se pudo obtener email para la orden ${updatedOrder.id}`);
    }
  } catch (error) {
    console.error('Error en procesamiento asíncrono:', error);
  }
}

// Función para procesar y enviar emails
async function processPurchaseEmails(
  email: string, 
  order: any, 
  orderItems: any[], 
  transactionData: any
) {
  try {
    // Preparar datos para emails
    const courseIds = orderItems.map(item => item.course_id);
    const courseTitles = orderItems.map(item => 
      item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
    );
    const courseCategories = orderItems.map(item => 
      item.course && 'category' in item.course && item.course.category ? item.course.category : 'Sin categoría'
    );
    
    // 1. Enviar comprobante de pago (operación más ligera primero)
    await sendPaymentReceiptEmail(
      email,
      {
        transactionId: transactionData.buy_order,
        cardNumber: transactionData.card_detail?.card_number || '',
        amount: transactionData.amount,
        date: new Date(transactionData.transaction_date).toLocaleString('es-ES'),
        authCode: transactionData.authorization_code
      }
    ).catch(err => console.error('Error al enviar comprobante:', err));
    
    // 2. Obtener archivos Excel de los cursos (operación más pesada)
    let attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];
    
    try {
      // Intentar obtener los archivos Excel
      const excelFiles = await getCoursesExcelFiles(courseIds);
      attachments = excelFiles
        .filter(file => file.data !== null)
        .map(file => ({
          filename: file.filename || `curso.xlsx`,
          content: file.data as Buffer,
          contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }));
    } catch (excelError) {
      console.error('Error al obtener archivos Excel:', excelError);
      // Continuar sin attachments
    }
    
    // 3. Enviar correo de confirmación de compra con los attachments
    await sendOrderConfirmationEmail(
      email,
      {
        orderId: order.id,
        buyOrder: transactionData.buy_order,
        courseTitles,
        courseCategories,
        totalAmount: transactionData.amount,
        attachments: attachments.length > 0 ? attachments : undefined
      }
    ).catch(err => console.error('Error al enviar confirmación:', err));
    
    console.log(`✅ Emails de confirmación enviados a ${email}`);
  } catch (error) {
    console.error('Error al procesar emails:', error);
  }
} 