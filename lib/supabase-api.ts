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
  
  console.log('🔍 createOrderItems - INICIO - Recibidos:', JSON.stringify(items, null, 2));
  
  let processedItems: ProcessedOrderItem[] = [...items]; // Crear una copia de los items originales
  
  // Procesar packs completos
  for (const item of items) {
    try {
      console.log(`🔍 Procesando item con course_id: ${item.course_id}`);
      
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
      
      console.log(`📋 Información del curso: ${JSON.stringify(course, null, 2)}`);
      
      // Verificar si es un pack completo basándose en el título o categoría
      const isPack = course?.title?.toLowerCase().includes('pack completo') || 
                    course?.category?.toLowerCase().includes('pack-completo');
      
      console.log(`🧐 ¿Es un pack completo? ${isPack ? 'SÍ' : 'NO'}`);
      
      if (isPack) {
        console.log('📦 Detectado pack completo:', course.title);
        
        // Determinar a qué categoría pertenece este pack
        const packCategory = course.category?.toLowerCase() || '';
        const titleLower = course.title?.toLowerCase() || '';
        
        console.log(`📋 Categoría del pack: "${packCategory}", Título: "${titleLower}"`);
        
        let categoryToSearch = '';
        
        // Obtener la categoría base del pack (por ejemplo, de "pack-completo-ganancia-muscular" extraer "ganancia-muscular")
        if (packCategory.includes('pack-completo-')) {
          categoryToSearch = packCategory.replace('pack-completo-', '');
          console.log(`🔍 Categoría extraída del nombre de categoría: "${categoryToSearch}"`);
        } else if (titleLower.includes('pack completo')) {
          // Intentar extraer la categoría del título
          const parts = titleLower.split('pack completo');
          if (parts.length > 1) {
            categoryToSearch = parts[1].trim();
            console.log(`🔍 Categoría extraída del título: "${categoryToSearch}"`);
          }
        }
        
        if (categoryToSearch) {
          console.log('🔍 Buscando cursos en la categoría:', categoryToSearch);
          
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
          
          console.log(`📋 Cursos individuales encontrados (${individualCourses?.length || 0}):`, 
            JSON.stringify(individualCourses, null, 2));
          
          if (individualCourses && individualCourses.length > 0) {
            console.log('✅ Cursos individuales encontrados:', 
              individualCourses.map(c => `${c.title} (${c.category})`).join(', '));
            
            // Agregar cada curso individual como un item adicional (precio 0 para no cobrar doble)
            const additionalItems = individualCourses.map(course => ({
              course_id: course.id,
              price: 0, // Precio 0 porque ya se pagó en el pack
              is_part_of_pack: true
            }));
            
            console.log(`📋 Items adicionales a agregar (${additionalItems.length}):`, 
              JSON.stringify(additionalItems, null, 2));
            
            processedItems = [...processedItems, ...additionalItems];
            
            console.log(`📋 Lista actualizada de processedItems (${processedItems.length}):`, 
              JSON.stringify(processedItems, null, 2));
          } else {
            console.warn('⚠️ No se encontraron cursos individuales para el pack');
            
            // Intenta una búsqueda alternativa si no se encontraron cursos por categoría
            console.log('🔍 Intentando búsqueda alternativa por categoría principal...');
            
            // Extraer la categoría principal (ej: de "ganancia-muscular-mujeres" sacar "ganancia-muscular")
            const mainCategory = categoryToSearch.split('-').slice(0, 2).join('-');
            
            if (mainCategory && mainCategory !== categoryToSearch) {
              console.log(`🔍 Buscando con categoría principal: "${mainCategory}"`);
              
              const { data: altCourses, error: altError } = await supabase
                .from('courses')
                .select('id, title, price, category')
                .ilike('category', `%${mainCategory}%`)
                .not('id', 'eq', item.course_id);
                
              if (!altError && altCourses && altCourses.length > 0) {
                console.log('✅ Cursos alternativos encontrados:', 
                  altCourses.map(c => `${c.title} (${c.category})`).join(', '));
                
                const altItems = altCourses.map(course => ({
                  course_id: course.id,
                  price: 0,
                  is_part_of_pack: true
                }));
                
                processedItems = [...processedItems, ...altItems];
                
                console.log(`📋 Lista actualizada con búsqueda alternativa (${processedItems.length}):`, 
                  JSON.stringify(processedItems, null, 2));
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
  
  console.log('📋 Items finales a insertar:', JSON.stringify(processedItems, null, 2));
  
  // Crear los items de orden
  const orderItems = processedItems.map(item => ({
    order_id: orderId,
    course_id: item.course_id,
    price: item.price,
    is_part_of_pack: item.is_part_of_pack || false
  }));
  
  console.log(`📝 Insertando ${orderItems.length} items en la tabla order_items:`);
  
  const { data, error } = await supabase
    .from('order_items')
    .insert(orderItems)
    .select();
  
  if (error) {
    console.error('❌ Error al crear items de orden:', error);
    throw error;
  }
  
  console.log(`✅ ${data.length} items insertados correctamente:`, 
    JSON.stringify(data, null, 2));
  
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
      .select('title, category')
      .eq('id', courseId)
      .single();
    
    if (!course) {
      return { data: null, filename: null, contentType: null };
    }

    // Verificar si es un pack completo
    const isPackComplete = course.title.toLowerCase().includes('pack completo') ||
                          course.category?.toLowerCase().includes('pack-completo');

    if (isPackComplete) {
      // Formatear la categoría base (sin el prefijo pack-completo)
      const baseCategory = course.category
        .toLowerCase()
        .replace('pack-completo-', '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

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
    const categoryFolder = course.category
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
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
    
    if (subfoldersError) {
      // Intentar con estructura antigua si falla
      return await originalGetCourseExcelFile(courseId, category, phase);
    }
    
    if (!subfolders || subfolders.length === 0) {
      // Intentar con estructura antigua si falla
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
    
    // Elegir el archivo más relevante, priorizando:
    // 1. Coincidencia exacta con la fase
    // 2. Archivo que contenga "Fase" + número/romano
    // 3. Primer archivo Excel disponible
    let targetExcelFile = null;
    
    const exactMatchFile = excelFiles.find(f => 
      f.name.toLowerCase() === `fase ${phaseIdentifier}.xlsx` || 
      f.name.toLowerCase() === `fase-${phaseIdentifier}.xlsx` ||
      f.name.toLowerCase() === `fase${phaseIdentifier}.xlsx` ||
      f.name.toLowerCase() === `fase ${phaseIdentifier.toUpperCase()}.xlsx` ||
      f.name.toLowerCase() === `fase-${phaseIdentifier.toUpperCase()}.xlsx` ||
      f.name.toLowerCase() === `fase${phaseIdentifier.toUpperCase()}.xlsx`
    );
    
    if (exactMatchFile) {
      targetExcelFile = exactMatchFile;
    } else {
      // Buscar cualquier archivo con "Fase" + identificador
      const phaseFile = excelFiles.find(f => 
        f.name.toLowerCase().includes(`fase ${phaseIdentifier}`) || 
        f.name.toLowerCase().includes(`fase-${phaseIdentifier}`) ||
        f.name.toLowerCase().includes(`fase${phaseIdentifier}`) ||
        f.name.toLowerCase().includes(`fase ${phaseIdentifier.toUpperCase()}`) ||
        f.name.toLowerCase().includes(`fase-${phaseIdentifier.toUpperCase()}`) ||
        f.name.toLowerCase().includes(`fase${phaseIdentifier.toUpperCase()}`)
      );
      
      if (phaseFile) {
        targetExcelFile = phaseFile;
      } else {
        // Usar el primer archivo Excel
        targetExcelFile = excelFiles[0];
      }
    }
    
    // Descargar el archivo seleccionado
    const filePath = `${folderPath}/${targetExcelFile.name}`;
    
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
    // Listar contenido de la carpeta
    const { data: files, error } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .list(coursePath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      throw error;
    }
    
    if (!files || files.length === 0) {
      return { data: null, filename: null, contentType: null };
    }
    
    let excelFile = null;
    
    // Estrategia de búsqueda:
    if (phase) {
      // 1. Si tenemos una fase específica, primero buscamos un archivo con ese nombre exacto
      const exactPhaseMatch = files.find(file => 
        file.name === `${phase}.xlsx` || 
        file.name === `${phase}.xls`
      );
      
      if (exactPhaseMatch) {
        excelFile = exactPhaseMatch;
      } else {
        // 2. Buscar coincidencia insensible a mayúsculas/minúsculas
        const caseInsensitiveMatch = files.find(file => 
          file.name.toLowerCase() === `${phase.toLowerCase()}.xlsx` || 
          file.name.toLowerCase() === `${phase.toLowerCase()}.xls`
        );
        
        if (caseInsensitiveMatch) {
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
        // Si encontramos una carpeta de fase, buscamos dentro de ella
        return getCourseExcelFileFromPath(`${coursePath}/${phaseFolder.name}`, "");
      }
    }
    
    if (!excelFile) {
      return { data: null, filename: null, contentType: null };
    }
    
    // Obtener URL pública para descargar el archivo
    const filePath = `${coursePath}/${excelFile.name}`;
    
    // Descargar el archivo
    const { data, error: downloadError } = await supabase
      .storage
      .from(BUCKET_COURSE_EXCEL)
      .download(filePath);
    
    if (downloadError) {
      throw downloadError;
    }
    
    if (!data) {
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
  const phases = ['fase-i-iniciacion', 'fase-ii-progresion', 'fase-iii-maestria'];

  for (const phase of phases) {
    try {
      // Construir la ruta para cada fase
      const phasePath = `${categoryFolder}/${phase}`;
      
      // Listar archivos en la carpeta de la fase
      const { data: phaseFiles, error: listError } = await supabase
        .storage
        .from(BUCKET_COURSE_EXCEL)
        .list(phasePath);

      if (listError || !phaseFiles || phaseFiles.length === 0) {
        console.warn(`No se encontraron archivos para la fase ${phase}`);
        continue;
      }

      // Encontrar el archivo Excel
      const excelFile = phaseFiles.find(f => 
        f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
      );

      if (!excelFile) {
        console.warn(`No se encontró archivo Excel en ${phase}`);
        continue;
      }

      // Descargar el archivo
      const filePath = `${phasePath}/${excelFile.name}`;
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from(BUCKET_COURSE_EXCEL)
        .download(filePath);

      if (downloadError || !fileData) {
        console.warn(`Error al descargar archivo de ${phase}:`, downloadError);
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
    } catch (error) {
      console.error(`Error procesando fase ${phase}:`, error);
    }
  }

  return files;
} 