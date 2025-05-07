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
        // Obtener los items de la orden y los nombres de los cursos
        const orderItems = await getOrderItems(updatedOrder.id);
        const courseNames = orderItems.map(item => item.course?.title || 'Curso desconocido');

        await addOrderTransactionHistory(
          updatedOrder.id,
          status,
          { courseNames }
        );
        
        console.log(`✅ Historial de transacción registrado para orden ${data.buy_order}: ${status}`);
        
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
              console.log(`✅ Email obtenido de los datos de la sesión: ${email}`);
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
                  console.log(`✅ Email obtenido directamente de la tabla users: ${email}`);
                }
              } catch (userError) {
                console.error('❌ Error al obtener usuario por ID:', userError);
              }
            }
            
            // 3. Como último recurso, intentar extraer el email de otros campos
            if (!email) {
              // El email podría estar en el session_id (a veces se usa un formato como "user@example.com-timestamp")
              const sessionParts = updatedOrder.session_id.split('-');
              const possibleEmail = sessionParts[0];
              if (possibleEmail && possibleEmail.includes('@')) {
                email = possibleEmail;
                console.log(`✅ Email obtenido del session_id: ${email}`);
              }
            }
            
            // 4. Buscar el email en localStorage del frontend 
            // Esto se maneja en el frontend, aquí solo intentamos otras fuentes
            
            // Si se encontró un email, proceder con el envío
            if (email) {
              // Obtener los items y títulos de cursos
              const orderItems = await getOrderItems(updatedOrder.id);
              const courseIds = orderItems.map(item => item.course_id);
              const courseTitles = orderItems.map(item => 
                item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
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
                console.log(`✅ Comprobante de pago enviado a ${email}`);
              } else {
                console.error(`❌ Error al enviar comprobante de pago a ${email}`);
              }
              
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
                  
                console.log(`✅ Se encontraron ${attachments.length} archivos adjuntos para los cursos`);
              } catch (excelError) {
                console.error('❌ Error al obtener archivos Excel:', excelError);
              }
              
              // 3. Enviar correo de confirmación de compra (con o sin adjuntos)
              const confirmationSent = await sendOrderConfirmationEmail(
                email,
                {
                  orderId: updatedOrder.id,
                  buyOrder: data.buy_order,
                  courseTitles,
                  totalAmount: data.amount,
                  attachments: attachments.length > 0 ? attachments : undefined
                }
              );
              
              if (confirmationSent) {
                console.log(`✅ Email de confirmación enviado a ${email} con ${attachments.length} archivos adjuntos`);
              } else {
                console.error(`❌ Error al enviar email de confirmación a ${email}`);
              }
            } else {
              console.error(`❌ No se pudo obtener un email válido para enviar la confirmación de la orden ${updatedOrder.id}`);
            }
          } catch (emailError) {
            console.error('❌ Error al procesar el envío de email:', emailError);
            // No interrumpimos el flujo principal si falla el envío de email
          }
        }
      } else {
        console.error('❌ No se pudo registrar historial: updatedOrder no válido');
      }
    } catch (dbError) {
      // Solo mostrar error si realmente hay un mensaje de error
      if (dbError && Object.keys(dbError).length > 0) {
        console.error('❌ Error al actualizar la orden en la base de datos:', dbError);
      }
      // No interrumpimos el flujo principal si falla la actualización en BD
    }
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    // Solo mostrar error si realmente hay un mensaje de error
    if (error && Object.keys(error).length > 0) {
      console.error('❌ Error en API route:', error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 