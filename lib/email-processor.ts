import { sendOrderConfirmationEmail, sendPaymentReceiptEmail } from './email';
import { getOrderItems, getCoursesExcelFiles } from './supabase-api';

// Interfaz para los datos de transacción
export interface TransactionPayload {
  orderId: string;
  buyOrder: string;
  email: string;
  transactionData: any;
}

/**
 * Procesa una transacción completada, enviando todos los emails necesarios
 * Esta función está diseñada para ser ejecutada por el worker de la cola
 */
export async function processCompletedTransaction(payload: TransactionPayload): Promise<void> {
  const { orderId, buyOrder, email, transactionData } = payload;
  
  console.log(`🔄 Procesando transacción completada: ${buyOrder} para ${email}`);
  
  try {
    // 1. Ejecutar operaciones en paralelo
    // - Obtener items de la orden
    // - Enviar comprobante de pago
    const [orderItems] = await Promise.all([
      // Obtener detalles de la orden
      getOrderItems(orderId),
      
      // Enviar comprobante de pago simultáneamente
      sendPaymentReceiptEmail(
        email,
        {
          transactionId: buyOrder,
          cardNumber: transactionData.card_detail?.card_number || '',
          amount: transactionData.amount,
          date: new Date(transactionData.transaction_date).toLocaleString('es-ES'),
          authCode: transactionData.authorization_code
        }
      ).catch(err => {
        console.error('Error al enviar comprobante de pago:', err);
      })
    ]);
    
    // 2. Preparar datos de los cursos
    const courseIds = orderItems.map(item => item.course_id);
    const courseTitles = orderItems.map(item => 
      item.course && 'title' in item.course ? item.course.title : `Curso ${item.course_id}`
    );
    const courseCategories = orderItems.map(item => 
      item.course && 'category' in item.course && item.course.category ? 
      item.course.category : 'Sin categoría'
    );
    
    // 3. Obtener archivos Excel
    const excelFiles = await getCoursesExcelFiles(courseIds).catch(err => {
      console.error('Error al obtener archivos Excel:', err);
      return [];
    });
    
    const attachments = (excelFiles || [])
      .filter(file => file && file.data !== null)
      .map(file => ({
        filename: file.filename || `curso.xlsx`,
        content: file.data as Buffer,
        contentType: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
    
    console.log(`✓ Obtenidos ${attachments.length} archivos para adjuntar`);
    
    // 4. Enviar correo de confirmación con los archivos adjuntos
    await sendOrderConfirmationEmail(
      email,
      {
        orderId: orderId,
        buyOrder: buyOrder,
        courseTitles,
        courseCategories,
        totalAmount: transactionData.amount,
        attachments: attachments.length > 0 ? attachments : undefined
      }
    );
    
    console.log(`✅ Procesamiento completado para transacción ${buyOrder}`);
  } catch (error) {
    console.error(`❌ Error al procesar transacción ${buyOrder}:`, error);
    throw error; // Propagar el error para que el sistema de colas lo maneje
  }
} 