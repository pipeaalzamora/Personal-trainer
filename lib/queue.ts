import { kv } from '@vercel/kv';

// Definir la estructura de los mensajes de la cola
export interface QueueMessage {
  id: string;        // ID único del mensaje
  type: string;      // Tipo de mensaje (ej: 'process-transaction')
  payload: any;      // Datos del mensaje
  createdAt: number; // Timestamp de creación
  processedAt?: number; // Timestamp de procesamiento (cuando se complete)
  status: 'pending' | 'processing' | 'completed' | 'failed'; // Estado del mensaje
  error?: string;    // Error si falló el procesamiento
  attempts: number;  // Número de intentos de procesamiento
}

// Claves de las colas en Redis
const QUEUE_KEY = 'email-processing-queue';
const PROCESSING_KEY = 'email-processing-active';
const COMPLETED_KEY = 'email-processing-completed';
const FAILED_KEY = 'email-processing-failed';

/**
 * Añade un mensaje a la cola para procesamiento asíncrono
 */
export async function enqueueMessage(type: string, payload: any): Promise<string> {
  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const message: QueueMessage = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0
  };
  
  try {
    // Añadir a la cola principal
    await kv.lpush(QUEUE_KEY, JSON.stringify(message));
    console.log(`✅ Mensaje ${id} añadido a la cola`);
    return id;
  } catch (error) {
    console.error('❌ Error al añadir mensaje a la cola:', error);
    throw error;
  }
}

/**
 * Procesa el siguiente mensaje de la cola
 * Devuelve true si se procesó un mensaje, false si la cola estaba vacía
 */
export async function processNextMessage(
  processors: Record<string, (payload: any) => Promise<void>>
): Promise<boolean> {
  // Obtener el siguiente mensaje de la cola
  const rawMessage = await kv.rpop(QUEUE_KEY);
  
  if (!rawMessage) {
    return false; // No hay mensajes en la cola
  }
  
  let message: QueueMessage;
  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    console.error('❌ Error al parsear mensaje de la cola:', error);
    return true; // Mensaje inválido, pero procesamos el siguiente
  }
  
  try {
    // Marcar mensaje como en procesamiento
    message.status = 'processing';
    message.attempts += 1;
    await kv.set(`${PROCESSING_KEY}:${message.id}`, JSON.stringify(message));
    
    console.log(`⏳ Procesando mensaje ${message.id} de tipo ${message.type}...`);
    
    // Verificar si existe un procesador para este tipo de mensaje
    const processor = processors[message.type];
    if (!processor) {
      throw new Error(`No se encontró procesador para mensaje tipo: ${message.type}`);
    }
    
    // Procesar el mensaje
    await processor(message.payload);
    
    // Marcar como completado
    message.status = 'completed';
    message.processedAt = Date.now();
    await kv.set(`${COMPLETED_KEY}:${message.id}`, JSON.stringify(message));
    await kv.del(`${PROCESSING_KEY}:${message.id}`);
    
    console.log(`✅ Mensaje ${message.id} procesado correctamente`);
    return true;
  } catch (error) {
    // Marcar como fallido
    message.status = 'failed';
    message.error = error instanceof Error ? error.message : String(error);
    
    if (message.attempts < 3) {
      // Reintentar más tarde - volver a poner en la cola
      console.log(`⚠️ Error procesando mensaje ${message.id}, reintentando más tarde:`, error);
      await kv.lpush(QUEUE_KEY, JSON.stringify(message));
    } else {
      // Límite de intentos alcanzado
      console.error(`❌ Error procesando mensaje ${message.id} después de ${message.attempts} intentos:`, error);
      await kv.set(`${FAILED_KEY}:${message.id}`, JSON.stringify(message));
      await kv.del(`${PROCESSING_KEY}:${message.id}`);
    }
    
    return true;
  }
}

/**
 * Obtiene estadísticas de la cola
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const [pending, processingKeys, completedKeys, failedKeys] = await Promise.all([
    kv.llen(QUEUE_KEY),
    kv.keys(`${PROCESSING_KEY}:*`),
    kv.keys(`${COMPLETED_KEY}:*`),
    kv.keys(`${FAILED_KEY}:*`)
  ]);
  
  return {
    pending: pending || 0,
    processing: processingKeys.length,
    completed: completedKeys.length,
    failed: failedKeys.length
  };
}

/**
 * Limpia mensajes antiguos completados y fallidos (más de 7 días)
 */
export async function cleanupOldMessages(): Promise<number> {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 días en ms
  let deletedCount = 0;
  
  // Limpiar mensajes completados
  const completedKeys = await kv.keys(`${COMPLETED_KEY}:*`);
  for (const key of completedKeys) {
    const rawMessage = await kv.get(key);
    if (rawMessage) {
      try {
        const message = JSON.parse(rawMessage as string) as QueueMessage;
        if (message.processedAt && message.processedAt < oneWeekAgo) {
          await kv.del(key);
          deletedCount++;
        }
      } catch (e) {
        // Ignorar errores de parseo
      }
    }
  }
  
  // Limpiar mensajes fallidos
  const failedKeys = await kv.keys(`${FAILED_KEY}:*`);
  for (const key of failedKeys) {
    const rawMessage = await kv.get(key);
    if (rawMessage) {
      try {
        const message = JSON.parse(rawMessage as string) as QueueMessage;
        if (message.processedAt && message.processedAt < oneWeekAgo) {
          await kv.del(key);
          deletedCount++;
        }
      } catch (e) {
        // Ignorar errores de parseo
      }
    }
  }
  
  return deletedCount;
} 