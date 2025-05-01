import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

// Configuración del transportador de correo
const smtpOptions = {
  host: process.env.EMAIL_SERVER || '',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
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
    totalAmount: number;
  }
): Promise<boolean> => {
  const { orderId, buyOrder, courseTitles, totalAmount } = orderDetails;
  
  const coursesList = courseTitles.map(title => `<li style="margin-bottom: 8px;">${title}</li>`).join('');
  const date = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(to right, #dc2626, #000000); padding: 20px; text-align: center;">
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
          <p style="margin: 8px 0;"><strong>Monto total:</strong> $${totalAmount.toLocaleString('es-CL')}</p>
        </div>
        
        <h3 style="color: #dc2626; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">Cursos adquiridos:</h3>
        <ul style="padding-left: 20px;">
          ${coursesList}
        </ul>
        
        <p>Puedes acceder a tus cursos iniciando sesión en nuestra plataforma con el email: <strong>${email}</strong></p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/my-courses" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver mis cursos</a>
        </div>
        
        <p>Si tienes alguna consulta sobre tu compra o necesitas ayuda con los cursos, no dudes en contactarnos respondiendo a este correo.</p>
        
        <p style="margin-top: 30px;">¡Éxito en tu entrenamiento!</p>
        <p style="margin: 0;">Saludos,<br><strong>El equipo de Coach Inostroza</strong></p>
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
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(to right, #dc2626, #000000); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; padding: 0;">Coach Inostroza</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
        <h2 style="color: #dc2626; margin-top: 0;">Comprobante de Pago</h2>
        <p>Hola,</p>
        <p>Hemos recibido tu pago correctamente. A continuación, encontrarás los detalles de la transacción:</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>ID de Transacción:</strong> ${transactionId}</p>
          <p style="margin: 8px 0;"><strong>Tarjeta:</strong> **** **** **** ${cardNumber}</p>
          <p style="margin: 8px 0;"><strong>Monto:</strong> $${amount.toLocaleString('es-CL')}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${date}</p>
          <p style="margin: 8px 0;"><strong>Código de Autorización:</strong> ${authCode}</p>
        </div>
        
        <p>Este es un comprobante de tu pago realizado a través de nuestra plataforma de pagos segura.</p>
        <p>Recibirás un segundo correo con los detalles de tu compra y cómo acceder a tus cursos.</p>
        
        <p style="margin-top: 30px;">Saludos,<br><strong>El equipo de Coach Inostroza</strong></p>
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
  const transporter = nodemailer.createTransport(smtpOptions);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Coach Inostroza" <no-reply@coachinostroza.com>',
      ...data,
    });
    
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}; 