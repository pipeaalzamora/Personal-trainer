import { NextRequest, NextResponse } from 'next/server';

// Configuración de dominios permitidos
const allowedOrigins = ['http://localhost:3000', 'https://www.coachinostroza.cl'];

// Cabeceras de seguridad básicas para todas las respuestas
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;",
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Implementación de rate limiting básico
const requestCounts = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 100; // Máximo de solicitudes por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, lastReset: now };
  
  // Reiniciar contador si ha pasado el tiempo de ventana
  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.lastReset = now;
  }
  
  // Incrementar contador y verificar límite
  record.count++;
  requestCounts.set(ip, record);
  
  return record.count <= MAX_REQUESTS;
}

export function middleware(request: NextRequest) {
  // Obtener IP para rate limiting
  const ip = request.ip || 'unknown';
  
  // Si la URL contiene parameters del tipo token_ws, es una redirección de Transbank
  // y no debemos interferir con las cabeceras
  const url = request.nextUrl.clone();
  if (url.searchParams.has('token_ws')) {
    return NextResponse.next();
  }

  // Aplicar rate limiting (excepto para rutas críticas)
  if (!url.pathname.includes('/payment/confirmation')) {
    const withinLimit = checkRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 horas en segundos
    };
    
    // Solo permitir orígenes aprobados
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
    
    return NextResponse.json({}, { headers: {...corsHeaders, ...securityHeaders} });
  }

  // Para otras solicitudes, agregar las cabeceras a la respuesta
  const response = NextResponse.next();
  
  // Obtener el origen de la solicitud
  const origin = request.headers.get('origin');
  
  // Agregar cabecera de CORS si el origen está permitido
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.append('Access-Control-Allow-Origin', origin);
  }
  
  // Agregar cabeceras de seguridad a todas las respuestas
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.append(key, value);
  });

  return response;
}

// Configurar el middleware para que solo se aplique a las rutas de API
// y excluir explícitamente las rutas de confirmación de pago
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!payment/confirmation).*)',
  ],
}; 