import crypto from 'crypto';
import { logTransaction, logSuspiciousActivity } from './logger';
import { NextRequest } from 'next/server';
import { validateData, transactionSchema, sanitizeText } from './validation';

// Interfaz para transacciones validadas
export interface ValidatedTransaction {
  amount: number;
  orderNumber: string;
  returnUrl: string;
  sessionId?: string;
  signature: string;
  timestamp: number;
  nonce?: string;
  clientIp?: string;
  userAgent?: string;
}

// Función para generar un nonce aleatorio
function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

// Función para encriptar datos sensibles
export function encryptData(data: string, iv?: Buffer): { encrypted: string; iv: string } {
  const encKey = process.env.ENCRYPTION_KEY || process.env.TRANSACTION_SECRET_KEY || '';
  
  if (!encKey || encKey.length < 32) {
    throw new Error('Clave de encriptación no configurada o insuficientemente segura');
  }
  
  // Utilizar los primeros 32 bytes de la clave (para AES-256)
  const key = crypto.createHash('sha256').update(encKey).digest().slice(0, 32);
  
  // Generar un vector de inicialización aleatorio si no se proporciona
  const initVector = iv || crypto.randomBytes(16);
  
  // Crear cipher con AES-256-CBC
  const cipher = crypto.createCipheriv('aes-256-cbc', key, initVector);
  
  // Encriptar los datos
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    encrypted,
    iv: initVector.toString('hex')
  };
}

// Función para desencriptar datos
export function decryptData(encData: string, ivHex: string): string {
  const encKey = process.env.ENCRYPTION_KEY || process.env.TRANSACTION_SECRET_KEY || '';
  
  if (!encKey) {
    throw new Error('Clave de encriptación no configurada');
  }
  
  // Utilizar los primeros 32 bytes de la clave (para AES-256)
  const key = crypto.createHash('sha256').update(encKey).digest().slice(0, 32);
  
  // Convertir el IV de hex a Buffer
  const iv = Buffer.from(ivHex, 'hex');
  
  // Crear decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  // Desencriptar los datos
  let decrypted = decipher.update(encData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Función mejorada para generar una firma digital para una transacción
export function signTransaction(transaction: Omit<ValidatedTransaction, 'signature'>): string {
  // Obtener la clave secreta desde variables de entorno
  const secretKey = process.env.TRANSACTION_SECRET_KEY || process.env.TRANSBANK_API_KEY || '';
  
  if (!secretKey) {
    throw new Error('No se ha configurado la clave secreta para firmar transacciones');
  }
  
  // Crear una cadena ordenada con los datos de la transacción para firmar
  // Incluir todos los campos relevantes, ordenados alfabéticamente para consistencia
  const fields = [
    transaction.amount.toString(),
    transaction.clientIp || '',
    transaction.nonce || '',
    transaction.orderNumber,
    transaction.returnUrl,
    transaction.sessionId || '',
    transaction.timestamp.toString(),
    transaction.userAgent || ''
  ];
  
  const dataToSign = fields.join('|');
  
  // Crear HMAC usando SHA-256 (algoritmo criptográficamente seguro)
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(dataToSign);
  
  // Devolver la firma como hexadecimal
  return hmac.digest('hex');
}

// Función para verificar la firma de una transacción con comparación de tiempo constante
export function verifyTransactionSignature(transaction: ValidatedTransaction): boolean {
  const { signature, ...transactionData } = transaction;
  const calculatedSignature = signTransaction(transactionData);
  
  // Comparar firmas usando comparación de tiempo constante para evitar ataques de temporización
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    );
  } catch (error) {
    // En caso de error (por ejemplo, longitudes diferentes), la verificación falla
    return false;
  }
}

// Detectar anomalías en las transacciones
function detectAnomalies(transaction: ValidatedTransaction, req: NextRequest | Request): boolean {
  // Obtener información de la solicitud
  const reqInfo = getRequestInfo(req);
  
  // Verificaciones de seguridad
  const anomalies = [];
  
  // 1. Verificar que el monto sea razonable (< 10 millones)
  if (transaction.amount > 10000000) {
    anomalies.push('Monto anormalmente alto');
  }
  
  // 2. Verificar que la URL de retorno sea de un dominio confiable
  const allowedDomains = [
    'coachinostroza.cl',
    'www.coachinostroza.cl',
    'personal-trainer-jet.vercel.app',
    'localhost'
  ];
  
  try {
    const url = new URL(transaction.returnUrl);
    const isDomainAllowed = allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
    
    if (!isDomainAllowed) {
      anomalies.push(`Dominio de retorno no confiable: ${url.hostname}`);
    }
  } catch (error) {
    anomalies.push('URL de retorno inválida');
  }
  
  // 3. Verificar que la transacción no sea muy antigua o futura
  const now = Date.now();
  const timeDiff = Math.abs(now - transaction.timestamp);
  
  if (timeDiff > 30 * 60 * 1000) { // 30 minutos
    anomalies.push('Timestamp fuera de rango válido');
  }
  
  // 4. Verificar que la IP de la solicitud sea consistente
  if (transaction.clientIp && reqInfo.ip && transaction.clientIp !== reqInfo.ip) {
    anomalies.push('IP inconsistente');
  }
  
  // Si hay anomalías, registrarlas
  if (anomalies.length > 0) {
    logSuspiciousActivity(
      `Anomalías detectadas en transacción: ${anomalies.join(', ')}`,
      req,
      { 
        transactionId: transaction.orderNumber,
        anomalies
      }
    );
    return true;
  }
  
  return false;
}

// Función para obtener información de la solicitud
function getRequestInfo(req: NextRequest | Request) {
  let ip = '';
  let userAgent = '';
  
  if (req instanceof NextRequest) {
    ip = req.ip || '';
    userAgent = req.headers.get('user-agent') || '';
  } else {
    // Request normal
    userAgent = req.headers.get('user-agent') || '';
    
    // Intentar obtener IP de cabeceras comunes
    ip = req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         '';
    
    // Si hay múltiples IPs (x-forwarded-for puede tener una lista), tomar la primera
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
  }
  
  return { ip, userAgent };
}

// Función mejorada para crear una transacción segura
export function createSecureTransaction(transactionData: any, req: NextRequest | Request): ValidatedTransaction {
  try {
    // Validar datos usando Zod
    const validatedData = validateData(transactionData, transactionSchema);
    
    // Obtener información de la solicitud
    const reqInfo = getRequestInfo(req);
    
    // Añadir timestamp, nonce e información del cliente para evitar ataques
    const timestamp = Date.now();
    const nonce = generateNonce();
    
    // Crear objeto de transacción
    const transaction: Omit<ValidatedTransaction, 'signature'> = {
      ...validatedData,
      timestamp,
      nonce,
      clientIp: reqInfo.ip,
      userAgent: sanitizeText(reqInfo.userAgent)
    };
    
    // Firmar la transacción
    const signature = signTransaction(transaction);
    
    // Crear transacción completa
    const secureTransaction: ValidatedTransaction = {
      ...transaction,
      signature
    };
    
    // Detectar posibles anomalías
    detectAnomalies(secureTransaction, req);
    
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

// Función mejorada para verificar una transacción segura
export function verifyAndProcessTransaction(transactionData: any, req: NextRequest | Request): boolean {
  try {
    // Verificar que todos los campos necesarios estén presentes
    if (!transactionData || !transactionData.signature || !transactionData.timestamp || !transactionData.orderNumber) {
      logSuspiciousActivity('Datos de transacción incompletos', req, { transactionData });
      return false;
    }
    
    // Convertir a objeto de transacción validada
    const transaction = transactionData as ValidatedTransaction;
    
    // Verificar la firma
    const isValid = verifyTransactionSignature(transaction);
    
    // Si la firma no es válida, terminamos inmediatamente
    if (!isValid) {
      logSuspiciousActivity('Firma de transacción inválida', req, { 
        transactionId: transaction.orderNumber 
      });
      return false;
    }
    
    // Verificar si la transacción ha expirado (30 minutos)
    const now = Date.now();
    const isExpired = now - transaction.timestamp > 30 * 60 * 1000;
    
    if (isExpired) {
      logSuspiciousActivity('Transacción expirada', req, { 
        transactionId: transaction.orderNumber,
        timestamp: transaction.timestamp,
        currentTime: now,
        timeDiff: now - transaction.timestamp
      });
      return false;
    }
    
    // Verificar posibles anomalías
    const hasAnomalies = detectAnomalies(transaction, req);
    if (hasAnomalies) {
      return false;
    }
    
    // Verificar si es un intento de replay
    const isReplay = checkTransactionReplay(transaction.orderNumber, req);
    if (isReplay) {
      return false;
    }
    
    // Si todo es válido, registrar la verificación exitosa
    logTransaction(
      transaction.orderNumber,
      transaction.amount,
      'VERIFIED',
      req
    );
    
    return true;
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

// Mapa para almacenar transacciones procesadas con expiración automática
// En producción, esto debería usar Redis u otra solución persistente
const processedTransactions = new Map<string, number>();

// Implementar expiración para el mapa de transacciones procesadas
setInterval(() => {
  const now = Date.now();
  // Usar Array.from para evitar problemas de compatibilidad con iteradores
  Array.from(processedTransactions.entries()).forEach(([id, timestamp]) => {
    if (now - timestamp > 24 * 60 * 60 * 1000) { // 24 horas
      processedTransactions.delete(id);
    }
  });
}, 60 * 60 * 1000); // Limpiar cada hora

// Función para verificar si una transacción ya fue procesada (prevención de replay)
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

// Función para firmar datos sensibles para comunicaciones seguras
export function signData(data: string): string {
  const secretKey = process.env.TRANSACTION_SECRET_KEY || process.env.TRANSBANK_API_KEY || '';
  
  if (!secretKey) {
    throw new Error('No se ha configurado la clave secreta para firmar datos');
  }
  
  // Crear HMAC usando SHA-256
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(data);
  
  // Devolver la firma como hexadecimal
  return hmac.digest('hex');
}

// Función para encriptar y firmar datos sensibles en un solo paso
export function encryptAndSignData(data: string): { encrypted: string; iv: string; signature: string } {
  // Encriptar los datos
  const { encrypted, iv } = encryptData(data);
  
  // Firmar los datos encriptados junto con el IV para detectar manipulaciones
  const signature = signData(encrypted + iv);
  
  return {
    encrypted,
    iv,
    signature
  };
}

// Función para verificar y desencriptar datos
export function verifyAndDecryptData(
  encrypted: string, 
  iv: string, 
  signature: string
): string | null {
  // Verificar la firma
  const calculatedSignature = signData(encrypted + iv);
  
  // Verificar usando comparación de tiempo constante
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(calculatedSignature, 'hex')
  );
  
  if (!isValid) {
    return null; // Firma inválida
  }
  
  // Desencriptar los datos
  return decryptData(encrypted, iv);
} 