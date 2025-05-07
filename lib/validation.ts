import { z } from 'zod';

// Esquemas de validación mejorados
export const idSchema = z.string().trim().min(1).max(100)
  .regex(/^[a-zA-Z0-9\-_]+$/, 'ID debe contener solo letras, números, guiones o guiones bajos');

export const emailSchema = z.string().trim().toLowerCase().email('Email inválido')
  .max(255)
  .refine(email => !email.includes('script'), {
    message: 'Email contiene caracteres no permitidos'
  });

export const nameSchema = z.string().trim().min(2).max(100)
  .regex(/^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑüÜ.,]+$/, 'Nombre contiene caracteres no permitidos');

export const phoneSchema = z.string().trim()
  .regex(/^\+?[0-9]{8,15}$/, 'Número de teléfono inválido')
  .refine(phone => !/[^\d+]/.test(phone), {
    message: 'Teléfono debe contener solo números y posiblemente un signo + al inicio'
  });

export const passwordSchema = z.string().min(8).max(100)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
    'Contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');

export const urlSchema = z.string().url('URL inválida').max(2048)
  .refine(url => {
    try {
      const parsedUrl = new URL(url);
      // Verificar protocolo (solo permitir http y https)
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }, {
    message: 'URL debe usar protocolo http o https'
  });

// Esquema de validación mejorado para curso
export const courseSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(2000),
  price: z.number().nonnegative('El precio no puede ser negativo').max(10000000, 'Precio demasiado alto'),
  imageUrl: urlSchema.optional().nullable(),
  category: z.string().trim().min(2).max(100).optional(),
  published: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Esquema de validación para transacción mejorado
export const transactionSchema = z.object({
  amount: z.number().positive('Monto debe ser mayor a cero').max(10000000, 'Monto demasiado alto'),
  orderNumber: z.string().trim().min(1).max(100)
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Número de orden debe contener solo caracteres alfanuméricos, guiones o guiones bajos'),
  returnUrl: urlSchema,
  sessionId: z.string().trim().max(255).optional(),
});

// Esquema de validación para reembolso
export const refundSchema = z.object({
  token: z.string().trim().min(5).max(255),
  amount: z.number().positive('Monto debe ser mayor a cero').max(10000000, 'Monto demasiado alto').optional(),
  buyOrder: z.string().trim().optional(),
});

// Esquema de validación para carrito de compras
export const cartItemSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(2).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const cartSchema = z.array(cartItemSchema);

// Función para validar datos con mensajes de error claros
export function validateData<T>(data: unknown, schema: z.ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Formatea los errores de manera más legible
      const errorMessage = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      
      throw new Error(`Error de validación: ${errorMessage}`);
    }
    throw error;
  }
}

// Función mejorada para sanitizar textos contra XSS
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/\(/g, '&#x28;')
    .replace(/\)/g, '&#x29;')
    .replace(/script/gi, 'scrīpt')
    .replace(/on\w+=/gi, 'data-disabled-event=');
}

// Función para limpiar parámetros de consulta SQL para prevenir inyección
export function sanitizeSqlParam(param: string): string {
  if (!param) return '';
  
  // Elimina caracteres que podrían usarse para inyección SQL
  return param
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/union\s+select/gi, '')
    .replace(/select/gi, '')
    .replace(/insert/gi, '')
    .replace(/update/gi, '')
    .replace(/delete/gi, '')
    .replace(/drop/gi, '')
    .replace(/exec/gi, '')
    .replace(/xp_/gi, '');
}

// Función mejorada para verificar y sanitizar IDs
export function sanitizeId(id: string): string {
  // Solo permitir caracteres alfanuméricos, guiones y guiones bajos
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 100);
}

// Función para validar datos JSON
export function validateJSON(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Verificar que no sea una función o un objeto con funciones
    const jsonStr = JSON.stringify(parsed);
    const reparsed = JSON.parse(jsonStr);
    
    return reparsed;
  } catch (error) {
    throw new Error('JSON inválido');
  }
}

// Función para sanitizar HTML (útil para descripciones ricas)
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  // Eliminar etiquetas peligrosas pero mantener estructura básica
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<base\b[^<]*(?:(?!<\/base>)<[^<]*)*<\/base>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, 'nojavascript:')
    .replace(/data:/gi, 'nodata:');
} 