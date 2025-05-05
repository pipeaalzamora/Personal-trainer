import { NextResponse } from 'next/server';
import { config } from '@/config/config';
import { getUserByEmail, createUser, createOrder, addOrderTransactionHistory } from '@/lib/supabase-api';
import { v4 as uuidv4 } from 'uuid';

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
    const { buy_order, session_id, amount, return_url, email, cart } = await request.json();

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

    // Si se proporcionó email, buscar o crear usuario en Supabase
    let userId = null;
    if (email) {
      try {
        // Buscar usuario existente
        const user = await getUserByEmail(email);
        
        if (user) {
          userId = user.id;
        } else {
          // Crear usuario nuevo con token de verificación
          const verificationToken = uuidv4();
          const newUser = await createUser(email, verificationToken);
          userId = newUser.id;
        }
      } catch (userError) {
        console.error('Error al buscar/crear usuario:', userError);
        // No interrumpimos el flujo principal si falla la gestión de usuarios
      }
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
    
    // Verificar si la respuesta es un JSON válido
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Respuesta no válida de Transbank:', responseText);
      return NextResponse.json(
        { error: 'Respuesta no válida de Transbank', details: responseText },
        { status: 502, headers: corsHeaders }
      );
    }
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      console.error('Error en respuesta de Transbank:', responseText);
      
      // Devolver error detallado
      return NextResponse.json(
        { 
          error: 'Error en la respuesta de Transbank', 
          status: response.status,
          details: responseData
        },
        { status: response.status, headers: corsHeaders }
      );
    }
    
    // Extraer token y URL de redirección de la respuesta
    const { token, url } = responseData;
    
    // Guardar la orden en la base de datos si tenemos usuario
    let orderId = null;
    if (userId) {
      try {
        // Preparar datos adicionales para la transacción (incluyendo el email)
        const sessionData = {
          email: email,
          cart: cart || [],
          timestamp: new Date().toISOString()
        };

        const order = await createOrder(
          userId,
          amountInteger,
          buy_order,
          session_id,
          token,
          'INITIATED',
          // Incluir los datos de sesión en la respuesta
          { sessionData }
        );
        
        orderId = order.id;
        console.log(`Orden ${buy_order} creada en base de datos para usuario ${userId}`);
        
        // Registrar en el historial de transacciones
        await addOrderTransactionHistory(
          orderId,
          'INITIATED',
          {
            token,
            amount: amountInteger,
            timestamp: new Date().toISOString(),
            user_id: userId,
            email: email,
            sessionData
          }
        );
        
        console.log(`Historial de transacción registrado para orden ${buy_order}: INITIATED`);
      } catch (orderError) {
        console.error('Error al crear orden en base de datos:', orderError);
        // No interrumpimos el flujo principal si falla la creación de la orden
      }
    }
    
    // Devolver token y URL al cliente
    return NextResponse.json({ token, url }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500, headers: corsHeaders }
    );
  }
}