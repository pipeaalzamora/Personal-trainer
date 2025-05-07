import { NextResponse } from 'next/server';
import { processNextMessage } from '@/lib/queue';
import { processCompletedTransaction } from '@/lib/email-processor';

// Procesadores de mensajes para diferentes tipos
const messageProcessors = {
  'process-transaction': processCompletedTransaction
};

// API endpoint para procesar mensajes de la cola
// Será llamado por un cron job cada 1-2 minutos
export async function POST(request: Request) {
  try {
    // Verificar autenticación mediante API Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.QUEUE_PROCESSOR_API_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Número máximo de mensajes a procesar en una sola invocación
    const MAX_MESSAGES = 10;
    const processedCount = { success: 0, empty: 0 };
    
    console.log('⏳ Iniciando procesamiento de cola...');
    
    // Procesar hasta MAX_MESSAGES mensajes, o hasta que la cola esté vacía
    for (let i = 0; i < MAX_MESSAGES; i++) {
      const result = await processNextMessage(messageProcessors);
      
      if (!result) {
        // No hay más mensajes en la cola
        processedCount.empty++;
        break;
      }
      
      processedCount.success++;
    }
    
    console.log(`✅ Procesamiento completado: ${processedCount.success} mensajes procesados`);
    
    return NextResponse.json({
      success: true,
      processed: processedCount.success,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error procesando cola:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// También permitir solicitudes GET para facilitar pruebas
export async function GET(request: Request) {
  return POST(request);
} 