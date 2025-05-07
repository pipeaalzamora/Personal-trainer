import { NextRequest } from 'next/server';

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

// Registrar intentos de inicio de sesión
export function logLoginAttempt(userId: string, success: boolean, req: NextRequest | Request) {
  const { ip, userAgent, origin } = getRequestInfo(req);
  console.log(`[SECURITY] ${success ? 'Exitoso' : 'Fallido'} intento de inicio de sesión para usuario ${userId} - IP: ${ip}`);
}

// Registrar eventos de transacciones financieras
export function logTransaction(transactionId: string, amount: number, status: string, req: NextRequest | Request) {
  const { ip, path } = getRequestInfo(req);
  console.log(`[SECURITY] Transacción ${transactionId} - Estado: ${status} - Monto: ${amount} - IP: ${ip} - Ruta: ${path}`);
}

// Registrar intentos de acceso no autorizado
export function logUnauthorizedAccess(resourcePath: string, userId: string | null, req: NextRequest | Request) {
  const { ip, userAgent } = getRequestInfo(req);
  console.log(`[SECURITY] Intento de acceso no autorizado a ${resourcePath} - Usuario: ${userId || 'Anónimo'} - IP: ${ip}`);
}

// Registrar cambios en permisos o roles
export function logPermissionChange(userId: string, changedBy: string, oldRole: string, newRole: string) {
  console.log(`[SECURITY] Cambio de rol para usuario ${userId} - De: ${oldRole} A: ${newRole} - Por: ${changedBy}`);
}

// Registrar posibles ataques o actividades sospechosas
export function logSuspiciousActivity(description: string, req: NextRequest | Request, data: any = {}) {
  const { ip, path } = getRequestInfo(req);
  console.log(`[SECURITY] Actividad sospechosa: ${description} - IP: ${ip} - Ruta: ${path} - Datos: ${JSON.stringify(data)}`);
}

// Registrar errores de validación de datos
export function logValidationError(errorMessage: string, req: NextRequest | Request, data: any = {}) {
  const { ip, path } = getRequestInfo(req);
  console.log(`[SECURITY] Error de validación: ${errorMessage} - IP: ${ip} - Ruta: ${path} - Datos: ${JSON.stringify(data)}`);
}

// Logger básico que reemplaza a winston
export const logger = {
  error: (message: string, metadata?: any) => {
    console.error(`[ERROR] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  warn: (message: string, metadata?: any) => {
    console.warn(`[WARN] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  info: (message: string, metadata?: any) => {
    console.info(`[INFO] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  http: (message: string, metadata?: any) => {
    console.log(`[HTTP] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  security: (message: string, metadata?: any) => {
    console.log(`[SECURITY] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  debug: (message: string, metadata?: any) => {
    console.debug(`[DEBUG] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  log: (info: any) => {
    const level = info.level || 'info';
    const message = info.message || '';
    const metadata = info.metadata || {};
    console.log(`[${level.toUpperCase()}] ${message}`, Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '');
  }
}; 