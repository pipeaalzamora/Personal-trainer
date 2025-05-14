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
  status: string = 'INITIATED',
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
  const { data: existingOrder, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('buy_order', buyOrder)
    .single();

  if (findError) {
    throw findError;
  }

  if (!existingOrder) {
    throw new Error(`No se encontró la orden con buy_order=${buyOrder}`);
  }

  const updateData: any = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (token) {
    updateData.transaction_token = token;
  }

  if (transactionData && Object.keys(transactionData).length > 0) {
    updateData.transaction_response = transactionData;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('buy_order', buyOrder)
    .select()
    .single();
  
  if (error) {
    throw error;
  }

  return data;
}

// Nueva función para crear items de orden (cursos comprados)
export async function createOrderItems(
  orderId: string,
  items: { course_id: string, price: number }[]
): Promise<OrderItem[]> {
  // Definir un tipo extendido para los items procesados
  interface ProcessedOrderItem {
    course_id: string;
    price: number;
    is_part_of_pack?: boolean;
  }
  
  // console.log('🔍 createOrderItems - INICIO - Recibidos:', JSON.stringify(items, null, 2));
  
  let processedItems: ProcessedOrderItem[] = [...items]; // Crear una copia de los items originales
  
  // Procesar packs completos
  for (const item of items) {
    try {
      // console.log(`🔍 Procesando item con course_id: ${item.course_id}`);
      
      // Obtener información del curso para verificar si es un pack
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('title, description, category')
        .eq('id', item.course_id)
        .single();
      
      if (courseError) {
        console.error('❌ Error al obtener información del curso:', courseError);
        continue;
      }
      
      // console.log(`📋 Información del curso: ${JSON.stringify(course, null, 2)}`);
      
      // Verificar si es un pack completo basándose en el título o categoría
      const isPack = course?.title?.toLowerCase().includes('pack completo') || 
                    course?.category?.toLowerCase().includes('pack-completo');
      
      // console.log(`🧐 ¿Es un pack completo? ${isPack ? 'SÍ' : 'NO'}`);
      
      if (isPack) {
        // console.log('📦 Detectado pack completo:', course.title);
        
        // Determinar a qué categoría pertenece este pack
        const packCategory = course.category?.toLowerCase() || '';
        const titleLower = course.title?.toLowerCase() || '';
        
        // console.log(`📋 Categoría del pack: "${packCategory}", Título: "${titleLower}"`);
        
        let categoryToSearch = '';
        
        // Obtener la categoría base del pack (por ejemplo, de "pack-completo-ganancia-muscular" extraer "ganancia-muscular")
        if (packCategory.includes('pack-completo-')) {
          categoryToSearch = packCategory.replace('pack-completo-', '');
          // console.log(`🔍 Categoría extraída del nombre de categoría: "${categoryToSearch}"`);
        } else if (titleLower.includes('pack completo')) {
          // Intentar extraer la categoría del título
          const parts = titleLower.split('pack completo');
          if (parts.length > 1) {
            categoryToSearch = parts[1].trim();
            // console.log(`🔍 Categoría extraída del título: "${categoryToSearch}"`);
          }
        }
        
        if (categoryToSearch) {
          // console.log('🔍 Buscando cursos en la categoría:', categoryToSearch);
          
          // Buscar todos los cursos individuales de esa categoría
          const { data: individualCourses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title, price, category')
            .ilike('category', `%${categoryToSearch}%`)
            .not('id', 'eq', item.course_id); // Excluir el pack mismo
          
          if (coursesError) {
            console.error('❌ Error al buscar cursos individuales:', coursesError);
            continue;
          }
          
          // console.log(`📋 Cursos individuales encontrados (${individualCourses?.length || 0}):`, 
          //   JSON.stringify(individualCourses, null, 2));
          
          if (individualCourses && individualCourses.length > 0) {
            // console.log('✅ Cursos individuales encontrados:', 
            //   individualCourses.map(c => `${c.title} (${c.category})`).join(', '));
            
            // Agregar cada curso individual como un item adicional (precio 0 para no cobrar doble)
            const additionalItems = individualCourses.map(course => ({
              course_id: course.id,
              price: 0, // Precio 0 porque ya se pagó en el pack
              is_part_of_pack: true
            }));
            
            // console.log(`📋 Items adicionales a agregar (${additionalItems.length}):`, 
            //   JSON.stringify(additionalItems, null, 2));
            
            processedItems = [...processedItems, ...additionalItems];
            
            // console.log(`📋 Lista actualizada de processedItems (${processedItems.length}):`, 
            //   JSON.stringify(processedItems, null, 2));
          } else {
            console.warn('⚠️ No se encontraron cursos individuales para el pack');
            
            // Intenta una búsqueda alternativa si no se encontraron cursos por categoría
            // console.log('🔍 Intentando búsqueda alternativa por categoría principal...');
            
            // Extraer la categoría principal (ej: de "ganancia-muscular-mujeres" sacar "ganancia-muscular")
            const mainCategory = categoryToSearch.split('-').slice(0, 2).join('-');
            
            if (mainCategory && mainCategory !== categoryToSearch) {
              // console.log(`🔍 Buscando con categoría principal: "${mainCategory}"`);
              
              const { data: altCourses, error: altError } = await supabase
                .from('courses')
                .select('id, title, price, category')
                .ilike('category', `%${mainCategory}%`)
                .not('id', 'eq', item.course_id);
                
              if (!altError && altCourses && altCourses.length > 0) {
                // console.log('✅ Cursos alternativos encontrados:', 
                //   altCourses.map(c => `${c.title} (${c.category})`).join(', '));
                
                const altItems = altCourses.map(course => ({
                  course_id: course.id,
                  price: 0,
                  is_part_of_pack: true
                }));
                
                processedItems = [...processedItems, ...altItems];
                
                // console.log(`📋 Lista actualizada con búsqueda alternativa (${processedItems.length}):`, 
                //   JSON.stringify(processedItems, null, 2));
              } else {
                console.warn('⚠️ No se encontraron cursos ni con la búsqueda alternativa');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al procesar item de pack:', error);
    }
  }
  
  // console.log('📋 Items finales a insertar:', JSON.stringify(processedItems, null, 2));
  
  // Crear los items de orden
  const orderItems = processedItems.map(item => ({
    order_id: orderId,
    course_id: item.course_id,
    price: item.price,
    is_part_of_pack: item.is_part_of_pack || false
  }));
  
  // console.log(`📝 Insertando ${orderItems.length} items en la tabla order_items:`);
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select();
  
  if (error) {
    console.error('❌ Error al crear items de orden:', error);
    throw error;
  }
  
  // console.log(`✅ ${data.length} items insertados correctamente:`, 
  //   JSON.stringify(data, null, 2));
  
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
    // Solo mostrar error si realmente hay un mensaje de error
    if (Object.keys(error).length > 0) {
    console.error('Error al agregar historial de transacción:', error);
    }
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

// Modificar la función getCourseExcelFile para manejar packs completos
export async function getCourseExcelFile(
  courseId: string,
  category?: string,
  phase: string = "Fase 1"
): Promise<{ 
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
  isPackComplete?: boolean;
  packFiles?: Array<{
    data: Buffer | null;
    filename: string | null;
    contentType: string | null;
  }>;
}> {
  try {
    // Obtener información del curso
    const { data: course } = await supabase
      .from('courses')
      .select('title, category, description')
      .eq('id', courseId)
      .single();
    
    if (!course) {
      return { data: null, filename: null, contentType: null };
    }

    // Verificar si el curso es para mujeres
    const isForWomen = 
      course.category?.toLowerCase().includes('mujer') || 
      course.title?.toLowerCase().includes('mujer') ||
      course.description?.toLowerCase().includes('mujer');

    // console.log(`Curso ${courseId} - ${course.title} - ¿Es para mujeres?: ${isForWomen ? 'SÍ' : 'NO'}`);

    // Verificar si es un pack completo
    const isPackComplete = course.title.toLowerCase().includes('pack completo') ||
                           course.category?.toLowerCase().includes('pack-completo');

    if (isPackComplete) {
      // Formatear la categoría base (sin el prefijo pack-completo)
      let baseCategory = course.category
        .toLowerCase()
        .replace('pack-completo-', '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Si es para mujeres, asegurarse de que la categoría incluya "mujeres"
      if (isForWomen && !baseCategory.includes('mujeres') && !baseCategory.includes('mujer')) {
        // Intentar primero con 'mujer' (singular) basado en la estructura de directorios observada
        baseCategory = `${baseCategory}-mujer`;
        // console.log(`Cambiando a formato singular para pack completo: ${baseCategory}`);
      } else if (!isForWomen && (baseCategory.includes('mujeres') || baseCategory.includes('mujer'))) {
        // Si no es para mujeres pero la categoría contiene "mujeres" o "mujer", quitarlo
        baseCategory = baseCategory.replace('-mujeres', '').replace('-mujer', '');
      }

      // console.log(`Categoría base para búsqueda: ${baseCategory}`);

      // Obtener todos los archivos del pack
      const packFiles = await getPackCompleteFiles(baseCategory);

      return {
        data: null,
        filename: null,
        contentType: null,
        isPackComplete: true,
        packFiles
      };
    }

    // Si no es un pack completo, continuar con la lógica existente
    // Formatear la categoría para la estructura de carpetas
    let categoryFolder = course.category
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Si es para mujeres, asegurarse de que la categoría incluya "mujeres"
    if (isForWomen && !categoryFolder.includes('mujeres') && !categoryFolder.includes('mujer')) {
      // Intentar primero con 'mujer' (singular) basado en la estructura de directorios observada
      categoryFolder = `${categoryFolder}-mujer`;
      // console.log(`Cambiando a formato singular para carpeta: ${categoryFolder}`);
    } else if (!isForWomen && (categoryFolder.includes('mujeres') || categoryFolder.includes('mujer'))) {
      // Si no es para mujeres pero la categoría contiene "mujeres" o "mujer", quitarlo
      categoryFolder = categoryFolder.replace('-mujeres', '').replace('-mujer', '');
    }
    
    // console.log(`Carpeta de categoría para búsqueda: ${categoryFolder}`);

    // Extraer el número de fase del título del curso
    const phaseMatch = course.title.match(/fase\s+(\w+):|fase\s+(\w+)|fase-(\w+)|fase(\w+)/i);
    let phaseIdentifier = "";
    
    if (phaseMatch) {
      // Si el título contiene "Fase X", usar ese número/identificador
      phaseIdentifier = (phaseMatch[1] || phaseMatch[2] || phaseMatch[3] || phaseMatch[4]).toLowerCase();
    } else if (course.title.toLowerCase().includes('pack') || course.title.toLowerCase().includes('completo')) {
      // Si es un pack completo, usar "completo"
      phaseIdentifier = "completo";
    } else {
      // Si no se puede determinar, usar un valor predeterminado
      phaseIdentifier = "i";
    }
    
    // Posibles nombres de carpetas de fase basados en el identificador de fase
    const possiblePhaseFolders = [
      `fase-${phaseIdentifier}-iniciacion`,
      `fase-${phaseIdentifier}-progresion`,
      `fase-${phaseIdentifier}-maestria`,
      `fase-${phaseIdentifier}`,
      `pack-completo-${categoryFolder}`,
      `pack-completo`,
    ];
    
    // Primero listar las carpetas en la categoría
    const { data: subfolders, error: subfoldersError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(categoryFolder);
    
    if (subfoldersError || !subfolders || subfolders.length === 0) {
      // Si no encontramos la carpeta y es una categoría para mujeres, intentar con la versión alternativa
      if (isForWomen) {
        // Probar con la versión en plural si estábamos buscando con singular
        if (categoryFolder.includes('-mujer')) {
          const alternateFolder = categoryFolder.replace('-mujer', '-mujeres');
          // console.log(`No se encontró carpeta ${categoryFolder}, intentando con ${alternateFolder}`);
          
          const { data: altSubfolders, error: altError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .list(alternateFolder);
            
          if (!altError && altSubfolders && altSubfolders.length > 0) {
            // console.log(`✅ Carpeta alternativa encontrada: ${alternateFolder}`);
            categoryFolder = alternateFolder;
            return await getCourseExcelFile(courseId, alternateFolder, phase);
          }
        } 
        // Probar con la versión en singular si estábamos buscando con plural
        else if (categoryFolder.includes('-mujeres')) {
          const alternateFolder = categoryFolder.replace('-mujeres', '-mujer');
          // console.log(`No se encontró carpeta ${categoryFolder}, intentando con ${alternateFolder}`);
          
          const { data: altSubfolders, error: altError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .list(alternateFolder);
            
          if (!altError && altSubfolders && altSubfolders.length > 0) {
            // console.log(`✅ Carpeta alternativa encontrada: ${alternateFolder}`);
            categoryFolder = alternateFolder;
            return await getCourseExcelFile(courseId, alternateFolder, phase);
          }
        }
      }
      
      // Si aún no encontramos nada, intentar con estructura antigua
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    // Buscar la carpeta de fase que mejor coincida
    let matchedPhaseFolder = null;
    
    // Primero buscar coincidencias exactas con nuestras posibles carpetas
    for (const folderName of possiblePhaseFolders) {
      const match = subfolders.find(f => f.name.toLowerCase() === folderName);
      if (match) {
        matchedPhaseFolder = match.name;
        break;
      }
    }
    
    // Si no hay coincidencia exacta, buscar parcial
    if (!matchedPhaseFolder) {
      for (const subfolder of subfolders) {
        const lowerName = subfolder.name.toLowerCase();
        // Buscar si contiene el identificador de fase y/o keywords como "iniciacion", "progresion", etc.
        if (lowerName.includes(`fase-${phaseIdentifier}`) || 
            (phaseIdentifier === "completo" && lowerName.includes("pack-completo")) ||
            (phaseIdentifier === "i" && lowerName.includes("iniciacion")) ||
            (phaseIdentifier === "ii" && lowerName.includes("progresion")) ||
            (phaseIdentifier === "iii" && lowerName.includes("maestria"))) {
          matchedPhaseFolder = subfolder.name;
          break;
        }
      }
    }
    
    // Si aún no encontramos coincidencia, usar la primera subcarpeta que tenga "fase"
    if (!matchedPhaseFolder) {
      const anyPhaseFolder = subfolders.find(f => f.name.toLowerCase().includes('fase'));
      if (anyPhaseFolder) {
        matchedPhaseFolder = anyPhaseFolder.name;
      } else if (subfolders.length > 0) {
        // Si no hay carpetas con "fase", usar la primera carpeta disponible
        matchedPhaseFolder = subfolders[0].name;
      }
    }
    
    if (!matchedPhaseFolder) {
      // Intentar con estructura antigua si falla
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    // Ahora buscar archivos Excel en la carpeta de fase
    const folderPath = `${categoryFolder}/${matchedPhaseFolder}`;
    
    const { data: files, error: filesError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(folderPath);
    
    if (filesError || !files || files.length === 0) {
      // Intentar con estructura antigua si falla
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    // Filtrar archivos Excel
    const excelFiles = files.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (excelFiles.length === 0) {
      // Intentar con estructura antigua si falla
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    // Ordenar los archivos para asegurar que las fases estén en orden (I, II, III)
    // Esto ayuda cuando necesitamos identificar archivos por posición numérica
    const orderedExcelFiles = [...excelFiles].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      // Detectar números romanos o arábigos en los nombres
      const getRomanOrNumber = (name: string) => {
        if (name.includes('fase i') || name.includes('fase 1') || name.includes('fase-i') || name.includes('fase-1')) 
          return 1;
        if (name.includes('fase ii') || name.includes('fase 2') || name.includes('fase-ii') || name.includes('fase-2')) 
          return 2;
        if (name.includes('fase iii') || name.includes('fase 3') || name.includes('fase-iii') || name.includes('fase-3')) 
          return 3;
        return 999; // Valor alto para archivos sin número identificable
      };
      
      const numA = getRomanOrNumber(nameA);
      const numB = getRomanOrNumber(nameB);
      
      return numA - numB;
    });
    
    // console.log(`Archivos ordenados por fase: ${orderedExcelFiles.map(f => f.name).join(', ')}`);
    
    // Elegir el archivo más relevante, priorizando:
    // 1. Coincidencia exacta con la fase
    // 2. Archivo que contenga "Fase" + número/romano
    // 3. Primer archivo Excel disponible
    let targetExcelFile = null;
    
    // Mostremos todos los archivos disponibles para depuración
    // console.log(`Archivos disponibles en ${folderPath}:`, excelFiles.map(f => f.name));
    
    // Si estamos buscando específicamente Fase I (iniciación o preparación), asegurar correspondencia exacta
    if (phaseIdentifier.toLowerCase() === 'i') {
      // console.log(`Buscando específicamente archivo para Fase I (${courseId})`);
      
      // Si el nombre de la carpeta de fase contiene "fase-ii" pero estamos buscando fase I, 
      // esto indica que estamos en la carpeta incorrecta
      if (matchedPhaseFolder.toLowerCase().includes('fase-ii') || 
          matchedPhaseFolder.toLowerCase().includes('fase ii') ||
          matchedPhaseFolder.toLowerCase().includes('fase 2') ||
          matchedPhaseFolder.toLowerCase().includes('fase-2')) {
        
        // console.log(`⚠️ Advertencia: Estamos buscando Fase I pero estamos en carpeta de Fase II (${matchedPhaseFolder})`);
        // console.log(`⚠️ Intentando encontrar la carpeta correcta para Fase I...`);
        
        // Buscar una carpeta que sea explícitamente para Fase I
        const phaseIFolder = subfolders.find(f => {
          const name = f.name.toLowerCase();
          const isFaseIFolder = name.includes('fase-i') || 
                               name.includes('fase i') || 
                               name.includes('fase-1') || 
                               name.includes('fase 1') ||
                               name.includes('iniciacion') ||
                               name.includes('preparacion');
                               
          const isNotFaseII = !name.includes('fase-ii') && 
                             !name.includes('fase ii') && 
                             !name.includes('fase-2') && 
                             !name.includes('fase 2');
          
          return isFaseIFolder && isNotFaseII;
        });
        
        if (phaseIFolder) {
          // console.log(`✅ Encontrada carpeta específica para Fase I: ${phaseIFolder.name}`);
          
          // Usar esta carpeta en su lugar
          const newMatchedPhaseFolder = phaseIFolder.name;
          
          // Actualizar la ruta de la carpeta y volver a obtener archivos
          const newFolderPath = `${categoryFolder}/${newMatchedPhaseFolder}`;
          
          // console.log(`🔄 Cambiando a carpeta: ${newFolderPath}`);
          
          const { data: newFiles, error: newFilesError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .list(newFolderPath);
          
          if (!newFilesError && newFiles && newFiles.length > 0) {
            // Crear nuevas listas de archivos
            const newExcelFiles = newFiles.filter(f => 
              f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
            );
            
            // console.log(`📋 Nuevos archivos Excel encontrados: ${newExcelFiles.map(f => f.name).join(', ')}`);
            
            // Si encontramos archivos Excel, actualizar todo para usar esta nueva carpeta
            if (newExcelFiles.length > 0) {
              // Ordenar los nuevos archivos
              const newOrderedExcelFiles = [...newExcelFiles].sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                
                // Detectar números romanos o arábigos en los nombres
                const getRomanOrNumber = (name: string) => {
                  if (name.includes('fase i') || name.includes('fase 1') || name.includes('fase-i') || name.includes('fase-1')) 
                    return 1;
                  if (name.includes('fase ii') || name.includes('fase 2') || name.includes('fase-ii') || name.includes('fase-2')) 
                    return 2;
                  if (name.includes('fase iii') || name.includes('fase 3') || name.includes('fase-iii') || name.includes('fase-3')) 
                    return 3;
                  return 999;
                };
                
                const numA = getRomanOrNumber(nameA);
                const numB = getRomanOrNumber(nameB);
                
                return numA - numB;
              });
              
              // Buscar archivo de fase I en esta nueva carpeta
              const newPhaseOneFile = newOrderedExcelFiles.find(f => {
                const lowerName = f.name.toLowerCase();
                // Verificar que contenga fase i o fase 1
                const containsFaseI = lowerName.includes('fase i') || 
                                      lowerName.includes('fase-i') || 
                                      lowerName.includes('fase 1') || 
                                      lowerName.includes('fase-1') ||
                                      lowerName.includes('iniciacion') ||
                                      lowerName.includes('preparacion');
                                      
                // Verificar que NO contenga fase ii o fase iii
                const containsFaseIIorIII = lowerName.includes('fase ii') || 
                                           lowerName.includes('fase-ii') || 
                                           lowerName.includes('fase 2') || 
                                           lowerName.includes('fase-2') ||
                                           lowerName.includes('fase iii') || 
                                           lowerName.includes('fase-iii') || 
                                           lowerName.includes('fase 3') || 
                                           lowerName.includes('fase-3');
                
                return containsFaseI && !containsFaseIIorIII;
              });
              
              if (newPhaseOneFile) {
                // console.log(`✅ Encontrado archivo específico para Fase I en nueva carpeta: ${newPhaseOneFile.name}`);
                
                // Descargar el archivo
                const newFilePath = `${newFolderPath}/${newPhaseOneFile.name}`;
                
                const { data: newFileData, error: newFileError } = await supabase
                  .storage
                  .from(BUCKET_COURSE_EXCEL)
                  .download(newFilePath);
                
                if (!newFileError && newFileData) {
                  // Convertir a Buffer
                  const buffer = await newFileData.arrayBuffer().then(ab => Buffer.from(ab));
                  
                  // Determinar tipo de contenido
                  const contentType = newPhaseOneFile.name.endsWith('.xlsx') 
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'application/vnd.ms-excel';
                  
                  // Retornar directamente
                  return {
                    data: buffer,
                    filename: newPhaseOneFile.name,
                    contentType
                  };
                }
              }
            }
          }
        } else {
          // Si no encontramos una carpeta específica para Fase I, intentar búsqueda avanzada
          // console.log(`⚠️ Iniciando búsqueda avanzada para Fase I de ${categoryFolder}...`);
          
          const advancedSearchResult = await findFaseIFileAnywhere(categoryFolder, isForWomen);
          
          if (advancedSearchResult && advancedSearchResult.data) {
            // console.log(`✅ Búsqueda avanzada exitosa: encontrado archivo ${advancedSearchResult.filename}`);
            return advancedSearchResult;
          }
          
          // Si la búsqueda avanzada falla, intentar la búsqueda en raíz como último recurso
          // console.log(`⚠️ No se encontró carpeta específica para Fase I, buscando en raíz: ${categoryFolder}`);
          
          const { data: rootFiles, error: rootError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .list(categoryFolder);
            
          if (!rootError && rootFiles && rootFiles.length > 0) {
            // Filtrar archivos Excel en la raíz
            const rootExcelFiles = rootFiles.filter(f => 
              f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
            );
            
            if (rootExcelFiles.length > 0) {
              // console.log(`📋 Archivos Excel encontrados en raíz: ${rootExcelFiles.map(f => f.name).join(', ')}`);
              
              // Buscar archivo de fase I en la raíz
              const faseIFile = rootExcelFiles.find(f => {
                const lowerName = f.name.toLowerCase();
                return (lowerName.includes('fase i') || 
                        lowerName.includes('fase-i') || 
                        lowerName.includes('fase 1') || 
                        lowerName.includes('fase-1') ||
                        lowerName.includes('iniciacion') ||
                        lowerName.includes('preparacion')) &&
                       !(lowerName.includes('fase ii') || 
                         lowerName.includes('fase-ii') || 
                         lowerName.includes('fase 2') || 
                         lowerName.includes('fase-2'));
              });
              
              if (faseIFile) {
                // console.log(`✅ Encontrado archivo de Fase I en raíz: ${faseIFile.name}`);
                
                // Descargar archivo
                const rootFilePath = `${categoryFolder}/${faseIFile.name}`;
                
                const { data: rootFileData, error: rootFileError } = await supabase
                  .storage
                  .from(BUCKET_COURSE_EXCEL)
                  .download(rootFilePath);
                  
                if (!rootFileError && rootFileData) {
                  // Convertir a Buffer
                  const buffer = await rootFileData.arrayBuffer().then(ab => Buffer.from(ab));
                  
                  // Determinar tipo de contenido
                  const contentType = faseIFile.name.endsWith('.xlsx') 
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'application/vnd.ms-excel';
                  
                  // Devolver este archivo directamente
                  return {
                    data: buffer,
                    filename: faseIFile.name,
                    contentType
                  };
                }
              }
            }
          }
        }
      }
      
      // Buscar archivo que contenga exactamente "fase i" o "fase 1" en el nombre (no fase ii ni fase iii)
      const phaseOneFile = orderedExcelFiles.find(f => {
        const lowerName = f.name.toLowerCase();
        // Verificar que contenga fase i o fase 1
        const containsFaseI = lowerName.includes('fase i') || 
                              lowerName.includes('fase-i') || 
                              lowerName.includes('fase 1') || 
                              lowerName.includes('fase-1') ||
                              lowerName.includes('iniciacion') ||
                              lowerName.includes('preparacion');
                              
        // Verificar que NO contenga fase ii o fase iii (para evitar falsos positivos)
        const containsFaseIIorIII = lowerName.includes('fase ii') || 
                                    lowerName.includes('fase-ii') || 
                                    lowerName.includes('fase 2') || 
                                    lowerName.includes('fase-2') ||
                                    lowerName.includes('fase iii') || 
                                    lowerName.includes('fase-iii') || 
                                    lowerName.includes('fase 3') || 
                                    lowerName.includes('fase-3');
        
        return containsFaseI && !containsFaseIIorIII;
      });
      
      if (phaseOneFile) {
        // console.log(`✅ Encontrado archivo específico Fase I: ${phaseOneFile.name}`);
        targetExcelFile = phaseOneFile;
      } else if (orderedExcelFiles.length >= 3) {
        // Si tenemos al menos 3 archivos y están ordenados por fase, usar el primero
        // console.log(`⚠️ No se encontró archivo específico para Fase I por nombre. Intentando por posición numérica.`);
        
        // Verificar si los archivos tienen nombres que sugieren un orden específico de fases
        const hasPhaseNames = orderedExcelFiles.some(f => 
          f.name.toLowerCase().includes('fase') || 
          f.name.toLowerCase().includes('preparacion') || 
          f.name.toLowerCase().includes('iniciacion')
        );
        
        if (hasPhaseNames) {
          // console.log(`✅ Usando el primer archivo del conjunto ordenado: ${orderedExcelFiles[0].name}`);
          targetExcelFile = orderedExcelFiles[0];
        }
      } else {
        // Si todo lo anterior falla, intentar búsqueda avanzada
        // console.log(`⚠️ No se encuentra archivo de Fase I en carpeta actual. Iniciando búsqueda avanzada...`);
        
        const advancedSearchResult = await findFaseIFileAnywhere(categoryFolder, isForWomen);
        
        if (advancedSearchResult && advancedSearchResult.data) {
          // console.log(`✅ Búsqueda avanzada exitosa: encontrado archivo ${advancedSearchResult.filename}`);
          return advancedSearchResult;
        }
      }
    }
    
    // Si no encontramos un archivo específico para Fase I, seguir con la lógica original
    if (!targetExcelFile) {
      const exactMatchFile = orderedExcelFiles.find(f => 
        f.name.toLowerCase() === `fase ${phaseIdentifier}.xlsx` || 
        f.name.toLowerCase() === `fase-${phaseIdentifier}.xlsx` ||
        f.name.toLowerCase() === `fase${phaseIdentifier}.xlsx` ||
        f.name.toLowerCase() === `fase ${phaseIdentifier.toUpperCase()}.xlsx` ||
        f.name.toLowerCase() === `fase-${phaseIdentifier.toUpperCase()}.xlsx` ||
        f.name.toLowerCase() === `fase${phaseIdentifier.toUpperCase()}.xlsx`
      );
      
      if (exactMatchFile) {
        // console.log(`✅ Encontrado archivo por coincidencia exacta: ${exactMatchFile.name}`);
        targetExcelFile = exactMatchFile;
      } else {
        // Buscar cualquier archivo con "Fase" + identificador
        const phaseFile = orderedExcelFiles.find(f => 
          f.name.toLowerCase().includes(`fase ${phaseIdentifier}`) || 
          f.name.toLowerCase().includes(`fase-${phaseIdentifier}`) ||
          f.name.toLowerCase().includes(`fase${phaseIdentifier}`) ||
          f.name.toLowerCase().includes(`fase ${phaseIdentifier.toUpperCase()}`) ||
          f.name.toLowerCase().includes(`fase-${phaseIdentifier.toUpperCase()}`) ||
          f.name.toLowerCase().includes(`fase${phaseIdentifier.toUpperCase()}`)
        );
        
        if (phaseFile) {
          // console.log(`✅ Encontrado archivo por coincidencia parcial: ${phaseFile.name}`);
          targetExcelFile = phaseFile;
        } else {
          // Usar el primer archivo Excel
          // console.log(`⚠️ No se encontró coincidencia específica, usando primer archivo: ${orderedExcelFiles[0].name}`);
          targetExcelFile = orderedExcelFiles[0];
        }
      }
    }
    
    // Descargar el archivo seleccionado
    const filePath = `${folderPath}/${targetExcelFile.name}`;
    
    // console.log(`🔽 Descargando archivo: ${filePath}`);
    
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .download(filePath);
    
    if (downloadError) {
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    if (!fileData) {
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    // Convertir el archivo a Buffer
    const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
    
    // Determinar el tipo de contenido basado en la extensión
    const contentType = targetExcelFile.name.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';
    
    return {
      data: buffer,
      filename: targetExcelFile.name,
      contentType
    };
  } catch (error) {
    // Intentar con la función original como fallback
    try {
      return await originalGetCourseExcelFile(courseId, category, phase);
    } catch (fallbackError) {
      return { data: null, filename: null, contentType: null };
    }
  }
}

// Guardar la función original para usarla como fallback
async function originalGetCourseExcelFile(
  courseId: string,
  category?: string,
  phase: string = "Fase 1"
): Promise<{ data: Buffer | null, filename: string | null, contentType: string | null }> {
  try {
    // Obtener el nombre y categoría formateados del curso
    const courseInfo = await getCourseNameAndCategory(courseId);
    
    if (!courseInfo) {
      return { data: null, filename: null, contentType: null };
    }
    
    // Si se especifica una categoría, usarla; de lo contrario, usar la del curso
    const categoryToUse = category || courseInfo.category;
    
    // Estructura nueva: "fase 1" es el directorio principal (nombre actualizado)
    const FASE_PRINCIPAL = "fase 1";
    
    // Primero intentar encontrar el archivo directamente en fase 1
    const directResult = await getCourseExcelFileFromPath(`${FASE_PRINCIPAL}`, phase);
    if (directResult.data) {
      return directResult;
    }
    
    // Luego, buscar dentro de la categoría en fase 1
    const result = await getCourseExcelFileFromPath(`${FASE_PRINCIPAL}/${categoryToUse}`, phase);
    
    if (result.data) {
      return result;
    }
    
    // Si no, buscar en la subcarpeta con el nombre del curso dentro de la categoría
    const courseResult = await getCourseExcelFileFromPath(`${FASE_PRINCIPAL}/${categoryToUse}/${courseInfo.name}`, phase);
    
    if (courseResult.data) {
      return courseResult;
    }
    
    // Finalmente, intentar buscar directamente dentro de la subcarpeta "fase" correspondiente
    return await getCourseExcelFileFromPath(`${FASE_PRINCIPAL}/${phase.toLowerCase()}`, "");
  } catch (error) {
    console.error(`Error al obtener archivo Excel para curso ${courseId}:`, error);
    throw error;
  }
}

// Nueva función auxiliar para obtener un archivo Excel desde una ruta específica
async function getCourseExcelFileFromPath(
  coursePath: string,  // Ruta en formato "fase 1/categoria" o "fase 1/categoria/curso"
  phase: string = "Fase 1"
): Promise<{ data: Buffer | null, filename: string | null, contentType: string | null }> {
  try {
    // console.log(`🔍 Buscando en la ruta: ${coursePath}, fase: ${phase}`);
    
    // Listar contenido de la carpeta
    const { data: files, error } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(coursePath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error(`❌ Error al listar archivos en ruta ${coursePath}:`, error);
      throw error;
    }
    
    if (!files || files.length === 0) {
      console.warn(`⚠️ No se encontraron archivos en la ruta: ${coursePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // console.log(`📋 Archivos encontrados (${files.length}):`, files.map(f => f.name));
    
    let excelFile = null;
    
    // Estrategia de búsqueda:
    if (phase) {
      // Verificar si estamos buscando específicamente la fase 1/I
      const isFaseOne = phase.toLowerCase() === "fase 1" || 
                        phase.toLowerCase() === "fase i";
                        
      if (isFaseOne) {
        // console.log(`🎯 Buscando específicamente Fase 1/I`);
        // Buscar archivos que contengan 'fase 1' o 'fase i' explícitamente
        const faseOneFiles = files.filter(file => {
          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const filename = file.name.toLowerCase();
            
            // Verificar que contenga fase i o fase 1
            const containsFaseI = filename.includes('fase 1') || 
                                  filename.includes('fase-1') || 
                                  filename.includes('fase1') || 
                                  filename.includes('fase i') || 
                                  filename.includes('fase-i') ||
                                  filename.includes('fasei') ||
                                  filename.includes('iniciacion') ||
                                  filename.includes('preparacion');
                                  
            // Verificar que NO contenga fase ii, fase 2, fase iii, o fase 3
            const containsFaseIIorIII = filename.includes('fase 2') || 
                                        filename.includes('fase-2') || 
                                        filename.includes('fase2') ||
                                        filename.includes('fase ii') || 
                                        filename.includes('fase-ii') ||
                                        filename.includes('faseii') ||
                                        filename.includes('fase 3') || 
                                        filename.includes('fase-3') || 
                                        filename.includes('fase3') ||
                                        filename.includes('fase iii') || 
                                        filename.includes('fase-iii') ||
                                        filename.includes('faseiii');
            
            return containsFaseI && !containsFaseIIorIII;
          }
          return false;
        });
        
        if (faseOneFiles.length > 0) {
          // console.log(`✅ Encontrados ${faseOneFiles.length} archivos de Fase 1:`, faseOneFiles.map(f => f.name));
          // Usar el primer archivo que coincida con Fase 1
          excelFile = faseOneFiles[0];
        }
      }
    }
      
    // Si no encontramos un archivo específico para Fase 1, seguir con la lógica original
    if (!excelFile && phase) {
      // 1. Si tenemos una fase específica, primero buscamos un archivo con ese nombre exacto
      const exactPhaseMatch = files.find(file => 
        file.name === `${phase}.xlsx` || 
        file.name === `${phase}.xls`
      );
      
      if (exactPhaseMatch) {
        // console.log(`✅ Coincidencia exacta encontrada: ${exactPhaseMatch.name}`);
        excelFile = exactPhaseMatch;
      } else {
        // 2. Buscar coincidencia insensible a mayúsculas/minúsculas
        const caseInsensitiveMatch = files.find(file => 
          file.name.toLowerCase() === `${phase.toLowerCase()}.xlsx` || 
          file.name.toLowerCase() === `${phase.toLowerCase()}.xls`
        );
        
        if (caseInsensitiveMatch) {
          // console.log(`✅ Coincidencia insensible a mayúsculas encontrada: ${caseInsensitiveMatch.name}`);
          excelFile = caseInsensitiveMatch;
        }
      }
    }
    
    // 3. Si no encontramos por fase o no se especificó, buscamos cualquier archivo Excel
    if (!excelFile) {
      const anyExcelFile = files.find(file => 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls')
      );
      
      if (anyExcelFile) {
        // console.log(`⚠️ Usando primer archivo Excel disponible: ${anyExcelFile.name}`);
        excelFile = anyExcelFile;
      }
    }
    
    // 4. Si aún no encontramos, buscamos una carpeta que coincida con la fase
    if (!excelFile && phase) {
      const phaseFolder = files.find(item => 
        (item.metadata?.mimetype === null || item.metadata === null) && // Es una carpeta
        (item.name === phase || item.name.toLowerCase() === phase.toLowerCase())
      );
      
      if (phaseFolder) {
        // console.log(`🔍 Encontrada carpeta de fase, explorando dentro: ${coursePath}/${phaseFolder.name}`);
        // Si encontramos una carpeta de fase, buscamos dentro de ella
        return getCourseExcelFileFromPath(`${coursePath}/${phaseFolder.name}`, "");
      }
    }
    
    if (!excelFile) {
      console.warn(`❌ No se encontró ningún archivo Excel en ${coursePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // Obtener URL pública para descargar el archivo
    const filePath = `${coursePath}/${excelFile.name}`;
    // console.log(`🔽 Descargando archivo: ${filePath}`);
    
    // Descargar el archivo
    const { data, error: downloadError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .download(filePath);
    
    if (downloadError) {
      console.error(`❌ Error al descargar archivo ${filePath}:`, downloadError);
      throw downloadError;
    }
    
    if (!data) {
      console.warn(`⚠️ No se obtuvo datos del archivo ${filePath}`);
      return { data: null, filename: null, contentType: null };
    }
    
    // Determinar el tipo de contenido basado en la extensión del archivo
    const contentType = excelFile.name.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';
    
    // Convertir el archivo a Buffer
    const buffer = await data.arrayBuffer().then(arrayBuffer => Buffer.from(arrayBuffer));
    
    // console.log(`✅ Archivo descargado exitosamente: ${excelFile.name}`);
    
    return { 
      data: buffer, 
      filename: excelFile.name,
      contentType
    };
  } catch (error) {
    console.error(`❌ Error en getCourseExcelFileFromPath para ${coursePath}:`, error);
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
        throw coursesError;
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
          throw filesError;
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

async function getPackCompleteFiles(categoryFolder: string): Promise<Array<{
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
}>> {
  const files = [];
  // Estructuras de carpetas posibles para las fases
  const phases = ['fase-i-iniciacion', 'fase-ii-progresion', 'fase-iii-maestria'];
  // Estructuras alternativas para nombres de fases
  const alternativePhases = ['fase-1', 'fase-2', 'fase-3', 'fase-i', 'fase-ii', 'fase-iii', 'fase i', 'fase ii', 'fase iii'];
  const isForWomen = categoryFolder.includes('mujer');

  // console.log(`🔍 Buscando archivos para pack completo en categoría: ${categoryFolder} - ¿Es para mujeres?: ${isForWomen ? 'SÍ' : 'NO'}`);

  // 1. PRIMERA ESTRATEGIA: Buscar en carpeta pack-completo específica
  // console.log(`🔍 Estrategia 1: Buscando en carpeta pack-completo-${categoryFolder}`);
  const packFolder = `${categoryFolder}/pack-completo-${categoryFolder}`;
  
  let packFiles = [];
  try {
    const { data: filesInPackFolder, error } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(packFolder);

    if (!error && filesInPackFolder && filesInPackFolder.length > 0) {
      // console.log(`✅ Encontrada carpeta pack-completo: ${packFolder} con ${filesInPackFolder.length} archivos`);
      
      // Filtrar solo archivos Excel
      const excelFiles = filesInPackFolder.filter(f => 
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );
      
      if (excelFiles.length > 0) {
        // console.log(`✅ Encontrados ${excelFiles.length} archivos Excel en ${packFolder}:`, 
        //             excelFiles.map(f => f.name).join(', '));
                    
        // Ordenar archivos por fase
        const sortedFiles = [...excelFiles].sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          
          // Detectar números romanos o arábigos en los nombres
          const getRomanOrNumber = (name: string) => {
            if (name.includes('fase i') || name.includes('fase 1') || name.includes('fase-i') || name.includes('fase-1')) 
              return 1;
            if (name.includes('fase ii') || name.includes('fase 2') || name.includes('fase-ii') || name.includes('fase-2')) 
              return 2;
            if (name.includes('fase iii') || name.includes('fase 3') || name.includes('fase-iii') || name.includes('fase-3')) 
              return 3;
            return 999;
          };
          
          const numA = getRomanOrNumber(nameA);
          const numB = getRomanOrNumber(nameB);
          
          return numA - numB;
        });
        
        // console.log(`🔄 Archivos ordenados por fase:`, sortedFiles.map(f => f.name).join(', '));
        
        for (const excelFile of sortedFiles) {
          try {
            // Descargar el archivo
            const filePath = `${packFolder}/${excelFile.name}`;
            // console.log(`🔽 Descargando: ${filePath}`);
            
            const { data: fileData, error: downloadError } = await supabase
              .storage
              .from(BUCKET_COURSE_EXCEL)
              .download(filePath);

            if (!downloadError && fileData) {
              // Convertir a Buffer
              const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
              const contentType = excelFile.name.endsWith('.xlsx')
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/vnd.ms-excel';

              packFiles.push({
                data: buffer,
                filename: excelFile.name,
                contentType
              });
              
              // console.log(`✅ Archivo ${excelFile.name} descargado exitosamente`);
            } else {
              console.warn(`⚠️ Error al descargar ${excelFile.name}:`, downloadError);
            }
          } catch (error) {
            console.error(`❌ Error procesando archivo ${excelFile.name}:`, error);
          }
        }
      }
    } else {
      // console.log(`⚠️ No se encontró la carpeta ${packFolder} o está vacía`);
    }
  } catch (error) {
    console.error(`❌ Error listando archivos en ${packFolder}:`, error);
  }
  
  // Si encontramos archivos en la carpeta pack-completo, usarlos
  if (packFiles.length > 0) {
    // console.log(`✅ Estrategia 1 exitosa: Se encontraron ${packFiles.length} archivos en carpeta pack-completo`);
    return packFiles;
  }

  // 2. SEGUNDA ESTRATEGIA: Intentar con la estructura original de carpetas de fase
  // console.log(`🔍 Estrategia 2: Buscando en carpetas de fase estándar`);
  let foundFiles = await searchPackFilesInCategory(categoryFolder, phases);
  
  // Si encontramos archivos, devolverlos
  if (foundFiles.length > 0) {
    // console.log(`✅ Estrategia 2 exitosa: Se encontraron ${foundFiles.length} archivos en carpetas de fase estándar`);
    return foundFiles;
  }

  // 3. TERCERA ESTRATEGIA: Si no se encontraron archivos, intentar con nombres alternativos de fase
  // console.log(`🔍 Estrategia 3: Buscando con nombres alternativos de fase`);
  foundFiles = await searchPackFilesInCategory(categoryFolder, alternativePhases);
  
  // Si encontramos archivos, devolverlos
  if (foundFiles.length > 0) {
    // console.log(`✅ Estrategia 3 exitosa: Se encontraron ${foundFiles.length} archivos con nombres alternativos de fase`);
    return foundFiles;
  }

  // 4. CUARTA ESTRATEGIA: Para mujeres, probar variaciones adicionales
  if (isForWomen) {
    // console.log(`🔍 Estrategia 4: Buscando variaciones para mujeres`);
    // Si no se encontraron archivos y es para mujeres, intentar también sin el sufijo "mujer"
    const baseCategoryFolder = categoryFolder.replace('-mujer', '');
    
    // Primero intentar con "-mujer"
    // console.log(`🔍 Intentando con: ${baseCategoryFolder}-mujer`);
    foundFiles = await searchPackFilesInCategory(`${baseCategoryFolder}-mujer`, phases);
    
    // Si aún no encontramos, intentar con "-mujeres" (plural)
    if (foundFiles.length === 0) {
      // console.log(`🔍 Intentando con: ${baseCategoryFolder}-mujeres`);
      foundFiles = await searchPackFilesInCategory(`${baseCategoryFolder}-mujeres`, phases);
    }
    
    // Si aún no encontramos, intentar carpetas alternativas
    if (foundFiles.length === 0) {
      // console.log('🔍 Intentando con carpetas alternativas para mujeres');
      // Intentar con variaciones comunes para mujeres
      const alternativeCategories = [
        'mujer',
        'mujeres',
        'ganancia-muscular-mujer',
        'ganancia-muscular-mujeres',
        'perdida-de-grasa-mujer',
        'perdida-de-grasa-mujeres',
        'fuerza-mujer',
        'fuerza-mujeres'
      ];
      
      for (const altCategory of alternativeCategories) {
        foundFiles = await searchPackFilesInCategory(altCategory, phases);
        if (foundFiles.length > 0) {
          // console.log(`✅ Se encontraron archivos en carpeta alternativa: ${altCategory}`);
          return foundFiles;
        }
      }
    }
    
    // Si encontramos archivos con alguna estrategia para mujeres, devolverlos
    if (foundFiles.length > 0) {
      // console.log(`✅ Estrategia 4 exitosa: Se encontraron ${foundFiles.length} archivos en variaciones para mujeres`);
      return foundFiles;
    }
  }
  
  // 5. QUINTA ESTRATEGIA: Última opción, buscar en la raíz
  // console.log(`🔍 Estrategia 5: Buscando archivos Excel en raíz de ${categoryFolder}`);
  try {
    const { data: rootFiles, error } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(categoryFolder);
      
    if (!error && rootFiles && rootFiles.length > 0) {
      // Filtrar archivos Excel en la raíz
      const excelFiles = rootFiles.filter(f => 
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );
      
      if (excelFiles.length > 0) {
        // console.log(`✅ Encontrados ${excelFiles.length} archivos Excel en raíz de ${categoryFolder}`);
        
        for (const excelFile of excelFiles) {
          // Descargar archivo
          const filePath = `${categoryFolder}/${excelFile.name}`;
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .download(filePath);
            
          if (!downloadError && fileData) {
            const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
            const contentType = excelFile.name.endsWith('.xlsx')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/vnd.ms-excel';
              
            files.push({
              data: buffer,
              filename: excelFile.name,
              contentType
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error buscando en raíz de ${categoryFolder}:`, error);
  }
  
  // console.log(`ℹ️ Resultado final: ${files.length} archivos encontrados para pack completo`);
  return files;
}

// Nueva función auxiliar para buscar archivos en una categoría específica
async function searchPackFilesInCategory(
  categoryFolder: string, 
  phases: string[]
): Promise<Array<{
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
}>> {
  const files = [];
  
  // console.log(`🔍 searchPackFilesInCategory: Buscando en ${categoryFolder} con fases: ${phases.join(', ')}`);
  
  for (const phase of phases) {
    try {
      // Construir la ruta para cada fase
      const phasePath = `${categoryFolder}/${phase}`;
      
      // console.log(`🔍 Examinando: ${phasePath}`);
      
      // Listar archivos en la carpeta de la fase
      const { data: phaseFiles, error: listError } = await supabase
        .storage
        .from(BUCKET_COURSE_EXCEL)
        .list(phasePath);

      if (listError || !phaseFiles || phaseFiles.length === 0) {
        continue;
      }

      // Encontrar el archivo Excel
      const excelFiles = phaseFiles.filter(f => 
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );

      if (excelFiles.length === 0) {
        continue;
      }
      
      // console.log(`✅ Encontrados ${excelFiles.length} archivos Excel en ${phasePath}: ${excelFiles.map(f => f.name).join(', ')}`);

      // Procesamos todos los archivos Excel encontrados en la carpeta
      for (const excelFile of excelFiles) {
        try {
          // Descargar el archivo
          const filePath = `${phasePath}/${excelFile.name}`;
          // console.log(`🔽 Descargando: ${filePath}`);
          
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(BUCKET_COURSE_EXCEL)
            .download(filePath);

          if (downloadError || !fileData) {
            console.warn(`⚠️ Error al descargar archivo de ${phase}:`, downloadError);
            continue;
          }

          // Convertir a Buffer
          const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
          const contentType = excelFile.name.endsWith('.xlsx')
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/vnd.ms-excel';

          files.push({
            data: buffer,
            filename: excelFile.name,
            contentType
          });
          
          // console.log(`✅ Archivo ${excelFile.name} descargado exitosamente`);
        } catch (error) {
          console.error(`❌ Error procesando archivo ${excelFile.name} en ${phase}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando fase ${phase} en ${categoryFolder}:`, error);
    }
  }
  
  // console.log(`ℹ️ searchPackFilesInCategory: Encontrados ${files.length} archivos en ${categoryFolder}`);
  return files;
}

// Nueva función auxiliar para buscar archivos de Fase I en cualquier lugar del sistema de archivos
async function findFaseIFileAnywhere(courseCategory: string, isForWomen: boolean): Promise<{
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
} | null> {
  // console.log(`🔍 Búsqueda avanzada: buscando archivo de Fase I para categoría ${courseCategory}`);
  
  // Posibles carpetas donde podría estar un archivo Fase I
  const possibleCategoryFolders = [];
  
  // Añadir la categoría principal
  possibleCategoryFolders.push(courseCategory);
  
  // Versiones alternativas para mujeres/hombres
  if (isForWomen) {
    if (courseCategory.includes('-mujer')) {
      possibleCategoryFolders.push(courseCategory.replace('-mujer', '-mujeres'));
      possibleCategoryFolders.push(courseCategory.replace('-mujer', ''));
    } 
    else if (courseCategory.includes('-mujeres')) {
      possibleCategoryFolders.push(courseCategory.replace('-mujeres', '-mujer'));
      possibleCategoryFolders.push(courseCategory.replace('-mujeres', ''));
    }
    else {
      possibleCategoryFolders.push(`${courseCategory}-mujer`);
      possibleCategoryFolders.push(`${courseCategory}-mujeres`);
    }
    
    // Otras variaciones comunes
    possibleCategoryFolders.push('perdida-de-grasa-mujer');
    possibleCategoryFolders.push('perdida-de-grasa-mujeres');
    possibleCategoryFolders.push('perdida-de-grasa-corporal-mujer');
    possibleCategoryFolders.push('perdida-de-grasa-corporal-mujeres');
  } else {
    // Para hombres, quitar sufijos de mujer si están presentes
    if (courseCategory.includes('-mujer') || courseCategory.includes('-mujeres')) {
      possibleCategoryFolders.push(
        courseCategory
          .replace('-mujer', '')
          .replace('-mujeres', '')
      );
    }
  }
  
  // Variaciones para ambos
  const baseName = courseCategory
    .replace('-mujer', '')
    .replace('-mujeres', '')
    .replace('-corporal', '');
  
  possibleCategoryFolders.push(baseName);
  
  // Posibles subcarpetas de fase
  const possiblePhaseFolders = [
    'fase-i-iniciacion',
    'fase-i-preparacion',
    'fase-i',
    'fase-1',
    'fase-1-iniciacion',
    'fase-1-preparacion',
    'fase i',
    'fase 1',
    'iniciacion',
    'preparacion'
  ];
  
  // console.log(`🔍 Carpetas de categoría a buscar: ${possibleCategoryFolders.join(', ')}`);
  // console.log(`🔍 Subcarpetas de fase a buscar: ${possiblePhaseFolders.join(', ')}`);
  
  // Buscar en todas las combinaciones
  for (const categoryFolder of possibleCategoryFolders) {
    // 1. Primero buscar directamente en la carpeta de categoría
    try {
      const { data: rootFiles, error: rootError } = await supabase
        .storage
        .from(BUCKET_COURSE_EXCEL)
        .list(categoryFolder);
        
      if (!rootError && rootFiles && rootFiles.length > 0) {
        // Buscar archivos Excel
        const excelFiles = rootFiles.filter(f => 
          f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        
        // Buscar archivo de Fase I
        if (excelFiles.length > 0) {
          // console.log(`🔍 Encontrados ${excelFiles.length} archivos Excel en ${categoryFolder}`);
          
          const faseIFile = excelFiles.find(f => {
            const lowerName = f.name.toLowerCase();
            return (lowerName.includes('fase i') || 
                   lowerName.includes('fase-i') || 
                   lowerName.includes('fase 1') || 
                   lowerName.includes('fase-1') ||
                   lowerName.includes('iniciacion') ||
                   lowerName.includes('preparacion')) &&
                  !(lowerName.includes('fase ii') || 
                    lowerName.includes('fase-ii') || 
                    lowerName.includes('fase 2') || 
                    lowerName.includes('fase-2'));
          });
          
          if (faseIFile) {
            // console.log(`✅ Encontrado archivo de Fase I en carpeta raíz ${categoryFolder}: ${faseIFile.name}`);
            
            // Descargar el archivo
            const filePath = `${categoryFolder}/${faseIFile.name}`;
            const { data: fileData, error: fileError } = await supabase
              .storage
              .from(BUCKET_COURSE_EXCEL)
              .download(filePath);
              
            if (!fileError && fileData) {
              const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
              const contentType = faseIFile.name.endsWith('.xlsx') 
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/vnd.ms-excel';
                
              return {
                data: buffer,
                filename: faseIFile.name,
                contentType
              };
            }
          }
        }
        
        // 2. Buscar en subcarpetas
        for (const file of rootFiles) {
          // Solo buscar en carpetas
          if (file.metadata?.mimetype !== null) {
            continue;
          }
          
          // Verificar si la carpeta podría contener archivos de Fase I
          const lowerName = file.name.toLowerCase();
          const isFaseIFolder = possiblePhaseFolders.some(phase => lowerName.includes(phase)) ||
                                lowerName.includes('fase') && !lowerName.includes('fase-ii') && !lowerName.includes('fase-iii');
          
          if (isFaseIFolder) {
            // console.log(`🔍 Explorando subcarpeta potencial de Fase I: ${categoryFolder}/${file.name}`);
            
            // Listar archivos en esta subcarpeta
            const { data: subFiles, error: subError } = await supabase
              .storage
              .from(BUCKET_COURSE_EXCEL)
              .list(`${categoryFolder}/${file.name}`);
              
            if (!subError && subFiles && subFiles.length > 0) {
              // Buscar archivos Excel
              const excelFiles = subFiles.filter(f => 
                f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
              );
              
              if (excelFiles.length > 0) {
                // console.log(`🔍 Encontrados ${excelFiles.length} archivos Excel en ${categoryFolder}/${file.name}`);
                
                // Buscar archivo de Fase I, o simplemente tomar el primero si estamos en una carpeta de Fase I
                const faseIFile = excelFiles.find(f => {
                  const lowerName = f.name.toLowerCase();
                  return (lowerName.includes('fase i') || 
                         lowerName.includes('fase-i') || 
                         lowerName.includes('fase 1') || 
                         lowerName.includes('fase-1') ||
                         lowerName.includes('iniciacion') ||
                         lowerName.includes('preparacion')) &&
                        !(lowerName.includes('fase ii') || 
                          lowerName.includes('fase-ii') || 
                          lowerName.includes('fase 2') || 
                          lowerName.includes('fase-2'));
                }) || excelFiles[0]; // Tomar el primero si no hay coincidencias específicas
                
                // Descargar el archivo
                const filePath = `${categoryFolder}/${file.name}/${faseIFile.name}`;
                // console.log(`✅ Usando archivo: ${filePath}`);
                
                const { data: fileData, error: fileError } = await supabase
                  .storage
                  .from(BUCKET_COURSE_EXCEL)
                  .download(filePath);
                  
                if (!fileError && fileData) {
                  const buffer = await fileData.arrayBuffer().then(ab => Buffer.from(ab));
                  const contentType = faseIFile.name.endsWith('.xlsx') 
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : 'application/vnd.ms-excel';
                    
                  return {
                    data: buffer,
                    filename: faseIFile.name,
                    contentType
                  };
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error al buscar en ${categoryFolder}:`, error);
    }
  }
  
  return null;
}

// Función para obtener los archivos Excel para un curso
async function getExcelFilesForCourse(courseId: string) {
  try {
    // Obtener información del curso para saber si es para mujeres
    const { data: course } = await supabase
      .from('courses')
      .select('title, category, description')
      .eq('id', courseId)
      .single();

    if (!course) {
      console.error(`No se encontró información del curso con ID ${courseId}`);
      return [];
    }

    // Verificar si el curso es para mujeres
    const isForWomen = 
      course.category?.toLowerCase().includes('mujer') || 
      course.title?.toLowerCase().includes('mujer') ||
      course.description?.toLowerCase().includes('mujer');

    // Obtener el resultado del curso con las modificaciones necesarias para mujeres
    const result = await getCourseExcelFile(courseId);
    
    if (result.isPackComplete && result.packFiles) {
      // Si es un pack completo, devolver todos los archivos
      return result.packFiles.filter(file => 
        file.data !== null && file.filename !== null && file.contentType !== null
      ).map(file => ({
        filename: file.filename!,
        content: file.data!,
        contentType: file.contentType!
      }));
    } else if (result.data && result.filename && result.contentType) {
      // Si es un curso individual, devolver ese archivo
      return [{
        filename: result.filename,
        content: result.data,
        contentType: result.contentType
      }];
    }
    
    return [];
  } catch (error) {
    console.error(`Error al obtener archivos Excel para curso ${courseId}:`, error);
    return [];
  }
}