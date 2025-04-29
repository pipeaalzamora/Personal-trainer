import { supabase, uploadFile, getPublicUrl, deleteFile } from './supabase';
import type { Database } from '@/types/supabase';

// Tipos
type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type User = Database['public']['Tables']['users']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type FileRecord = Database['public']['Tables']['files']['Row'];

// Constantes
const BUCKET_COURSES = 'course-files';

// API de Cursos
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error al obtener cursos:', error);
    throw error;
  }
  
  return data || [];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = No se encontró el registro
    console.error('Error al obtener curso por ID:', error);
    throw error;
  }
  
  return data;
}

export async function createCourse(course: CourseInsert): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert([course])
    .select()
    .single();
  
  if (error) {
    console.error('Error al crear curso:', error);
    throw error;
  }
  
  return data;
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error al actualizar curso:', error);
    throw error;
  }
  
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  // Primero eliminamos los archivos asociados
  const { data: files } = await supabase
    .from('files')
    .select('path')
    .eq('course_id', id);
    
  if (files && files.length > 0) {
    for (const file of files) {
      await deleteFile(BUCKET_COURSES, file.path);
    }
  }
  
  // Luego eliminamos el curso
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error al eliminar curso:', error);
    throw error;
  }
}

// API de Usuarios
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error al obtener usuario por email:', error);
    throw error;
  }
  
  return data;
}

export async function createUser(email: string, verificationToken: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email,
      verified: false,
      verification_token: verificationToken
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
  
  return data;
}

export async function verifyUser(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .update({ verified: true, verification_token: null })
    .eq('verification_token', token)
    .select()
    .single();
  
  if (error) {
    console.error('Error al verificar usuario:', error);
    return false;
  }
  
  return !!data;
}

// API de Órdenes
export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error al obtener órdenes del usuario:', error);
    throw error;
  }
  
  return data || [];
}

export async function getOrderItems(orderId: string): Promise<(OrderItem & { course: Course })[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('order_id', orderId);
  
  if (error) {
    console.error('Error al obtener items de la orden:', error);
    throw error;
  }
  
  return data || [];
}

// API de Archivos
export async function uploadCourseFile(
  courseId: string, 
  file: File | Blob,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<string> {
  // Generar una ruta única para el archivo
  const uniquePath = `courses/${courseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9\.-]/g, '_')}`;
  
  // Subir el archivo a Supabase Storage
  await uploadFile(BUCKET_COURSES, uniquePath, file, {
    contentType: fileType,
    upsert: true
  });
  
  // Obtener la URL pública del archivo
  const publicUrl = getPublicUrl(BUCKET_COURSES, uniquePath);
  
  // Registrar el archivo en la base de datos
  const { data, error } = await supabase
    .from('files')
    .insert([{
      course_id: courseId,
      name: fileName,
      path: uniquePath,
      type: fileType,
      size: fileSize
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error al registrar archivo:', error);
    throw error;
  }
  
  return publicUrl;
}

export async function getCourseFiles(courseId: string): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error al obtener archivos del curso:', error);
    throw error;
  }
  
  return data || [];
}

export async function deleteCourseFile(fileId: string): Promise<void> {
  // Obtener la información del archivo
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('path')
    .eq('id', fileId)
    .single();
  
  if (fetchError) {
    console.error('Error al obtener información del archivo:', fetchError);
    throw fetchError;
  }
  
  if (file) {
    // Eliminar el archivo de Storage
    await deleteFile(BUCKET_COURSES, file.path);
    
    // Eliminar el registro de la base de datos
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
    
    if (deleteError) {
      console.error('Error al eliminar registro del archivo:', deleteError);
      throw deleteError;
    }
  }
} 