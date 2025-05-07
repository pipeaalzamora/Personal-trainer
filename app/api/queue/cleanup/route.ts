import { NextResponse } from 'next/server';
import { cleanupOldMessages } from '@/lib/queue';

// API endpoint para limpiar mensajes antiguos (completados o fallidos)
// Ejecutado automáticamente por cron job semanal
export async function GET(request: Request) {
  try {
    // Verificar autenticación mediante API Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.QUEUE_PROCESSOR_API_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    console.log('🧹 Iniciando limpieza de mensajes antiguos...');
    
    // Eliminar mensajes de más de 7 días
    const deletedCount = await cleanupOldMessages();
    
    console.log(`✅ Limpieza completada: ${deletedCount} mensajes eliminados`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error limpiando mensajes antiguos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// También permitir solicitudes POST
export async function POST(request: Request) {
  return GET(request);
} 