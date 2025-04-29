import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'El token de verificación es requerido' }, 
        { status: 400 }
      );
    }
    
    // Buscar el usuario con el token proporcionado
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Token de verificación inválido' },
        { status: 404 }
      );
    }
    
    // Verificar el usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationToken: null
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Correo electrónico verificado correctamente' 
    });
  } catch (error: unknown) {
    console.error('Error verificando correo:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al verificar el correo electrónico' }, 
      { status: 500 }
    );
  }
} 