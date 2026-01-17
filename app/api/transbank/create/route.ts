import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config/config';
import { getUserByEmail, createUser, createOrder, addOrderTransactionHistory, createOrderItems } from '@/lib/supabase-api';
import { v4 as uuidv4 } from 'uuid';
import { validateData, transactionSchema, sanitizeText, sanitizeId } from '@/lib/validation';
import { createSecureTransaction, checkTransactionReplay } from '@/lib/transaction-security';
import { logTransaction, logValidationError, logSuspiciousActivity } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      logValidationError('JSON inválido en solicitud', request);
      return NextResponse.json({ error: 'JSON inválido en la solicitud' }, { status: 400 });
    }

    const { buy_order, session_id, amount, return_url, email, cart } = requestData;
    
    // Validar datos de transacción
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
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    // Verificar replay
    if (checkTransactionReplay(buy_order, request)) {
      return NextResponse.json({ error: 'Transacción duplicada detectada' }, { status: 409 });
    }
    
    // Sanitizar datos
    const sanitizedBuyOrder = sanitizeId(buy_order);
    const sanitizedSessionId = sanitizeId(session_id);
    const sanitizedEmail = email ? sanitizeText(email) : null;
    
    if (sanitizedBuyOrder !== buy_order || sanitizedSessionId !== session_id) {
      logSuspiciousActivity('Datos potencialmente maliciosos detectados', request, {
        original: { buy_order, session_id },
        sanitized: { sanitizedBuyOrder, sanitizedSessionId }
      });
      return NextResponse.json({ error: 'Datos de transacción inválidos' }, { status: 400 });
    }

    const amountInteger = Math.round(Number(amount));
    
    if (isNaN(amountInteger) || amountInteger <= 0) {
      logValidationError('Monto de transacción inválido', request, { amount });
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 });
    }

    // Buscar o crear usuario
    let userId = null;
    if (sanitizedEmail) {
      try {
        const user = await getUserByEmail(sanitizedEmail);
        if (user) {
          userId = user.id;
        } else {
          const verificationToken = uuidv4();
          const newUser = await createUser(sanitizedEmail, verificationToken);
          userId = newUser.id;
        }
      } catch (userError) {
        console.error('Error al buscar/crear usuario:', userError);
      }
    }

    // Crear firma de transacción
    const secureTransaction = createSecureTransaction({
      amount: amountInteger,
      orderNumber: sanitizedBuyOrder,
      returnUrl: return_url,
      sessionId: sanitizedSessionId
    }, request);
    
    logTransaction(sanitizedBuyOrder, amountInteger, 'PROCESSING', request);
    
    // Llamar a Transbank
    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode || '',
        'Tbk-Api-Key-Secret': config.apiKey || ''
      },
      body: JSON.stringify({
        buy_order: sanitizedBuyOrder,
        session_id: sanitizedSessionId,
        amount: amountInteger,
        return_url
      })
    });
    
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      logSuspiciousActivity('Respuesta inválida de Transbank', request, { responseText });
      return NextResponse.json({ error: 'Respuesta no válida del procesador de pago' }, { status: 502 });
    }
    
    if (!response.ok) {
      logTransaction(sanitizedBuyOrder, amountInteger, 'ERROR', request);
      console.error('Error en Transbank:', response.status, responseText);
      return NextResponse.json({ error: 'Error en el procesamiento del pago', code: response.status }, { status: response.status });
    }
    
    const { token, url } = responseData;
    
    // Guardar orden en base de datos
    let orderId = null;
    if (userId) {
      try {
        const sessionData = {
          email: sanitizedEmail,
          cart: cart || [],
          timestamp: new Date().toISOString(),
          transactionSignature: secureTransaction.signature
        };

        const order = await createOrder(
          userId,
          amountInteger,
          sanitizedBuyOrder,
          sanitizedSessionId,
          token,
          'INITIATED',
          { sessionData }
        );
        
        orderId = order.id;

        // Crear items de orden - ahora los IDs del carrito son UUIDs de Supabase
        if (cart && Array.isArray(cart) && cart.length > 0) {
          const items = cart.map((item: any) => ({
            course_id: item.id, // UUID directo de Supabase
            price: item.price || 0
          }));
          
          if (items.length > 0) {
            await createOrderItems(orderId, items);
          }
        }
        
        await addOrderTransactionHistory(
          orderId,
          'INITIATED',
          { courseNames: (cart || []).map((item: any) => item.title || 'Curso desconocido') }
        );
        
        logTransaction(sanitizedBuyOrder, amountInteger, 'INITIATED', request);
      } catch (orderError) {
        console.error('Error al crear orden en base de datos:', orderError);
      }
    }
    
    return NextResponse.json({ 
      token, 
      url,
      transactionId: sanitizedBuyOrder
    });
  } catch (error) {
    console.error('Error no controlado:', error);
    logSuspiciousActivity(
      `Error no controlado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      request
    );
    return NextResponse.json({ error: 'Error en el procesamiento de la solicitud' }, { status: 500 });
  }
}
