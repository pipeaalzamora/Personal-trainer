import crypto from 'crypto';
import { NextResponse } from 'next/server';

const USER_SESSION_COOKIE = 'pt_user_session';
const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type UserSessionPayload = {
  email: string;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getUserSessionSecret(): string {
  const secret = process.env.USER_SESSION_SECRET || process.env.TRANSACTION_SECRET_KEY || process.env.ENCRYPTION_KEY || '';

  if (!secret && process.env.NODE_ENV !== 'production') {
    return 'development-only-user-session-secret';
  }

  if (!secret) {
    throw new Error('USER_SESSION_SECRET o TRANSACTION_SECRET_KEY no está configurado');
  }

  return secret;
}

function sign(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [name, ...rawValue] = part.trim().split('=');
    if (!name || rawValue.length === 0) return acc;
    acc[name] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

export function createUserSessionToken(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const payload: UserSessionPayload = {
    email: normalizedEmail,
    exp: Date.now() + USER_SESSION_MAX_AGE * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, getUserSessionSecret());

  return `${encodedPayload}.${signature}`;
}

export function verifyUserSessionToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [encodedPayload, signature] = token.split('.');
    const expectedSignature = sign(encodedPayload, getUserSessionSecret());

    if (!safeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as UserSessionPayload;
    if (!payload.email || payload.exp < Date.now()) {
      return null;
    }

    return payload.email;
  } catch {
    return null;
  }
}

export function getUserEmailFromRequest(request: Request): string | null {
  const cookies = parseCookies(request.headers.get('cookie'));
  return verifyUserSessionToken(cookies[USER_SESSION_COOKIE]);
}

export function setUserSessionCookie(response: NextResponse, email: string) {
  response.cookies.set(USER_SESSION_COOKIE, createUserSessionToken(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: USER_SESSION_MAX_AGE,
  });
}

export function isAdminRequest(request: Request): boolean {
  const adminApiKey = process.env.ADMIN_API_KEY || '';
  if (!adminApiKey) return false;

  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const providedKey = request.headers.get('x-admin-api-key') || bearerToken;

  return Boolean(providedKey && safeEqual(providedKey, adminApiKey));
}

export function requireAdminRequest(request: Request): NextResponse | null {
  if (!process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'ADMIN_API_KEY no está configurada' },
      { status: 503 }
    );
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  return null;
}
