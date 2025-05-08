import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config/config';
import { getUserByEmail, createUser, createOrder, addOrderTransactionHistory, createOrderItems } from '@/lib/supabase-api';
import { v4 as uuidv4 } from 'uuid';
import { validateData, transactionSchema, sanitizeText, sanitizeId } from '@/lib/validation';
import { createSecureTransaction, checkTransactionReplay } from '@/lib/transaction-security';
import { logTransaction, logValidationError, logSuspiciousActivity } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

// No definimos CORS aquí porque ya lo maneja el middleware global

export async function POST(request: NextRequest) {
  try {
    // Obtener datos del cliente
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      logValidationError('JSON inválido en solicitud', request);
      return NextResponse.json(
        { error: 'JSON inválido en la solicitud' },
        { status: 400 }
      );
    }

    const { buy_order, session_id, amount, return_url, email, cart } = requestData;
    
    // Validar datos de transacción con Zod
    try {
      validateData({
        orderNumber: buy_order,
        amount: Number(amount),
        returnUrl: return_url,
        sessionId: session_id
      }, transactionSchema);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Error de validación';
      logValidationError(errorMessage, request, { requestData });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    // Verificar si es un intento de replay
    if (checkTransactionReplay(buy_order, request)) {
      return NextResponse.json(
        { error: 'Transacción duplicada detectada' },
        { status: 409 }  // Conflict
      );
    }
    
    // Sanitizar datos de entrada
    const sanitizedBuyOrder = sanitizeId(buy_order);
    const sanitizedSessionId = sanitizeId(session_id);
    const sanitizedEmail = email ? sanitizeText(email) : null;
    
    // Validar que los datos sanitizados coincidan con los originales (posible manipulación)
    if (sanitizedBuyOrder !== buy_order || sanitizedSessionId !== session_id) {
      logSuspiciousActivity('Datos potencialmente maliciosos detectados en transacción', request, {
        original: { buy_order, session_id },
        sanitized: { sanitizedBuyOrder, sanitizedSessionId }
      });
      
      return NextResponse.json(
        { error: 'Datos de transacción inválidos' },
        { status: 400 }
      );
    }

    // Asegurarse de que el monto sea un número entero (Transbank no acepta decimales)
    const amountInteger = Math.round(Number(amount));
    
    if (isNaN(amountInteger) || amountInteger <= 0) {
      logValidationError('Monto de transacción inválido', request, { amount });
      return NextResponse.json(
        { error: 'El monto debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Si se proporcionó email, buscar o crear usuario en Supabase
    let userId = null;
    if (sanitizedEmail) {
      try {
        // Buscar usuario existente
        const user = await getUserByEmail(sanitizedEmail);
        
        if (user) {
          userId = user.id;
        } else {
          // Crear usuario nuevo con token de verificación
          const verificationToken = uuidv4();
          const newUser = await createUser(sanitizedEmail, verificationToken);
          userId = newUser.id;
        }
      } catch (userError) {
        console.error('Error al buscar/crear usuario:', userError);
        // No interrumpimos el flujo principal si falla la gestión de usuarios
      }
    }

    // Crear firma de transacción para validación futura
    const secureTransaction = createSecureTransaction({
      amount: amountInteger,
      orderNumber: sanitizedBuyOrder,
      returnUrl: return_url,
      sessionId: sanitizedSessionId
    }, request);
    
    // Registrar detalles de la transacción para auditoría
    logTransaction(
      sanitizedBuyOrder,
      amountInteger, 
      'PROCESSING',
      request
    );
    
    // Configurar URL según ambiente (integración o producción)
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions`;
    
    const requestBody = JSON.stringify({
      buy_order: sanitizedBuyOrder,
      session_id: sanitizedSessionId,
      amount: amountInteger,
      return_url
    });
    
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
    
    // Capturar respuesta completa
    const responseText = await response.text();
    
    // Verificar si la respuesta es un JSON válido
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      logSuspiciousActivity('Respuesta inválida de Transbank', request, { responseText });
      return NextResponse.json(
        { error: 'Respuesta no válida del procesador de pago' },
        { status: 502 }
      );
    }
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      logTransaction(
        sanitizedBuyOrder, 
        amountInteger, 
        'ERROR', 
        request
      );
      
      console.error('❌ Error en Transbank:', response.status, responseText);
      
      // No devolver detalles completos al cliente por seguridad
      return NextResponse.json(
        { error: 'Error en el procesamiento del pago', code: response.status },
        { status: response.status }
      );
    }
    
    // Extraer token y URL de redirección de la respuesta
    const { token, url } = responseData;
    
    // Log del token para depuración
    console.log('🔑 TOKEN DE TRANSBANK:', token);
    console.log('🔗 URL DE REDIRECCIÓN:', url);
    console.log('📋 DATOS COMPLETOS:', JSON.stringify(responseData, null, 2));
    
    // Guardar la orden en la base de datos si tenemos usuario
    let orderId = null;
    if (userId) {
      try {
        // Preparar datos adicionales para la transacción (incluyendo el email)
        const sessionData = {
          email: sanitizedEmail,
          cart: cart || [],
          timestamp: new Date().toISOString(),
          transactionSignature: secureTransaction.signature // Guardar firma para verificación
        };

        const order = await createOrder(
          userId,
          amountInteger,
          sanitizedBuyOrder,
          sanitizedSessionId,
          token,
          'INITIATED',
          // Incluir los datos de sesión en la respuesta
          { sessionData }
        );
        
        orderId = order.id;
        console.log('✅ Orden creada con ID:', orderId);

        // Crear los items de la orden en la tabla order_items
        if (cart && Array.isArray(cart) && cart.length > 0) {
          console.log('📦 Carrito recibido:', JSON.stringify(cart, null, 2));
          
          // Al haberse cambiado los IDs a UUIDs, debemos buscar los cursos por título
          const courseTitles = cart.map((item: any) => item.title);
          console.log('🔍 Buscando cursos con títulos:', courseTitles);
          
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title, price')
            .in('title', courseTitles);
            
          if (coursesError) {
            console.error('❌ Error al obtener cursos:', coursesError);
            throw coursesError;
          }
          
          if (!courses || courses.length === 0) {
            console.error('❌ No se encontraron los cursos en la base de datos');
            throw new Error('No se encontraron los cursos en la base de datos');
          }
          
          console.log('✅ Cursos encontrados:', JSON.stringify(courses, null, 2));
          
          // Crear un mapa de IDs y precios por título de curso
          const courseMap = new Map(courses.map(course => [course.title, { id: course.id, price: course.price }]));
          
          const items = cart.map((item: any) => {
            const courseInfo = courseMap.get(item.title);
            if (!courseInfo) {
              console.warn(`⚠️ No se encontró información para el curso: ${item.title}`);
              return null;
            }
            return {
              course_id: courseInfo.id, // Usar el UUID correcto de la base de datos
              price: courseInfo.price || item.price || 0
            };
          }).filter(Boolean) as { course_id: string; price: number }[]; // Filtrar elementos nulos y asegurar el tipo correcto
          
          console.log('🛍️ Items a crear:', JSON.stringify(items, null, 2));
          
          if (items.length === 0) {
            console.warn('⚠️ No se pudieron crear items para ningún curso');
            throw new Error('No se pudieron crear items para ningún curso');
          }
          
          try {
            const createdItems = await createOrderItems(orderId, items);
            console.log('✅ Items creados:', JSON.stringify(createdItems, null, 2));
          } catch (error) {
            console.error('❌ Error al crear items:', error);
            throw error;
          }
        } else {
          console.warn('⚠️ No hay items en el carrito o el formato es inválido:', cart);
        }
        
        // Registrar en el historial de transacciones
        await addOrderTransactionHistory(
          orderId,
          'INITIATED',
          { courseNames: (cart || []).map((item: any) => item.title || 'Curso desconocido') }
        );
        
        // Registrar transacción exitosa
        logTransaction(
          sanitizedBuyOrder, 
          amountInteger, 
          'INITIATED', 
          request
        );
      } catch (orderError) {
        // Solo mostrar error si realmente hay un mensaje de error
        if (orderError && Object.keys(orderError).length > 0) {
        console.error('Error al crear orden en base de datos:', orderError);
        }
        // No interrumpimos el flujo principal si falla la creación de la orden
      }
    }
    
    // Devolver token y URL al cliente (sin exponer detalles internos)
    console.log('✅ RESPUESTA FINAL para cliente:', JSON.stringify({ 
      token, 
      url,
      transactionId: sanitizedBuyOrder
    }, null, 2));
    
    return NextResponse.json({ 
      token, 
      url,
      transactionId: sanitizedBuyOrder
    });
  } catch (error) {
    // Solo mostrar error si realmente hay un mensaje de error
    if (error && Object.keys(error).length > 0) {
    // Registrar excepción no controlada
    logSuspiciousActivity(
      `Error no controlado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      request
    );
    }
    
    // Respuesta genérica para el cliente, sin exponer detalles internos
    return NextResponse.json(
      { error: 'Error en el procesamiento de la solicitud' },
      { status: 500 }
    );
  }
}