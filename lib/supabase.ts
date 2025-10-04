import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Verificar que las variables de entorno estén definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validación más estricta de las variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR CRÍTICO: Faltan las variables de entorno de Supabase:');
  if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL no está definido');
  if (!supabaseAnonKey) console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY no está definido');
  
  // En desarrollo, mostrar mensaje de ayuda
  if (process.env.NODE_ENV === 'development') {
    console.error('\nSOLUCIÓN: Asegúrate de crear un archivo .env.local con estas variables.');
    console.error('Ejemplo de .env.local:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon\n');
  }
  
  // Cuando se ejecuta en el servidor, lanzar error para evitar que la aplicación se inicie sin estas variables
  if (typeof window === 'undefined') {
    throw new Error('Faltan las variables de entorno de Supabase. Revisa tu configuración.');
  }
}

// Crear el cliente de Supabase con tipos
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  }
);

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