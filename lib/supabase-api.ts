import { supabase, uploadFile, getPublicUrl, deleteFile } from './supabase';
import type { Database } from '@/types/supabase';

// Tipos
type Course = Database['public']['Tables']['courses']['Row'] & {
  category?: string; // Añadir campo category opcional
};
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
const BUCKET_COURSE_EXCEL = 'course-excel'; // Nombre del bucket donde están los Excel

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
  status: string = 'CREATED',
  additionalData: any = {}
): Promise<Order> {
  const orderData: OrderInsert = {
    user_id: userId,
    total_amount: totalAmount,
    status: status,
    buy_order: buyOrder,
    session_id: sessionId,
    transaction_token: token,
    transaction_response: additionalData
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

// Función para obtener la categoría y nombre formateado de un curso por su ID
async function getCourseNameAndCategory(courseId: string): Promise<{ name: string, category: string } | null> {
  try {
    const course = await getCourseById(courseId);
    if (!course) {
      console.error(`No se encontró el curso con ID ${courseId}`);
      return null;
    }
    
    // Formatear el nombre del curso para usarlo como nombre de carpeta
    // Eliminar caracteres especiales y espacios
    const formattedName = course.title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/-+/g, '-') // Evitar guiones múltiples consecutivos
      .replace(/^-|-$/g, ''); // Eliminar guiones al inicio o final
    
    // Determinar la categoría del curso
    // Si no existe un campo category explícito, intentar extraerlo de metadatos o usar un valor predeterminado
    let categoryName = 'sin-categoria';
    
    if (course.category) {
      categoryName = course.category;
    } else {
      // Intentar extraer la categoría de los metadatos si existe
      const metadata = (course as any).metadata;
      if (metadata && metadata.category) {
        categoryName = metadata.category;
      }
    }
    
    // Formatear la categoría
    const formattedCategory = categoryName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return {
      name: formattedName,
      category: formattedCategory
    };
  } catch (error) {
    console.error(`Error al obtener nombre y categoría del curso ${courseId}:`, error);
    return null;
  }
}

// Modificar la función getCourseExcelFile para trabajar con nombres reales
export async function getCourseExcelFile(
  courseId: string,
  category?: string,
  phase: string = "Fase 1"
): Promise<{ data: Buffer | null, filename: string | null, contentType: string | null }> {
  try {
    console.log(`Buscando archivo Excel para curso: ${courseId}, categoría: ${category || 'todas'}, fase: ${phase}`);
    
    // Obtener el nombre y categoría formateados del curso
    const courseInfo = await getCourseNameAndCategory(courseId);
    
    if (!courseInfo) {
      console.warn(`No se pudo obtener información del curso ${courseId}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // Si se especifica una categoría, usarla; de lo contrario, usar la del curso
    const categoryToUse = category || courseInfo.category;
    
    // Construir la ruta completa
    const coursePath = `${categoryToUse}/${courseInfo.name}`;
    
    console.log(`Buscando en ruta: ${coursePath}`);
    
    // Intenta obtener el archivo desde la ruta específica
    const result = await getCourseExcelFileFromPath(coursePath, phase);
    
    if (result.data) {
      return result;
    }
    
    // Si no se encuentra, intenta buscar por ID como fallback
    console.log(`No se encontró por nombre, intentando buscar por ID: ${categoryToUse}/${courseId}`);
    return await getCourseExcelFileFromPath(`${categoryToUse}/${courseId}`, phase);
  } catch (error) {
    console.error(`Error al obtener archivo Excel para curso ${courseId}:`, error);
    throw error;
  }
}

// Nueva función auxiliar para obtener un archivo Excel desde una ruta específica
async function getCourseExcelFileFromPath(
  coursePath: string,  // Ruta en formato "categoria/curso"
  phase: string = "Fase 1"
): Promise<{ data: Buffer | null, filename: string | null, contentType: string | null }> {
  try {
    // Listar contenido de la carpeta del curso
    const { data: files, error } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(coursePath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error(`Error al listar archivos para ruta ${coursePath}:`, error);
      throw error;
    }
    
    if (!files || files.length === 0) {
      console.warn(`No se encontraron archivos Excel para la ruta ${coursePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // Buscar el archivo de la fase específica primero
    let excelFile = files.find(file => 
      (file.name === `${phase}.xlsx` || file.name === `${phase}.xls`) ||
      (file.name.toLowerCase() === `${phase.toLowerCase()}.xlsx` || file.name.toLowerCase() === `${phase.toLowerCase()}.xls`)
    );
    
    // Si no se encuentra la fase específica, buscar cualquier archivo Excel
    if (!excelFile) {
      excelFile = files.find(file => 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')
      );
    }
    
    if (!excelFile) {
      console.warn(`No se encontraron archivos Excel en la ruta ${coursePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    console.log(`Archivo Excel encontrado: ${coursePath}/${excelFile.name}`);
    
    // Obtener URL pública para descargar el archivo
    const filePath = `${coursePath}/${excelFile.name}`;
    
    // Descargar el archivo
    const { data, error: downloadError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .download(filePath);
    
    if (downloadError) {
      console.error(`Error al descargar archivo Excel para ruta ${filePath}:`, downloadError);
      throw downloadError;
    }
    
    if (!data) {
      console.warn(`No se pudo descargar el archivo Excel para la ruta ${filePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // Determinar el tipo de contenido basado en la extensión del archivo
    const contentType = excelFile.name.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';
    
    // Convertir el archivo a Buffer
    const buffer = await data.arrayBuffer().then(arrayBuffer => Buffer.from(arrayBuffer));
    
    return { 
      data: buffer, 
      filename: excelFile.name,
      contentType
    };
  } catch (error) {
    console.error(`Error al obtener archivo Excel desde ${coursePath}:`, error);
    return { data: null, filename: null, contentType: null };
  }
}

// Modificar la función getAllExcelFiles para mantener metadata sobre nombres reales
export async function getAllExcelFiles(): Promise<Array<{
  id: string,
  name: string,
  category: string,
  category_display: string,
  course_id: string,
  course_name: string,
  phase: string
}>> {
  try {
    // Listar todas las categorías en el bucket
    const { data: categories, error: catError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (catError) {
      console.error('Error al listar categorías:', catError);
      throw catError;
    }
    
    // Filtrar solo las carpetas (categorías)
    const categoryFolders = categories
      .filter(item => item.metadata?.mimetype === null)
      .map(folder => folder.name);
    
    // Obtener el mapeo de todos los cursos para referencias cruzadas
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, category');
    
    const courseMap = new Map();
    if (allCourses) {
      allCourses.forEach(course => {
        // Crear un mapa por ID
        courseMap.set(course.id, {
          title: course.title,
          category: course.category
        });
        
        // También crear un mapa por nombre formateado
        const formattedName = course.title
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        courseMap.set(formattedName, {
          id: course.id,
          title: course.title,
          category: course.category
        });
      });
    }
    
    const result = [];
    
    // Para cada categoría, listar los cursos
    for (const category of categoryFolders) {
      const { data: courses, error: coursesError } = await supabase
        .storage
        .from(BUCKET_COURSE_EXCEL)
        .list(category, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (coursesError) {
        console.error(`Error al listar cursos para categoría ${category}:`, coursesError);
        continue;
      }
      
      // Filtrar solo las carpetas (cursos)
      const courseFolders = courses
        .filter(item => item.metadata?.mimetype === null)
        .map(folder => folder.name);
      
      // Para cada curso, listar los archivos Excel
      for (const courseName of courseFolders) {
        const { data: files, error: filesError } = await supabase
          .storage
          .from(BUCKET_COURSE_EXCEL)
          .list(`${category}/${courseName}`, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (filesError) {
          console.error(`Error al listar archivos para curso ${courseName} en categoría ${category}:`, filesError);
          continue;
        }
        
        // Intentar encontrar el ID del curso basado en el nombre formateado o asumir que el nombre de la carpeta es el ID
        let courseId = courseName;
        let courseTitle = courseName;
        let categoryDisplay = category;
        
        // Buscar información del curso ya sea por ID o por nombre formateado
        const courseInfo = courseMap.get(courseName);
        if (courseInfo) {
          if (courseInfo.id) {
            courseId = courseInfo.id;
            courseTitle = courseInfo.title;
            categoryDisplay = courseInfo.category;
          } else {
            courseTitle = courseInfo.title;
            categoryDisplay = courseInfo.category;
          }
        }
        
        // Encontrar archivos Excel (.xlsx o .xls)
        const excelFiles = files.filter(file => 
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')
        );
        
        for (const excelFile of excelFiles) {
          // Determinar la fase del archivo (si el nombre es "Fase X.xlsx" o similar)
          let phase = 'Desconocida';
          if (excelFile.name.toLowerCase().startsWith('fase')) {
            phase = excelFile.name.split('.')[0]; // "Fase 1"
          }
          
          result.push({
            id: `${category}/${courseName}/${excelFile.name}`,
            name: excelFile.name,
            category,
            category_display: categoryDisplay,
            course_id: courseId,
            course_name: courseTitle,
            phase
          });
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error al obtener todos los archivos Excel:', error);
    throw error;
  }
}

// Función para subir un archivo Excel a la estructura organizada
export async function uploadCourseExcelFile(
  courseId: string,
  file: File | Blob,
  fileName: string = "Fase 1.xlsx",
  metadata: { phase?: string } = {}
): Promise<string> {
  try {
    // Obtener información del curso
    const courseInfo = await getCourseNameAndCategory(courseId);
    if (!courseInfo) {
      throw new Error(`No se pudo obtener información del curso ${courseId}`);
    }
    
    // Construir la ruta del archivo
    const filePath = `${courseInfo.category}/${courseInfo.name}/${fileName}`;
    console.log(`Subiendo archivo Excel a: ${filePath}`);
    
    // Asegurarse de que la extensión sea la correcta
    const finalFileName = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') 
      ? fileName 
      : `${fileName}.xlsx`;
    
    // Subir el archivo
    await uploadFile(BUCKET_COURSE_EXCEL, filePath, file, {
      contentType: fileName.endsWith('.xlsx') 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel',
      upsert: true
    });
    
    // Registrar el archivo en la base de datos
    await associateExcelToCourse(courseId, {
      filename: finalFileName,
      path: filePath,
      contentType: fileName.endsWith('.xlsx') 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel',
      category: courseInfo.category,
      phase: metadata.phase || (finalFileName.toLowerCase().startsWith('fase') ? finalFileName.split('.')[0] : 'Fase 1')
    });
    
    return filePath;
  } catch (error) {
    console.error(`Error al subir archivo Excel para curso ${courseId}:`, error);
    throw error;
  }
}

// Modificar la función associateExcelToCourse para trabajar con la nueva estructura
export async function associateExcelToCourse(
  courseId: string,
  excelFile: {
    filename: string;
    path: string;
    size?: number;
    contentType?: string;
    category?: string;
    phase?: string;
  }
): Promise<boolean> {
  try {
    console.log(`Asociando archivo Excel ${excelFile.filename} al curso ${courseId}`);
    
    // Verificar si el curso existe
    const course = await getCourseById(courseId);
    if (!course) {
      console.error(`No se encontró el curso con ID ${courseId}`);
      return false;
    }
    
    // Extraer la categoría y fase del path si están disponibles
    const pathParts = excelFile.path.split('/');
    const category = excelFile.category || (pathParts.length > 1 ? pathParts[0] : undefined);
    const phase = excelFile.phase || (excelFile.filename.toLowerCase().startsWith('fase') ? 
      excelFile.filename.split('.')[0] : 'Fase 1');
    
    // Insertar registro en la tabla de archivos de cursos
    const { error } = await supabase
      .from('files')
      .insert([{
        course_id: courseId,
        name: excelFile.filename,
        path: excelFile.path,
        type: excelFile.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: excelFile.size || 0,
        metadata: {
          category,
          phase
        }
      }]);
    
    if (error) {
      console.error(`Error al asociar archivo Excel al curso ${courseId}:`, error);
      return false;
    }
    
    console.log(`Archivo Excel asociado con éxito al curso ${courseId}`);
    return true;
  } catch (error) {
    console.error(`Error al asociar archivo Excel al curso ${courseId}:`, error);
    return false;
  }
}

// Función para obtener archivos Excel para múltiples cursos
export async function getCoursesExcelFiles(courseIds: string[]): Promise<Array<{
  courseId: string;
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
}>> {
  const results = [];
  
  for (const courseId of courseIds) {
    try {
      const { data, filename, contentType } = await getCourseExcelFile(courseId);
      results.push({
        courseId,
        data,
        filename,
        contentType
      });
    } catch (error) {
      console.error(`Error al obtener Excel para curso ${courseId}:`, error);
      results.push({
        courseId,
        data: null,
        filename: null,
        contentType: null
      });
    }
  }
  
  return results;
} 