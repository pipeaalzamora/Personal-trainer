import winston from 'winston';
import path from 'path';
import { NextRequest } from 'next/server';

// Configuración de niveles personalizados para eventos de seguridad
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  security: 4,  // Nivel específico para eventos de seguridad
  debug: 5,
};

// Colores para los diferentes niveles
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  security: 'cyan',
  debug: 'white',
};

// Añadimos los colores a winston
winston.addColors(colors);

// Formato personalizado
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const metadata = info.metadata as Record<string, any> || {};
      return `${info.timestamp} [${info.level}]: ${info.message} ${
        Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : ''
      }`;
    }
  )
);

// Configuración de transportes (destinos de logs)
const transports = [
  // Log de consola para desarrollo
  new winston.transports.Console(),
  
  // Log de archivo para errores críticos y eventos de seguridad
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'security.log'),
    level: 'security',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Log de archivo para todos los errores
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Creación del logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Función para obtener información del origen de la solicitud
export function getRequestInfo(req: NextRequest | Request) {
  let ip = '';
  let userAgent = '';
  let origin = '';
  let path = '';
  
  if (req instanceof NextRequest) {
    ip = req.ip || '';
    userAgent = req.headers.get('user-agent') || '';
    origin = req.headers.get('origin') || '';
    path = req.nextUrl.pathname;
  } else {
    userAgent = req.headers.get('user-agent') || '';
    origin = req.headers.get('origin') || '';
    try {
      path = new URL(req.url).pathname;
    } catch (e) {
      path = '';
    }
  }
  
  return { ip, userAgent, origin, path };
}

// Funciones específicas para eventos de seguridad

// Registrar intentos de inicio de sesión
export function logLoginAttempt(userId: string, success: boolean, req: NextRequest | Request) {
  const { ip, userAgent, origin } = getRequestInfo(req);
  
  logger.log({
    level: 'security',
    message: `${success ? 'Exitoso' : 'Fallido'} intento de inicio de sesión para usuario ${userId}`,
    metadata: { userId, ip, userAgent, origin, success }
  });
}

// Registrar eventos de transacciones financieras
export function logTransaction(transactionId: string, amount: number, status: string, req: NextRequest | Request) {
  const { ip, userAgent, origin, path } = getRequestInfo(req);
  
  logger.log({
    level: 'security',
    message: `Transacción ${transactionId} - Estado: ${status} - Monto: ${amount}`,
    metadata: { transactionId, amount, status, ip, userAgent, origin, path }
  });
}

// Registrar intentos de acceso no autorizado
export function logUnauthorizedAccess(resourcePath: string, userId: string | null, req: NextRequest | Request) {
  const { ip, userAgent, origin } = getRequestInfo(req);
  
  logger.log({
    level: 'security',
    message: `Intento de acceso no autorizado a ${resourcePath}`,
    metadata: { resourcePath, userId, ip, userAgent, origin }
  });
}

// Registrar cambios en permisos o roles
export function logPermissionChange(userId: string, changedBy: string, oldRole: string, newRole: string) {
  logger.log({
    level: 'security',
    message: `Cambio de rol para usuario ${userId}`,
    metadata: { userId, changedBy, oldRole, newRole }
  });
}

// Registrar posibles ataques o actividades sospechosas
export function logSuspiciousActivity(description: string, req: NextRequest | Request, data: any = {}) {
  const { ip, userAgent, origin, path } = getRequestInfo(req);
  
  logger.log({
    level: 'security',
    message: `Actividad sospechosa: ${description}`,
    metadata: { ip, userAgent, origin, path, ...data }
  });
}

// Registrar errores de validación de datos
export function logValidationError(errorMessage: string, req: NextRequest | Request, data: any = {}) {
  const { ip, userAgent, path } = getRequestInfo(req);
  
  logger.log({
    level: 'security',
    message: `Error de validación: ${errorMessage}`,
    metadata: { ip, userAgent, path, ...data }
  });
}

// Crear directorio de logs al iniciar la aplicación
try {
  const fs = require('fs');
  const logDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.error('Error al crear directorio de logs:', error);
} 