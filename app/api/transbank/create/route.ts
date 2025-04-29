import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CreateTransactionResponse } from '@/app/types/transbank.types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

// Configuración correcta de Transbank según el ambiente
const options = new Options(
  config.commerceCode, 
  config.apiKey, 
  config.environment as Environment
);

// Inicializar la transacción con la configuración
const tx = new WebpayPlus.Transaction(options);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, email, cart } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'El carrito no puede estar vacío' }, { status: 400 });
    }

    // Generar una orden de compra única
    const buyOrder = `OC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Usar el email como identificador de sesión
    const sessionId = `SESSION-${email.split('@')[0]}-${Date.now()}`;
    
    // Buscar usuario en Supabase por email
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = No se encontró el registro
      throw new Error(`Error al buscar usuario: ${userError.message}`);
    }

    if (!user) {
      // Generar token de verificación
      const verificationToken = uuidv4();
      
      // Crear nuevo usuario en Supabase
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email,
            verified: false,
            verification_token: verificationToken
          }
        ])
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Error al crear usuario: ${createError.message}`);
      }
      
      user = newUser;
      
      // Enviar correo de verificación
      await sendEmail({
        to: email,
        subject: 'Verifica tu correo electrónico - Coach Inostroza',
        html: `
          <p>Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
          <a href="http://localhost:3000/verify-email?token=${verificationToken}">Verificar correo</a>
        `
      });
    }
    
    // Crear la orden en Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: user.id,
          total_amount: amount,
          buy_order: buyOrder,
          session_id: sessionId,
          status: 'PENDING'
        }
      ])
      .select()
      .single();
    
    if (orderError) {
      throw new Error(`Error al crear la orden: ${orderError.message}`);
    }
    
    // Crear los items de la orden
    const orderItems = cart.map(course => ({
      order_id: order.id,
      course_id: course.id,
      price: course.price
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) {
      throw new Error(`Error al crear los items de la orden: ${itemsError.message}`);
    }
    
    // En el ambiente de integración, usar una URL compatible con Transbank
    // NOTA: Esta URL debe ser accesible desde Internet para producción
    const returnUrl = "https://transbank-rest-demo.herokuapp.com/webpay_plus/commit";
    console.log('URL de retorno:', returnUrl);
    
    // Crear la transacción en Transbank
    const response = await tx.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    ) as CreateTransactionResponse;
    
    // Actualizar la orden con el token de la transacción
    const { error: updateError } = await supabase
      .from('orders')
      .update({ transaction_token: response.token })
      .eq('id', order.id);
    
    if (updateError) {
      throw new Error(`Error al actualizar la orden: ${updateError.message}`);
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error creando transacción:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al crear la transacción' }, 
      { status: 500 }
    );
  }
}