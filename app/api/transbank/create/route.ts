import { NextResponse } from 'next/server';
import { config } from '@/config/config';

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
    // Obtener datos del cliente
    const { buy_order, session_id, amount, return_url } = await request.json();
    
    // Validar datos de entrada
    if (!buy_order || !session_id || !amount || !return_url) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (buy_order, session_id, amount, return_url)' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validar formato de los datos según la documentación de Transbank
    const validations = {
      buy_order: {
        valid: typeof buy_order === 'string' && /^[a-zA-Z0-9]{1,26}$/.test(buy_order),
        message: 'buy_order debe ser alfanumérico y tener máximo 26 caracteres'
      },
      session_id: {
        valid: typeof session_id === 'string' && /^[a-zA-Z0-9]{1,61}$/.test(session_id),
        message: 'session_id debe ser alfanumérico y tener máximo 61 caracteres'
      },
      return_url: {
        valid: typeof return_url === 'string' && return_url.startsWith('http'),
        message: 'return_url debe ser una URL válida que comience con http o https'
      }
    };

    // Verificar si hay errores de validación
    const validationErrors = Object.entries(validations)
      .filter(([_, data]) => !data.valid)
      .map(([field, data]) => `${field}: ${data.message}`);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Error de validación de datos', 
          details: validationErrors 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Asegurarse de que el monto sea un número entero (Transbank no acepta decimales)
    const amountInteger = Math.round(Number(amount));
    
    if (isNaN(amountInteger) || amountInteger <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un número positivo' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('Procesando solicitud para Transbank:', { 
      buy_order, 
      session_id, 
      amount: amountInteger, 
      return_url,
      env: config.environment,
      host: config.webpayHost,
      commerceCode: config.commerceCode 
    });
    
    // Configurar URL según ambiente (integración o producción)
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions`;
    
    const requestBody = JSON.stringify({
      buy_order,
      session_id,
      amount: amountInteger,
      return_url
    });
    
    console.log('Enviando a Transbank:', requestBody);
    
    // Enviar solicitud a Transbank desde el servidor
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey
      },
      body: requestBody
    });
    
    // Capturar respuesta completa para depuración
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Error de Transbank:', response.status, responseText);
      
      let errorDetails: string | Record<string, any> = responseText;
      let status = response.status;
      
      // Manejo específico para el error 422 (Unprocessable Entity)
      if (response.status === 422) {
        try {
          const parsedError = JSON.parse(responseText);
          console.error('Detalles del error 422:', parsedError);
          
          // Mostrar información de debug con todas las variables relevantes
          console.error('Información de debug para error 422:');
          console.error('- Commerce Code:', config.commerceCode);
          console.error('- API Key (primeros 10 caracteres):', config.apiKey.substring(0, 10) + '...');
          console.error('- Ambiente:', config.environment);
          console.error('- URL de API:', apiUrl);
          console.error('- Headers:', {
            'Content-Type': 'application/json',
            'Tbk-Api-Key-Id': config.commerceCode,
            'Tbk-Api-Key-Secret': '(oculto por seguridad)'
          });
          console.error('- Body:', requestBody);
          
          errorDetails = {
            transbank_error: parsedError,
            message: 'Error 422: La petición tiene el formato correcto pero no puede ser procesada por Transbank. Verifique los datos enviados y las credenciales configuradas.'
          };
        } catch (e) {
          console.error('No se pudo parsear el error 422:', e);
        }
      }
      
      return NextResponse.json(
        { 
          error: `Error de Transbank: ${response.status} ${response.statusText}`,
          details: errorDetails,
          request: {
            buy_order,
            session_id,
            amount: amountInteger,
            return_url
          }
        },
        { status, headers: corsHeaders }
      );
    }
    
    // Parsear la respuesta JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Respuesta de Transbank:', data);
    } catch (parseError) {
      console.error('Error al parsear respuesta de Transbank:', parseError);
      return NextResponse.json(
        { 
          error: 'Error al procesar la respuesta de Transbank',
          raw_response: responseText 
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Verificar que la respuesta contenga los campos esperados
    if (!data.token || !data.url) {
      console.error('Respuesta incompleta de Transbank:', data);
      return NextResponse.json(
        { 
          error: 'Respuesta incompleta de Transbank',
          response: data 
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
}