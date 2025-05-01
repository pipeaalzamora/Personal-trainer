import { supabase, uploadFile, getPublicUrl, deleteFile } from './supabase';
import type { Database } from '@/types/supabase';

// Tipos
type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type User = Database['public']['Tables']['users']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type FileRecord = Database['public']['Tables']['files']['Row'];

// Nuevos tipos para transacciones
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

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

// Nueva función para crear una orden en la base de datos
export async function createOrder(
  userId: string,
  totalAmount: number,
  buyOrder: string,
  sessionId: string,
  token: string = '',
  status: string = 'CREATED'
): Promise<Order> {
  const orderData: OrderInsert = {
    user_id: userId,
    total_amount: totalAmount,
    status: status,
    buy_order: buyOrder,
    session_id: sessionId,
    transaction_token: token
  };
  
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();
  
  if (error) {
    console.error('Error al crear orden:', error);
    throw error;
  }
  
  return data;
}

// Nueva función para actualizar una orden existente con la respuesta de la transacción
export async function updateOrderTransaction(
  buyOrder: string,
  status: string,
  transactionData: any,
  token: string = ''
): Promise<Order> {
  console.log(`updateOrderTransaction: Actualizando orden ${buyOrder} a estado ${status}`);

  // Verificar si la orden existe
  const { data: existingOrder, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('buy_order', buyOrder)
    .single();

  if (findError) {
    console.error(`Error al buscar orden con buy_order=${buyOrder}:`, findError);
    throw findError;
  }

  if (!existingOrder) {
    console.error(`No se encontró ninguna orden con buy_order=${buyOrder}`);
    throw new Error(`No se encontró la orden con buy_order=${buyOrder}`);
  }

  console.log(`updateOrderTransaction: Orden encontrada con ID=${existingOrder.id}, estado actual=${existingOrder.status}`);

  // Preparar los datos para la actualización
  const updateData: any = {
    status: status,
    updated_at: new Date().toISOString()
  };

  // Actualizar el token sólo si se proporciona
  if (token) {
    updateData.transaction_token = token;
  }

  // Actualizar los datos de la transacción si se proporcionan
  if (transactionData && Object.keys(transactionData).length > 0) {
    updateData.transaction_response = transactionData;
  }

  console.log(`updateOrderTransaction: Actualizando datos:`, updateData);

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('buy_order', buyOrder)
    .select()
    .single();
  
  if (error) {
    console.error(`Error al actualizar orden con buy_order=${buyOrder}:`, error);
    throw error;
  }

  console.log(`updateOrderTransaction: Orden actualizada correctamente, nuevo estado=${data.status}`);
  
  return data;
}

// Nueva función para crear items de orden (cursos comprados)
export async function createOrderItems(
  orderId: string,
  items: { course_id: string, price: number }[]
): Promise<OrderItem[]> {
  const orderItems: OrderItemInsert[] = items.map(item => ({
    order_id: orderId,
    course_id: item.course_id,
    price: item.price
  }));
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select();
  
  if (error) {
    console.error('Error al crear items de orden:', error);
    throw error;
  }
  
  return data;
}

// Nueva función para obtener una orden por su número de orden (buy_order)
export async function getOrderByBuyOrder(buyOrder: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buy_order', buyOrder)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error al obtener orden por buy_order:', error);
    throw error;
  }
  
  return data;
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
      console.error('Error al eliminar registro de archivo:', deleteError);
      throw deleteError;
    }
  }
}

export async function getOrderTransactionHistory(orderId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('order_transaction_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error al obtener historial de transacción:', error);
    throw error;
  }
  
  return data || [];
}

export async function addOrderTransactionHistory(
  orderId: string,
  status: string,
  data: any = {}
): Promise<any> {
  const { data: result, error } = await supabase
    .from('order_transaction_history')
    .insert([{
      order_id: orderId,
      status,
      data
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error al agregar historial de transacción:', error);
    throw error;
  }
  
  return result;
} 