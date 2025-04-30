import { NextRequest, NextResponse } from 'next/server';

// Configuración de cabeceras CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 horas en segundos
};

export function middleware(request: NextRequest) {
  // Si la URL contiene parameters del tipo token_ws, es una redirección de Transbank
  // y no debemos interferir con las cabeceras
  const url = request.nextUrl.clone();
  if (url.searchParams.has('token_ws')) {
    return NextResponse.next();
  }

  // Manejar solicitudes preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  // Para otras solicitudes, agregar las cabeceras CORS a la respuesta
  const response = NextResponse.next();
  
  // Agregar cabeceras CORS a todas las solicitudes API
  Object.entries(corsHeaders).forEach(([key, value]) => {
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