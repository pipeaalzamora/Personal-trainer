import { Resend } from 'resend';

// Inicializar Resend con la API key
const resend = new Resend(process.env.RESEND_API_KEY);

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

export const sendVerificationEmail = async (
  email: string, 
  token: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verifica tu dirección de correo electrónico</h2>
      <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el botón a continuación:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verificar Email</a>
      </div>
      <p>Si no solicitaste este correo, puedes ignorarlo de forma segura.</p>
      <p>Saludos,<br>El equipo de Coach Inostroza</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Verifica tu cuenta de Coach Inostroza',
    html,
  });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  orderDetails: {
    orderId: string;
    buyOrder: string;
    courseTitles: string[];
    courseCategories?: string[];
    totalAmount: number;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>;
  }
): Promise<boolean> => {
  const { orderId, buyOrder, courseTitles, courseCategories, totalAmount, attachments } = orderDetails;
  
  // Generar la lista de cursos con sus categorías si están disponibles
  const coursesList = courseTitles.map((title, index) => {
    const category = courseCategories && courseCategories[index] ? 
      `<span style="background-color: #f8d7da; color: #721c24; font-size: 12px; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">${courseCategories[index]}</span>` : 
      '';
    return `<li style="margin-bottom: 12px;">${title} ${category}</li>`;
  }).join('');
  
  const date = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Plantilla HTML optimizada para iCloud
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #dc2626; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; padding: 0;">Coach Inostroza</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
        <h2 style="color: #dc2626; margin-top: 0;">¡Gracias por tu compra!</h2>
        <p>Hola,</p>
        <p>Tu pago ha sido procesado correctamente. A continuación, encontrarás los detalles de tu compra:</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Número de orden:</strong> ${orderId}</p>
          <p style="margin: 8px 0;"><strong>Referencia de pago:</strong> ${buyOrder}</p>
          <p style="margin: 8px 0;"><strong>Fecha de compra:</strong> ${date}</p>
          <p style="margin: 8px 0;"><strong>Monto total:</strong> CLP $${totalAmount.toLocaleString('es-CL')}</p>
        </div>
        
        <h3 style="color: #dc2626; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">Cursos adquiridos:</h3>
        <ul style="padding-left: 20px;">
          ${coursesList}
        </ul>
        
        <p>¡Gracias por tu compra! Adjunto a este correo encontrarás los archivos de los cursos que has adquirido.</p>
        <p>Si tienes alguna duda sobre cómo utilizar los materiales, no dudes en contactarnos.</p>
        
        <p style="margin-top: 30px;">¡Éxito en tu entrenamiento!</p>
        <p style="margin: 0;">Saludos,<br><strong>Coach Inostroza</strong></p>
      </div>
      
      <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Coach Inostroza. Todos los derechos reservados.</p>
        <p>Este correo fue enviado a ${email} porque has realizado una compra en nuestra plataforma.</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Confirmación de compra - Coach Inostroza',
    html,
    attachments
  });
};

export const sendPaymentReceiptEmail = async (
  email: string,
  transactionData: {
    transactionId: string,
    cardNumber: string,
    amount: number,
    date: string,
    authCode: string,
  }
): Promise<boolean> => {
  const { transactionId, cardNumber, amount, date, authCode } = transactionData;
  
  // Plantilla HTML optimizada para iCloud
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #dc2626; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; padding: 0;">Coach Inostroza</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
        <h2 style="color: #dc2626; margin-top: 0;">Comprobante de Pago</h2>
        <p>Hola,</p>
        <p>Hemos recibido tu pago correctamente. A continuación, encontrarás los detalles de la transacción:</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>ID de Transacción:</strong> ${transactionId}</p>
          <p style="margin: 8px 0;"><strong>Tarjeta:</strong> **** **** **** ${cardNumber}</p>
          <p style="margin: 8px 0;"><strong>Monto:</strong> CLP $${amount.toLocaleString('es-CL')}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${date}</p>
          <p style="margin: 8px 0;"><strong>Código de Autorización:</strong> ${authCode}</p>
        </div>
        
        <p>Este es un comprobante de tu pago realizado a través de nuestra plataforma de pagos segura.</p>
        <p>Recibirás un segundo correo con los detalles de tu compra y cómo acceder a tus cursos.</p>
        
        <p style="margin-top: 30px;">Saludos,<br><strong> Coach Inostroza</strong></p>
      </div>
      
      <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Coach Inostroza. Todos los derechos reservados.</p>
        <p>Este correo fue enviado a ${email} porque has realizado un pago en nuestra plataforma.</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Comprobante de pago - Coach Inostroza',
    html,
  });
};

export const sendEmail = async (data: EmailPayload): Promise<boolean> => {
  try {
    // Formatear los archivos adjuntos para Resend si existen
    const attachments = data.attachments ? data.attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content.toString('base64'),
      type: attachment.contentType || 'application/octet-stream'
    })) : undefined;
    
    // Enviar el email con Resend usando el dominio personalizado
    const { data: emailData, error } = await resend.emails.send({
      from: 'Coach Inostroza <no-reply@coachinostroza.cl>',
      to: data.to,
      subject: data.subject,
      html: data.html,
      attachments: attachments,
      // Agregar encabezados adicionales para mejorar la entrega
      headers: {
        'Reply-To': 'contacto@coachinostroza.cl',
        'List-Unsubscribe': `<mailto:unsubscribe@coachinostroza.cl?subject=Unsubscribe&body=Unsubscribe>`,
        'X-Entity-Ref-ID': `coach-inostroza-${new Date().getTime()}` // ID único para cada correo
      }
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}; 