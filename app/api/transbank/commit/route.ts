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
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Falta el token de transacción' },
        { status: 400, headers: corsHeaders }
      );
    }

    // URL de la API de confirmación de Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`;
    
    // Confirmar la transacción con Transbank
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
      throw new Error(`Error al confirmar la transacción: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Determinar el estado de la transacción
    let status = 'FAILED';
    if (data.response_code === 0) {
      status = 'COMPLETED';
    }
    
    // Buscar la orden asociada a esta transacción
    const existingOrder = await getOrderByBuyOrder(data.buy_order);
    
    if (!existingOrder) {
      return NextResponse.json(
        { error: `No se encontró la orden con buy_order ${data.buy_order}` },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Actualizar la orden en la base de datos
    const updatedOrder = await updateOrderTransaction(
      data.buy_order,
      status,
      data,
      token
    );
    
    // Registrar en el historial de transacciones
    if (updatedOrder && updatedOrder.id) {
      // Obtener los items de la orden y los nombres de los cursos
      const orderItems = await getOrderItems(updatedOrder.id);
      const courseNames = orderItems.map(item => item.course?.title || 'Curso desconocido');

      await addOrderTransactionHistory(
        updatedOrder.id,
        status,
        { courseNames }
      );
      
      // Si la transacción fue completada con éxito, enviar email con los cursos
      if (status === 'COMPLETED') {
        try {
          // Intentar obtener el email directamente de los datos disponibles
          let email: string | null = null;
          
          // 1. Intentar obtener el email del localStorage (frontend)
          // El email puede estar en los datos de la transacción si se pasó desde el frontend
          const transactionData = updatedOrder.transaction_response;
          if (transactionData && 
              typeof transactionData === 'object' && 
              'sessionData' in transactionData && 
              typeof transactionData.sessionData === 'object' &&
              transactionData.sessionData &&
              'email' in transactionData.sessionData) {
            email = transactionData.sessionData.email as string;
          }
          
          // 2. Si no hay email en la transacción, intentar obtenerlo por user_id
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
              // Eliminar console.error
            }
          }
          
          // 3. Como último recurso, intentar extraer el email de otros campos
          if (!email) {
            // El email podría estar en el session_id (a veces se usa un formato como "user@example.com-timestamp")
            const sessionParts = updatedOrder.session_id.split('-');
            const possibleEmail = sessionParts[0];
            if (possibleEmail && possibleEmail.includes('@')) {
              email = possibleEmail;
            }
          }
          
          // Si se encontró un email, proceder con el envío
          if (email) {
            // Obtener los items y títulos de cursos
            const orderItems = await getOrderItems(updatedOrder.id);
            const courseIds = orderItems.map(item => item.course_id);
            const courseTitles = orderItems.map(item => 
              item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
            );
            // Obtener categorías de los cursos
            const courseCategories = orderItems.map(item => 
              item.course && 'category' in item.course && item.course.category ? item.course.category : 'Sin categoría'
            );
            
            // 1. Enviar comprobante de pago
            const receiptSent = await sendPaymentReceiptEmail(
              email,
              {
                transactionId: data.buy_order,
                cardNumber: data.card_detail?.card_number || '',
                amount: data.amount,
                date: new Date(data.transaction_date).toLocaleString('es-ES'),
                authCode: data.authorization_code
              }
            );
            
            if (receiptSent) {
              // 2. Obtener archivos Excel de los cursos
              let attachments: Array<{
                filename: string;
                content: Buffer;
                contentType: string;
              }> = [];
              
              try {
                const excelFiles = await getCoursesExcelFiles(courseIds);
                attachments = excelFiles
                  .filter(file => file.data !== null)
                  .map(file => ({
                    filename: file.filename || `curso.xlsx`,
                    content: file.data as Buffer,
                    contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  }));
              } catch (excelError) {
                // Eliminar console.error
              }
              
              // 3. Enviar correo de confirmación de compra (con o sin adjuntos)
              const confirmationSent = await sendOrderConfirmationEmail(
                email,
                {
                  orderId: updatedOrder.id,
                  buyOrder: data.buy_order,
                  courseTitles,
                  courseCategories,
                  totalAmount: data.amount,
                  attachments: attachments.length > 0 ? attachments : undefined
                }
              );
              
              if (confirmationSent) {
                // No se necesita imprimir el éxito del envío de correo
              } else {
                // Eliminar console.error
              }
            } else {
              // Eliminar console.error
            }
          } else {
            // Eliminar console.error
          }
        } catch (emailError) {
          // Eliminar console.error
          // No interrumpimos el flujo principal si falla el envío de email
        }
      }
    } else {
      // Eliminar console.error
    }
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    // Solo mostrar error si realmente hay un mensaje de error
    // Eliminar console.error
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 