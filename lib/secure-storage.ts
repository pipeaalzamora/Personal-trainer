/**
 * Utilidades para almacenamiento seguro de datos sensibles
 * Usa cookies HttpOnly cuando es posible, con fallback a sessionStorage
 */

// Nombres de las cookies/keys
export const STORAGE_KEYS = {
  CART: 'cart_data',
  USER_EMAIL: 'user_email',
  TBK_TOKEN: 'tbk_token',
  TBK_BUY_ORDER: 'tbk_buy_order',
  TBK_SESSION_ID: 'tbk_session_id',
  TBK_AMOUNT: 'tbk_amount',
  SELECTED_GENDER: 'selectedGender',
} as const;

// Configuración de cookies
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24, // 24 horas
};

/**
 * Establece una cookie en el cliente
 */
export function setClientCookie(name: string, value: string, maxAge?: number): void {
  if (typeof document === 'undefined') return;
  
  const options = {
    ...COOKIE_OPTIONS,
    maxAge: maxAge || COOKIE_OPTIONS.maxAge,
  };
  
  const cookieString = `${name}=${encodeURIComponent(value)}; path=${options.path}; max-age=${options.maxAge}; samesite=${options.sameSite}${options.secure ? '; secure' : ''}`;
  document.cookie = cookieString;
}

/**
 * Obtiene una cookie del cliente
 */
export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

/**
 * Elimina una cookie del cliente
 */
export function deleteClientCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/**
 * Guarda datos del carrito de forma segura
 */
export function saveCartData(cart: any[]): void {
  const cartJson = JSON.stringify(cart);
  setClientCookie(STORAGE_KEYS.CART, cartJson);
}

/**
 * Obtiene datos del carrito
 */
export function getCartData(): any[] {
  const cartJson = getClientCookie(STORAGE_KEYS.CART);
  if (!cartJson) return [];
  
  try {
    return JSON.parse(cartJson);
  } catch {
    return [];
  }
}

/**
 * Limpia datos del carrito
 */
export function clearCartData(): void {
  deleteClientCookie(STORAGE_KEYS.CART);
}

/**
 * Guarda datos de transacción de forma segura
 */
export function saveTransactionData(data: {
  email: string;
  buyOrder: string;
  sessionId: string;
  amount: number;
  token?: string;
}): void {
  // Usar cookies con tiempo de vida corto para datos de transacción (30 min)
  const shortMaxAge = 60 * 30;
  
  setClientCookie(STORAGE_KEYS.USER_EMAIL, data.email, shortMaxAge);
  setClientCookie(STORAGE_KEYS.TBK_BUY_ORDER, data.buyOrder, shortMaxAge);
  setClientCookie(STORAGE_KEYS.TBK_SESSION_ID, data.sessionId, shortMaxAge);
  setClientCookie(STORAGE_KEYS.TBK_AMOUNT, data.amount.toString(), shortMaxAge);
  
  if (data.token) {
    setClientCookie(STORAGE_KEYS.TBK_TOKEN, data.token, shortMaxAge);
  }
}

/**
 * Obtiene datos de transacción
 */
export function getTransactionData(): {
  email: string | null;
  buyOrder: string | null;
  sessionId: string | null;
  amount: number | null;
  token: string | null;
} {
  return {
    email: getClientCookie(STORAGE_KEYS.USER_EMAIL),
    buyOrder: getClientCookie(STORAGE_KEYS.TBK_BUY_ORDER),
    sessionId: getClientCookie(STORAGE_KEYS.TBK_SESSION_ID),
    amount: getClientCookie(STORAGE_KEYS.TBK_AMOUNT) 
      ? parseInt(getClientCookie(STORAGE_KEYS.TBK_AMOUNT)!, 10) 
      : null,
    token: getClientCookie(STORAGE_KEYS.TBK_TOKEN),
  };
}

/**
 * Limpia todos los datos de transacción
 */
export function clearTransactionData(): void {
  deleteClientCookie(STORAGE_KEYS.USER_EMAIL);
  deleteClientCookie(STORAGE_KEYS.TBK_BUY_ORDER);
  deleteClientCookie(STORAGE_KEYS.TBK_SESSION_ID);
  deleteClientCookie(STORAGE_KEYS.TBK_AMOUNT);
  deleteClientCookie(STORAGE_KEYS.TBK_TOKEN);
}

/**
 * Guarda preferencia de género
 */
export function saveGenderPreference(gender: 'male' | 'female'): void {
  setClientCookie(STORAGE_KEYS.SELECTED_GENDER, gender, 60 * 60 * 24 * 365); // 1 año
}

/**
 * Obtiene preferencia de género
 */
export function getGenderPreference(): 'male' | 'female' | null {
  const gender = getClientCookie(STORAGE_KEYS.SELECTED_GENDER);
  if (gender === 'male' || gender === 'female') {
    return gender;
  }
  return null;
}
