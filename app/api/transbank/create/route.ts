import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/config/config';
import {
  addOrderTransactionHistory,
  createOrder,
  createOrderItems,
  createUser,
  getCoursesByIds,
  getUserByEmail,
  updateOrderTransaction,
} from '@/lib/supabase-api';
import { v4 as uuidv4 } from 'uuid';
import { checkoutCreateSchema, sanitizeId, validateData } from '@/lib/validation';
import { checkTransactionReplay, createSecureTransaction } from '@/lib/transaction-security';
import { logSuspiciousActivity, logTransaction, logValidationError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let sanitizedBuyOrder = '';
  let amountInteger = 0;

  try {
    let requestData: unknown;
    try {
      requestData = await request.json();
    } catch {
      logValidationError('JSON inválido en solicitud', request);
      return NextResponse.json({ error: 'JSON inválido en la solicitud' }, { status: 400 });
    }

    let checkoutData;
    try {
      const rawData = requestData as any;
      checkoutData = validateData(
        {
          ...rawData,
          amount: rawData?.amount !== undefined ? Number(rawData.amount) : undefined,
        },
        checkoutCreateSchema
      );
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Error de validación';
      logValidationError(errorMessage, request, { requestData });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const sanitizedSessionId = sanitizeId(checkoutData.session_id);
    sanitizedBuyOrder = sanitizeId(checkoutData.buy_order);

    if (sanitizedBuyOrder !== checkoutData.buy_order || sanitizedSessionId !== checkoutData.session_id) {
      logSuspiciousActivity('Datos potencialmente maliciosos detectados', request, {
        original: { buy_order: checkoutData.buy_order, session_id: checkoutData.session_id },
        sanitized: { sanitizedBuyOrder, sanitizedSessionId },
      });
      return NextResponse.json({ error: 'Datos de transacción inválidos' }, { status: 400 });
    }

    if (!config.commerceCode || !config.apiKey) {
      return NextResponse.json({ error: 'Credenciales de Transbank no configuradas' }, { status: 503 });
    }

    if (checkTransactionReplay(sanitizedBuyOrder, request)) {
      return NextResponse.json({ error: 'Transacción duplicada detectada' }, { status: 409 });
    }

    const requestedCourseIds = Array.from(new Set(checkoutData.cart.map(item => sanitizeId(item.id))));
    const courses = await getCoursesByIds(requestedCourseIds);
    const coursesById = new Map(courses.map(course => [course.id, course]));
    const missingCourseIds = requestedCourseIds.filter(courseId => !coursesById.has(courseId));

    if (missingCourseIds.length > 0) {
      logValidationError('Cursos inexistentes en checkout', request, { missingCourseIds });
      return NextResponse.json({ error: 'Uno o más cursos del carrito no existen' }, { status: 400 });
    }

    const orderedCourses = requestedCourseIds.map(courseId => coursesById.get(courseId)!);
    amountInteger = orderedCourses.reduce((sum, course) => sum + Math.round(Number(course.price || 0)), 0);

    if (amountInteger <= 0) {
      logValidationError('Monto calculado inválido', request, { requestedCourseIds, amountInteger });
      return NextResponse.json({ error: 'El monto del carrito no es válido' }, { status: 400 });
    }

    if (checkoutData.amount !== undefined && Math.round(checkoutData.amount) !== amountInteger) {
      logSuspiciousActivity('Monto enviado por cliente no coincide con Supabase', request, {
        providedAmount: checkoutData.amount,
        calculatedAmount: amountInteger,
        requestedCourseIds,
      });
      return NextResponse.json(
        { error: 'El carrito cambió. Actualiza la página e intenta nuevamente.' },
        { status: 409 }
      );
    }

    let user = await getUserByEmail(checkoutData.email);
    if (!user) {
      try {
        user = await createUser(checkoutData.email, uuidv4());
      } catch (createUserError) {
        console.error('Error al crear usuario, intentando recuperarlo:', createUserError);
        user = await getUserByEmail(checkoutData.email);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'No se pudo crear o encontrar el usuario' }, { status: 500 });
    }

    const secureTransaction = createSecureTransaction({
      amount: amountInteger,
      orderNumber: sanitizedBuyOrder,
      returnUrl: checkoutData.return_url,
      sessionId: sanitizedSessionId,
    }, request);

    const sessionData = {
      email: checkoutData.email,
      courseIds: requestedCourseIds,
      calculatedAmount: amountInteger,
      timestamp: new Date().toISOString(),
      transactionSignature: secureTransaction.signature,
    };

    const order = await createOrder(
      user.id,
      amountInteger,
      sanitizedBuyOrder,
      sanitizedSessionId,
      '',
      'INITIATED',
      { sessionData }
    );

    await createOrderItems(
      order.id,
      orderedCourses.map(course => ({
        course_id: course.id,
        price: Math.round(Number(course.price || 0)),
      }))
    );

    await addOrderTransactionHistory(
      order.id,
      'INITIATED',
      { courseNames: orderedCourses.map(course => course.title) }
    );

    logTransaction(sanitizedBuyOrder, amountInteger, 'PROCESSING', request);

    const apiUrl = `${config.webpayHost}/rswebpaytransaction/api/webpay/v1.2/transactions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tbk-Api-Key-Id': config.commerceCode,
        'Tbk-Api-Key-Secret': config.apiKey,
      },
      body: JSON.stringify({
        buy_order: sanitizedBuyOrder,
        session_id: sanitizedSessionId,
        amount: amountInteger,
        return_url: checkoutData.return_url,
      }),
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      await updateOrderTransaction(sanitizedBuyOrder, 'FAILED', { transbankCreateError: responseText });
      logSuspiciousActivity('Respuesta inválida de Transbank', request, { responseText });
      return NextResponse.json({ error: 'Respuesta no válida del procesador de pago' }, { status: 502 });
    }

    if (!response.ok) {
      await updateOrderTransaction(sanitizedBuyOrder, 'FAILED', { transbankCreateError: responseData });
      logTransaction(sanitizedBuyOrder, amountInteger, 'ERROR', request);
      console.error('Error en Transbank:', response.status, responseText);
      return NextResponse.json(
        { error: 'Error en el procesamiento del pago', code: response.status },
        { status: response.status }
      );
    }

    const { token, url } = responseData;

    await updateOrderTransaction(
      sanitizedBuyOrder,
      'IN_PROCESS',
      { sessionData, transbankCreate: responseData },
      token
    );

    await addOrderTransactionHistory(
      order.id,
      'IN_PROCESS',
      { redirectUrl: url, courseNames: orderedCourses.map(course => course.title) }
    );

    logTransaction(sanitizedBuyOrder, amountInteger, 'IN_PROCESS', request);

    return NextResponse.json({
      token,
      url,
      transactionId: sanitizedBuyOrder,
      amount: amountInteger,
    });
  } catch (error) {
    console.error('Error no controlado:', error);
    logSuspiciousActivity(
      `Error no controlado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      request,
      { buyOrder: sanitizedBuyOrder, amount: amountInteger }
    );
    return NextResponse.json({ error: 'Error en el procesamiento de la solicitud' }, { status: 500 });
  }
}
