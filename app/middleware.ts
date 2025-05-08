import { NextRequest, NextResponse } from 'next/server';

// Configuración de dominios permitidos
const allowedOrigins = [
  'http://localhost:3000', 
  'https://www.coachinostroza.cl',
  'https://coachinostroza.cl',
];

// Cabeceras de seguridad mejoradas para todas las respuestas
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl https://*.vercel-postgres.com https://*.supabase.co;",
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};

// Implementación de rate limiting con límites por tipo de ruta
const requestCounts = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto

// Límites diferentes para distintos tipos de rutas
const rateLimits = {
  api: 100,                   // 100 llamadas API por minuto
  transbank: 20,              // 20 transacciones por minuto
  general: 200                // 200 solicitudes generales por minuto
};

function checkRateLimit(ip: string, pathname: string): boolean {
  const now = Date.now();
  const key = `${ip}:${getRateLimitCategory(pathname)}`;
  const record = requestCounts.get(key) || { count: 0, lastReset: now };
  
  // Reiniciar contador si ha pasado el tiempo de ventana
  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.lastReset = now;
  }
  
  // Incrementar contador y verificar límite
  record.count++;
  requestCounts.set(key, record);
  
  // Determinar el límite basado en la categoría de la ruta
  const limit = getRateLimitForPath(pathname);
  
  return record.count <= limit;
}

// Determinar categoría de la ruta para rate limiting
function getRateLimitCategory(pathname: string): string {
  if (pathname.startsWith('/api/transbank')) {
    return 'transbank';
  } else if (pathname.startsWith('/api')) {
    return 'api';
  }
  return 'general';
}

// Obtener límite adecuado para la ruta
function getRateLimitForPath(pathname: string): number {
  const category = getRateLimitCategory(pathname);
  return rateLimits[category as keyof typeof rateLimits];
}

// Limpiar el mapa de rate-limiting periódicamente para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  Array.from(requestCounts.entries()).forEach(([key, record]) => {
    if (now - record.lastReset > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  });
}, RATE_LIMIT_WINDOW * 5); // Cada 5 minutos

export function middleware(request: NextRequest) {
  // Obtener IP para rate limiting
  const ip = request.ip || 'unknown';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  
  // Lista de rutas que no deben ser interceptadas por el middleware
  const bypassRoutes = ['/payment/confirmation', '/api/transbank/commit', '/api/transbank/create'];
  if (bypassRoutes.some(route => pathname.includes(route)) && url.searchParams.has('token_ws')) {
    return NextResponse.next();
  }

  // Aplicar rate limiting excepto para rutas críticas
  if (!bypassRoutes.some(route => pathname.includes(route))) {
    const withinLimit = checkRateLimit(ip, pathname);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes, por favor intenta más tarde' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Manejar solicitudes preflight OPTIONS
  if (request.method === 'OPTIONS') {
    // Obtener el origen de la solicitud
    const origin = request.headers.get('origin');
    
    // Configuración dinámica de CORS basada en el origen
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
      'Access-Control-Max-Age': '86400', // 24 horas en segundos
    };
    
    // Solo permitir orígenes aprobados
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    } else if (process.env.NODE_ENV !== 'production') {
      // En desarrollo, permitir cualquier origen
      corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
    }
    
    return NextResponse.json({}, { headers: {...corsHeaders, ...securityHeaders} });
  }

  // Para otras solicitudes, agregar las cabeceras a la respuesta
  const response = NextResponse.next();
  
  // Obtener el origen de la solicitud
  const origin = request.headers.get('origin');
  
  // Agregar cabecera de CORS si el origen está permitido
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // En desarrollo, permitir cualquier origen
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  
  // Agregar cabeceras de seguridad a todas las respuestas
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configurar el middleware para que se aplique a todas las rutas
// excepto específicamente algunas rutas críticas de pago
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 