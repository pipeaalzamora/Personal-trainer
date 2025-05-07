import { z } from 'zod';

// Esquemas de validación comunes
export const idSchema = z.string().min(1).max(100);
export const emailSchema = z.string().email().max(255);
export const nameSchema = z.string().min(2).max(100);
export const phoneSchema = z.string().regex(/^\+?[0-9]{8,15}$/, 'Número de teléfono inválido');
export const passwordSchema = z.string().min(8).max(100);
export const urlSchema = z.string().url().max(2048);

// Esquema de validación para curso
export const courseSchema = z.object({
  id: idSchema.optional(),
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(2000),
  price: z.number().min(0),
  imageUrl: urlSchema.optional().nullable(),
  published: z.boolean().optional().default(false),
});

// Esquema de validación para transacción
export const transactionSchema = z.object({
  amount: z.number().min(1),
  orderNumber: z.string().min(1),
  returnUrl: urlSchema,
  sessionId: z.string().optional(),
});

// Esquema de validación para reembolso
export const refundSchema = z.object({
  token: z.string().min(1),
  amount: z.number().min(1).optional(),
});

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

// Función para sanitizar textos contra XSS
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
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
    .replace(/\*\//g, '');
}

// Función para verificar y sanitizar IDs
export function sanitizeId(id: string): string {
  // Solo permitir caracteres alfanuméricos, guiones y guiones bajos
  return id.replace(/[^a-zA-Z0-9\-_]/g, '');
} 