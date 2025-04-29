import { supabase } from './supabase';
import { Course, Purchase, CourseFile } from './models';

// Funciones para cursos
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getCourseById(id: number): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Funciones para compras
export async function createPurchase(purchase: Omit<Purchase, 'id' | 'created_at'>): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .insert([purchase])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePurchaseStatus(id: number, status: Purchase['payment_status'], transaction_id?: string): Promise<void> {
  const { error } = await supabase
    .from('purchases')
    .update({ 
      payment_status: status,
      transaction_id
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function getUserPurchases(userId: string): Promise<(Purchase & { course: Course })[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('user_id', userId)
    .eq('payment_status', 'completed');
  
  if (error) throw error;
  return data || [];
}

// Funciones para archivos
export async function uploadFile(courseId: number, file: Blob, filename: string, fileType: string, fileSize: number): Promise<{ path: string }> {
  const uniqueFileName = `${Date.now()}_${filename}`;
  
  // Subir el archivo a Supabase Storage
  const { data, error } = await supabase
    .storage
    .from('course-files')
    .upload(`courses/${courseId}/${uniqueFileName}`, file);
  
  if (error) throw error;
  
  // Registrar el archivo en la base de datos
  const filePath = data?.path || '';
  const { data: publicUrl } = supabase
    .storage
    .from('course-files')
    .getPublicUrl(filePath);
  
  await supabase
    .from('files')
    .insert([{
      course_id: courseId,
      name: filename,
      url: publicUrl.publicUrl,
      type: fileType,
      size: fileSize
    }]);
  
  return data;
}

export async function getCourseFiles(courseId: number): Promise<CourseFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('course_id', courseId);
  
  if (error) throw error;
  return data || [];
} 