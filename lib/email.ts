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
  
  const coursesList = courseTitles.map(title => `<li>${title}</li>`).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">¡Gracias por tu compra!</h2>
      <p>Tu pago ha sido procesado correctamente. A continuación, encontrarás los detalles de tu compra:</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Número de orden:</strong> ${orderId}</p>
        <p><strong>Referencia de pago:</strong> ${buyOrder}</p>
        <p><strong>Monto total:</strong> $${totalAmount.toFixed(2)}</p>
      </div>
      
      <h3 style="color: #333;">Cursos adquiridos:</h3>
      <ul>
        ${coursesList}
      </ul>
      
      <p>Puedes acceder a tus cursos iniciando sesión en nuestra plataforma.</p>
      
      <p>Si tienes alguna consulta, no dudes en contactarnos.</p>
      
      <p>Saludos,<br>El equipo de Coach Inostroza</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Confirmación de compra - Coach Inostroza',
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