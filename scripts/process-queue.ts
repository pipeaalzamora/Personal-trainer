/**
 * Script para procesar la cola de emails manualmente
 * Útil para desarrollo local o como alternativa al cron job
 * 
 * Uso: ts-node scripts/process-queue.ts [--continuous]
 * 
 * Opciones:
 *   --continuous   Ejecuta el procesador de forma continua con un intervalo de 10 segundos
 */

import { processNextMessage } from '../lib/queue';
import { processCompletedTransaction } from '../lib/email-processor';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Procesadores disponibles
const messageProcessors = {
  'process-transaction': processCompletedTransaction
};

// Función principal
async function main() {
  // Comprobar opciones de línea de comandos
  const isContinuous = process.argv.includes('--continuous');
  
  if (isContinuous) {
    console.log('⏱️  Iniciando procesamiento de cola en modo continuo (Ctrl+C para salir)...');
    
    // Función para procesar la cola
    const processQueue = async () => {
      try {
        let processedCount = 0;
        let emptyCount = 0;
        
        console.log('\n🔄 Buscando mensajes para procesar...');
        
        // Procesar hasta 5 mensajes por ciclo
        for (let i = 0; i < 5; i++) {
          const result = await processNextMessage(messageProcessors);
          
          if (!result) {
            emptyCount++;
            break; // No hay más mensajes en la cola
          }
          
          processedCount++;
        }
        
        if (processedCount > 0) {
          console.log(`✅ Se procesaron ${processedCount} mensajes`);
        } else {
          console.log('ℹ️  No hay mensajes pendientes en la cola');
        }
      } catch (error) {
        console.error('❌ Error procesando la cola:', error);
      }
    };
    
    // Procesar inicialmente
    await processQueue();
    
    // Establecer intervalo
    const interval = setInterval(processQueue, 10000); // Cada 10 segundos
    
    // Manejar señales de terminación
    process.on('SIGINT', () => {
      console.log('\n👋 Deteniendo procesador de cola...');
      clearInterval(interval);
      process.exit(0);
    });
  } else {
    // Modo de un solo procesamiento
    console.log('🔄 Procesando siguiente mensaje de la cola...');
    
    try {
      const result = await processNextMessage(messageProcessors);
      
      if (result) {
        console.log('✅ Mensaje procesado exitosamente');
      } else {
        console.log('ℹ️  No hay mensajes pendientes en la cola');
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      process.exit(1);
    }
    
    process.exit(0);
  }
}

// Ejecutar
main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
}); 