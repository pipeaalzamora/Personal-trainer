import { NextResponse } from 'next/server';
import { config } from '@/config/config';
import { updateOrderTransaction, getOrderByBuyOrder, addOrderTransactionHistory, getOrderItems, getUserByEmail, getCourseExcelFile } from '@/lib/supabase-api';
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

async function getExcelFilesForCourse(courseId: string) {
  try {
    const result = await getCourseExcelFile(courseId);
    
    if (result.isPackComplete && result.packFiles) {
      // Si es un pack completo, devolver todos los archivos
      return result.packFiles.filter(file => 
        file.data !== null && file.filename !== null && file.contentType !== null
      ).map(file => ({
        filename: file.filename!,
        content: file.data!,
        contentType: file.contentType!
      }));
    } else if (result.data && result.filename && result.contentType) {
      // Si es un curso individual, devolver ese archivo
      return [{
        filename: result.filename,
        content: result.data,
        contentType: result.contentType
      }];
    }
    
    return [];
  } catch (error) {
    console.error(`Error al obtener archivos Excel para curso ${courseId}:`, error);
    return [];
  }
}

// Verificar si los correos ya fueron enviados para esta orden
async function checkEmailsStatus(orderId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('emails_sent')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Error al verificar estado de correos:', error);
      return false;
    }
    
    return data?.emails_sent === true;
  } catch (error) {
    console.error('Error al verificar estado de correos:', error);
    return false;
  }
}

// Marcar correos como enviados para esta orden
async function markEmailsAsSent(orderId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        emails_sent: true,
        emails_sent_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('Error al marcar correos como enviados:', error);
      return false;
    }
    
    // También registrar en el historial de transacciones
    await addOrderTransactionHistory(
      orderId,
      'EMAIL_SENT',
      { 
        emailsSent: true,
        timestamp: new Date().toISOString()
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error al marcar correos como enviados:', error);
    return false;
  }
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
    
    // Asegurar que las credenciales no sean undefined
    const commerceCode = config.commerceCode || '';
    const apiKey = config.apiKey || '';
    
    // Confirmar la transacción con Transbank
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': commerceCode,
        'Tbk-Api-Key-Secret': apiKey
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
    
    // IMPORTANTE: Verificar si los correos ya fueron enviados ANTES de actualizar la orden
    const emailsAlreadySent = await checkEmailsStatus(existingOrder.id);
    
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
      
      // Si la transacción fue completada con éxito y los correos NO han sido enviados aún
      if (status === 'COMPLETED' && !emailsAlreadySent) {
        try {
          console.log(`Preparando envío de correos para orden ${updatedOrder.id} (buyOrder: ${data.buy_order})`);
          
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
              console.error('Error al obtener email de usuario:', userError);
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
            console.log(`Email encontrado: ${email}`);
            
            // IMPORTANTE: Marcar PRIMERO como enviados para evitar condiciones de carrera
            const marked = await markEmailsAsSent(updatedOrder.id);
            
            if (!marked) {
              console.error('No se pudo marcar los correos como enviados, cancelando envío');
              return NextResponse.json(data, { headers: corsHeaders });
            }
            
            // Obtener los items y títulos de cursos
            const orderItems = await getOrderItems(updatedOrder.id);
            const courseIds = orderItems.map(item => item.course_id);
            const courseTitles = orderItems.map(item => 
              item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
            );
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
              console.log('Comprobante de pago enviado correctamente');
              
              // 2. Obtener archivos Excel de los cursos
              let attachments: Array<{
                filename: string;
                content: Buffer;
                contentType: string;
              }> = [];
              
              try {
                // Obtener archivos para cada curso
                for (const courseId of courseIds) {
                  const courseFiles = await getExcelFilesForCourse(courseId);
                  attachments = [...attachments, ...courseFiles];
                }

                console.log(`Se obtuvieron ${attachments.length} archivos Excel para adjuntar al correo`);
              } catch (excelError) {
                console.error('Error al obtener archivos Excel:', excelError);
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
                console.log('Correo de confirmación enviado correctamente');
              } else {
                console.error('Error al enviar correo de confirmación de compra');
              }
            } else {
              console.error('Error al enviar comprobante de pago');
            }
          } else {
            console.error('No se pudo encontrar el email del usuario');
          }
        } catch (emailError) {
          console.error('Error en el proceso de envío de correos:', emailError);
        }
      } else if (emailsAlreadySent) {
        console.log(`Omitiendo envío de correos para orden ${updatedOrder.id} - ya fueron enviados anteriormente`);
      }
    }
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en la ruta commit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
} 