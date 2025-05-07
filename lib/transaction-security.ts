import crypto from 'crypto';
import { logTransaction, logSuspiciousActivity } from './logger';
import { NextRequest } from 'next/server';
import { validateData, transactionSchema } from './validation';

// Interfaz para transacciones validadas
export interface ValidatedTransaction {
  amount: number;
  orderNumber: string;
  returnUrl: string;
  sessionId?: string;
  signature: string;
  timestamp: number;
}

// Función para generar una firma digital para una transacción
export function signTransaction(transaction: Omit<ValidatedTransaction, 'signature'>): string {
  // Obtener la clave secreta desde variables de entorno
  const secretKey = process.env.TRANSACTION_SECRET_KEY || process.env.TRANSBANK_API_KEY || '';
  
  if (!secretKey) {
    throw new Error('No se ha configurado la clave secreta para firmar transacciones');
  }
  
  // Crear una cadena ordenada con los datos de la transacción para firmar
  const dataToSign = [
    transaction.orderNumber,
    transaction.amount.toString(),
    transaction.timestamp.toString(),
    transaction.returnUrl,
    transaction.sessionId || ''
  ].join('|');
  
  // Crear HMAC usando SHA-256
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(dataToSign);
  
  // Devolver la firma como hexadecimal
  return hmac.digest('hex');
}

// Función para verificar la firma de una transacción
export function verifyTransactionSignature(transaction: ValidatedTransaction): boolean {
  const { signature, ...transactionData } = transaction;
  const calculatedSignature = signTransaction(transactionData);
  
  // Comparar firmas (usando comparación de tiempo constante para evitar ataques de tiempo)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(calculatedSignature, 'hex')
  );
}

// Función para crear una transacción segura
export function createSecureTransaction(transactionData: any, req: NextRequest | Request): ValidatedTransaction {
  try {
    // Validar datos usando Zod
    const validatedData = validateData(transactionData, transactionSchema);
    
    // Añadir timestamp para evitar ataques de replay
    const timestamp = Date.now();
    
    // Crear objeto de transacción
    const transaction: Omit<ValidatedTransaction, 'signature'> = {
      ...validatedData,
      timestamp
    };
    
    // Firmar la transacción
    const signature = signTransaction(transaction);
    
    // Crear transacción completa
    const secureTransaction: ValidatedTransaction = {
      ...transaction,
      signature
    };
    
    // Registrar la creación de la transacción
    logTransaction(
      secureTransaction.orderNumber,
      secureTransaction.amount,
      'CREATED',
      req
    );
    
    return secureTransaction;
  } catch (error) {
    // Registrar el error como actividad sospechosa
    logSuspiciousActivity(
      `Error al crear transacción segura: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      req,
      { transactionData }
    );
    throw error;
  }
}

// Función para verificar una transacción segura
export function verifyAndProcessTransaction(transactionData: any, req: NextRequest | Request): boolean {
  try {
    // Verificar que todos los campos necesarios estén presentes
    if (!transactionData || !transactionData.signature || !transactionData.timestamp) {
      logSuspiciousActivity('Datos de transacción incompletos', req, { transactionData });
      return false;
    }
    
    // Convertir a objeto de transacción validada
    const transaction = transactionData as ValidatedTransaction;
    
    // Verificar la firma
    const isValid = verifyTransactionSignature(transaction);
    
    // Verificar si la transacción ha expirado (30 minutos)
    const now = Date.now();
    const isExpired = now - transaction.timestamp > 30 * 60 * 1000;
    
    if (isExpired) {
      logSuspiciousActivity('Transacción expirada', req, { 
        transactionId: transaction.orderNumber,
        timestamp: transaction.timestamp,
        currentTime: now
      });
      return false;
    }
    
    // Registrar el resultado de la verificación
    if (isValid) {
      logTransaction(
        transaction.orderNumber,
        transaction.amount,
        'VERIFIED',
        req
      );
    } else {
      logSuspiciousActivity('Firma de transacción inválida', req, { 
        transactionId: transaction.orderNumber 
      });
    }
    
    return isValid;
  } catch (error) {
    // Registrar el error como actividad sospechosa
    logSuspiciousActivity(
      `Error al verificar transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      req,
      { transactionData }
    );
    return false;
  }
}

// Función para prevenir ataques de replay en transacciones
// Utilizamos un Map para almacenar transacciones procesadas (en memoria)
// En producción, esto debería usar Redis u otra solución persistente
const processedTransactions = new Map<string, number>();

// Intervalo para limpiar transacciones antiguas (cada hora)
setInterval(() => {
  const now = Date.now();
  // Usar Array.from para evitar problemas de compatibilidad con iteradores
  const transactionIds = Array.from(processedTransactions.keys());
  
  transactionIds.forEach(id => {
    const timestamp = processedTransactions.get(id);
    if (timestamp && now - timestamp > 24 * 60 * 60 * 1000) {
      processedTransactions.delete(id);
    }
  });
}, 60 * 60 * 1000);

// Función para verificar si una transacción ya fue procesada
export function checkTransactionReplay(transactionId: string, req: NextRequest | Request): boolean {
  // Verificar si la transacción ya fue procesada
  if (processedTransactions.has(transactionId)) {
    logSuspiciousActivity('Posible ataque de replay detectado', req, { 
      transactionId 
    });
    return true; // Es un replay
  }
  
  // Marcar la transacción como procesada
  processedTransactions.set(transactionId, Date.now());
  return false; // No es un replay
} 