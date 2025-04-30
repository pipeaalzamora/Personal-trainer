import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CreateTransactionResponse } from '@/app/types/transbank.types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

// Aseguramos que la URL base sea siempre HTTPS
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://personal-trainer-roan.vercel.app/';

// URL base de Transbank para ambiente de integración
const TRANSBANK_URL = 'https://webpay3gint.transbank.cl';

// Función para construir URLs correctamente sin barras duplicadas
const buildUrl = (base: string, path: string) => {
  const baseWithoutTrailingSlash = base.endsWith('/') ? base.slice(0, -1) : base;
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;
  return `${baseWithoutTrailingSlash}/${pathWithoutLeadingSlash}`;
};

// Configuración de Transbank según el ambiente
const options = new Options(
  config.commerceCode, 
  config.apiKey, 
  config.environment as Environment
);

// Inicializar la transacción con la configuración personalizada
// La SDK de Transbank no permite cambiar la URL base directamente,
// pero usamos la configuración del config.ts que tiene la URL correcta
const tx = new WebpayPlus.Transaction(options);

// Tipo para el cuerpo de la solicitud
interface RequestBody {
  amount: number;
  email: string;
  cart: Array<{id: string; price: number}>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RequestBody;
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = No se encontró el registro
      throw new Error(`Error al buscar usuario: ${userError.message}`);
    }

    let userData = user;
    
    if (!userData) {
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
      
      userData = newUser;
      
      // Enviar correo de verificación usando la función buildUrl para evitar problemas con barras
      await sendEmail({
        to: email,
        subject: 'Verifica tu correo electrónico - Coach Inostroza',
        html: `
          <p>Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
          <a href="${buildUrl(BASE_URL, 'verify-email')}?token=${verificationToken}">Verificar correo</a>
        `
      });
    }
    
    if (!userData) {
      throw new Error('No se pudo crear o encontrar el usuario');
    }
    
    // Crear la orden en Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userData.id,
          total_amount: amount,
          buy_order: buyOrder,
          session_id: sessionId,
          status: 'PENDING'
        }
      ])
      .select()
      .single();
    
    if (orderError || !order) {
      throw new Error(`Error al crear la orden: ${orderError?.message || 'Datos de orden no disponibles'}`);
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
    
    // Aseguramos que la URL de retorno use la URL base correcta con la función buildUrl
    const returnUrl = buildUrl(BASE_URL, 'api/transbank/commit');
    
    console.log('URL de retorno:', returnUrl); // Para depuración
    
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
  } catch (error) {
    console.error('Error creando transacción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear la transacción';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}