import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasSupabaseAdminConfig = Boolean(supabaseUrl && supabaseServiceKey);

if (!hasSupabaseConfig) {
  console.warn('ADVERTENCIA: Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

if (!hasSupabaseAdminConfig) {
  console.warn('ADVERTENCIA: Falta SUPABASE_SERVICE_ROLE_KEY. Las operaciones administrativas fallarán en runtime.');
}

const resolvedSupabaseUrl = supabaseUrl || 'http://127.0.0.1:54321';
const resolvedAnonKey = supabaseAnonKey || 'missing-supabase-anon-key';
const resolvedServiceKey = supabaseServiceKey || 'missing-supabase-service-role-key';
const isBrowser = typeof window !== 'undefined';

// Cliente público (para el frontend)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  resolvedSupabaseUrl,
  resolvedAnonKey,
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
    },
  }
);

// Cliente con service_role (para operaciones del servidor - bypasea RLS)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  resolvedSupabaseUrl,
  resolvedServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function assertSupabaseAdminConfigured() {
  if (!hasSupabaseAdminConfig) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado');
  }
}

// Función para validar la conexión (útil para diagnósticos)
export async function testConnection() {
  try {
    // Usar la tabla 'users' que existe en la base de datos
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error al conectar con Supabase:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado al probar conexión:', error);
    return { success: false, error };
  }
}

// Función para subir archivos a Supabase Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean; }
) {
  if (!supabase) {
    throw new Error('Cliente de Supabase no inicializado');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert || false,
    });

  if (error) {
    console.error('Error al subir archivo:', error);
    throw error;
  }

  return data;
}

// Función para obtener URL pública de un archivo
export function getPublicUrl(bucket: string, path: string) {
  if (!supabase) {
    throw new Error('Cliente de Supabase no inicializado');
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

// Función para eliminar un archivo
export async function deleteFile(bucket: string, path: string) {
  if (!supabase) {
    throw new Error('Cliente de Supabase no inicializado');
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Error al eliminar archivo:', error);
    throw error;
  }

  return true;
}

// Exportar por defecto
export default supabase;
