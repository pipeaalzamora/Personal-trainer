import { NextRequest, NextResponse } from 'next/server';

// Configuración de dominios permitidos (solo producción)
const allowedOrigins = [
  'https://www.coachinostroza.cl',
  'https://coachinostroza.cl',
  'https://coach-inostroza.vercel.app',
];

// En desarrollo, agregar localhost
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

// Cabeceras de seguridad mejoradas
const isDev = process.env.NODE_ENV !== 'production';

// CSP más permisivo en desarrollo para Next.js
const cspPolicy = isDev
  ? "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl https://*.supabase.co wss://*.supabase.co;"
  : "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl https://*.supabase.co;";

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': cspPolicy,
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
};

// Rate limiting en memoria
const requestCounts = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;

const rateLimits = {
  api: 100,
  transbank: 20,
  general: 200
};

function checkRateLimit(ip: string, pathname: string): boolean {
  const now = Date.now();
  const category = pathname.startsWith('/api/transbank') ? 'transbank' 
    : pathname.startsWith('/api') ? 'api' : 'general';
  const key = `${ip}:${category}`;
  const record = requestCounts.get(key) || { count: 0, lastReset: now };
  
  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.lastReset = now;
  }
  
  record.count++;
  requestCounts.set(key, record);
  
  return record.count <= rateLimits[category as keyof typeof rateLimits];
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const origin = request.headers.get('origin');
  
  // Bypass para rutas de pago con token
  const bypassRoutes = ['/payment/confirmation', '/api/transbank/commit'];
  if (bypassRoutes.some(route => pathname.includes(route)) && 
      (url.searchParams.has('token_ws') || request.method === 'POST')) {
    const response = NextResponse.next();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Rate limiting
  if (!checkRateLimit(ip, pathname)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes, por favor intenta más tarde' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Preflight OPTIONS
  if (request.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(origin);
    return new NextResponse(null, { 
      status: 204, 
      headers: { ...corsHeaders, ...securityHeaders } 
    });
  }

  // Respuesta normal con headers de seguridad
  const response = NextResponse.next();
  
  // CORS solo para orígenes permitidos
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Headers de seguridad
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$).*)',
  ],
};
