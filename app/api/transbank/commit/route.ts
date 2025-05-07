import { NextResponse } from 'next/server';
import { config } from '@/config/config';
import { updateOrderTransaction, getOrderByBuyOrder, addOrderTransactionHistory, getOrderItems, getUserByEmail, getCoursesExcelFiles } from '@/lib/supabase-api';
import { sendOrderConfirmationEmail, sendPaymentReceiptEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { enqueueMessage } from '@/lib/queue';

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
    
    // Si la transacción fue exitosa, encolar el procesamiento de emails y archivos
    if (updatedOrder && status === 'COMPLETED') {
      try {
        // Determinar el email del usuario
        let email = null;
        
        // Intentar obtener email de múltiples fuentes
        const transactionResponse = updatedOrder.transaction_response;
        if (transactionResponse && 
            typeof transactionResponse === 'object' && 
            'sessionData' in transactionResponse && 
            transactionResponse.sessionData && 
            typeof transactionResponse.sessionData === 'object' && 
            'email' in transactionResponse.sessionData) {
          email = transactionResponse.sessionData.email as string;
        }
        
        if (!email && updatedOrder.user_id) {
          // Buscar email por user_id
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', updatedOrder.user_id)
            .single();
            
          email = userData?.email;
        }
        
        // Última opción: revisar session_id
        if (!email && updatedOrder.session_id && updatedOrder.session_id.includes('@')) {
          const sessionParts = updatedOrder.session_id.split('-');
          email = sessionParts[0].includes('@') ? sessionParts[0] : null;
        }
        
        if (email) {
          // Encolar el mensaje para procesamiento asíncrono
          const messageId = await enqueueMessage('process-transaction', {
            orderId: updatedOrder.id,
            buyOrder: data.buy_order,
            email,
            transactionData: data
          });
          
          console.log(`✅ Procesamiento de emails y archivos encolado: ${messageId}`);
          
          // Registrar en el historial de forma asíncrona sin bloquear
          addOrderTransactionHistory(
            updatedOrder.id,
            'QUEUED_FOR_PROCESSING', 
            { messageId }
          ).catch(err => console.error('Error al registrar en historial:', err));
        } else {
          console.warn('⚠️ No se pudo determinar el email para enviar notificaciones');
        }
      } catch (queueError) {
        console.error('❌ Error al encolar procesamiento:', queueError);
        // No bloqueamos la respuesta al cliente si falla el encolamiento
      }
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
    // Ejecutar operaciones iniciales en paralelo
    const orderItems = await getOrderItems(updatedOrder.id);
    
    // Lanzar operación de historial en paralelo sin esperar su resultado
    addOrderTransactionHistory(
      updatedOrder.id,
      'COMPLETED',
      { courseNames: orderItems.map(item => item.course?.title || 'Curso desconocido') }
    ).catch(err => console.error('Error al agregar historial:', err));
    
    // Determinar email
    let email: string | null = null;
    
    // Extraer email de forma más directa
    const sessionData = updatedOrder.transaction_response?.sessionData;
    email = sessionData?.email || null;
    
    // Intentar obtener por user_id si no se encontró
    if (!email && updatedOrder.user_id) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', updatedOrder.user_id)
          .single();
        
        email = userData?.email || null;
      } catch (error) {
        console.error('Error al obtener email por user_id:', error);
      }
    }
    
    // Revisar session_id como último recurso
    if (!email && updatedOrder.session_id && updatedOrder.session_id.includes('@')) {
      const sessionParts = updatedOrder.session_id.split('-');
      email = sessionParts[0].includes('@') ? sessionParts[0] : null;
    }
    
    if (!email) {
      console.error(`No se pudo obtener email para la orden ${updatedOrder.id}`);
      return;
    }
    
    // Iniciar proceso de emails en paralelo
    await processPurchaseEmails(email, updatedOrder, orderItems, transactionData);
  } catch (error) {
    console.error('Error en procesamiento asíncrono:', error);
  }
}

// Función para procesar y enviar emails de forma más eficiente
async function processPurchaseEmails(
  email: string, 
  order: any, 
  orderItems: any[], 
  transactionData: any
) {
  try {
    // Preparar datos comunes
    const courseIds = orderItems.map(item => item.course_id);
    const courseTitles = orderItems.map(item => 
      item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
    );
    const courseCategories = orderItems.map(item => 
      item.course && 'category' in item.course && item.course.category ? item.course.category : 'Sin categoría'
    );
    
    // 1. Ejecutar operaciones en paralelo usando Promise.all
    // - Enviar comprobante de pago
    // - Obtener archivos Excel
    const [, excelFiles] = await Promise.all([
      // Enviar el comprobante de pago (no necesitamos esperar su resultado específico)
      sendPaymentReceiptEmail(
        email,
        {
          transactionId: transactionData.buy_order,
          cardNumber: transactionData.card_detail?.card_number || '',
          amount: transactionData.amount,
          date: new Date(transactionData.transaction_date).toLocaleString('es-ES'),
          authCode: transactionData.authorization_code
        }
      ).catch(err => {
        console.error('Error al enviar comprobante:', err);
        return false;
      }),
      
      // Obtener archivos Excel en paralelo
      getCoursesExcelFiles(courseIds).catch(err => {
        console.error('Error al obtener archivos Excel:', err);
        return [];
      })
    ]);
    
    // Procesar resultado de archivos Excel
    const attachments = (excelFiles || [])
      .filter(file => file && file.data !== null)
      .map(file => ({
        filename: file.filename || `curso.xlsx`,
        content: file.data as Buffer,
        contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
    
    // 2. Enviar correo de confirmación de compra
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
    
    console.log(`✅ Emails procesados para ${email} con ${attachments.length} archivos adjuntos`);
  } catch (error) {
    console.error('Error al procesar emails:', error);
  }
} 