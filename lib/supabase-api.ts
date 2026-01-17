import { supabase, supabaseAdmin, uploadFile, getPublicUrl, deleteFile } from './supabase';
import type { Database } from '@/types/supabase';

// Tipos base de Supabase
type CourseRow = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type User = Database['public']['Tables']['users']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type FileRecord = Database['public']['Tables']['files']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

// Tipo extendido para cursos con category
export type Course = CourseRow & {
  category?: string;
};

// Constantes
const BUCKET_COURSES = 'course-files';
const BUCKET_COURSE_EXCEL = 'course-excel';

// ============================================
// API de Cursos (usa cliente público - lectura pública)
// ============================================

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
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error al obtener curso por ID:', error);
    throw error;
  }
  
  return data;
}

export async function getCourseByTitle(title: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('title', title)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error al obtener curso por título:', error);
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
  const { data: files } = await supabase
    .from('files')
    .select('path')
    .eq('course_id', id);
    
  if (files && files.length > 0) {
    for (const file of files) {
      await deleteFile(BUCKET_COURSES, file.path);
    }
  }
  
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error al eliminar curso:', error);
    throw error;
  }
}

// ============================================
// API de Usuarios
// ============================================

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
  const { data, error } = await supabaseAdmin
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
  const { data, error } = await supabaseAdmin
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

// ============================================
// API de Órdenes
// ============================================

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
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select(`*, course:courses(*)`)
    .eq('order_id', orderId);
  
  if (error) {
    console.error('Error al obtener items de la orden:', error);
    throw error;
  }
  
  return data || [];
}

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
  
  const { data, error } = await supabaseAdmin
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

export async function updateOrderTransaction(
  buyOrder: string,
  status: string,
  transactionData: any,
  token: string = ''
): Promise<Order> {
  const { data: existingOrder, error: findError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('buy_order', buyOrder)
    .single();

  if (findError) throw findError;
  if (!existingOrder) throw new Error(`No se encontró la orden con buy_order=${buyOrder}`);

  const updateData: any = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (token) updateData.transaction_token = token;
  if (transactionData && Object.keys(transactionData).length > 0) {
    updateData.transaction_response = transactionData;
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('buy_order', buyOrder)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getOrderByBuyOrder(buyOrder: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
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


// ============================================
// API de Items de Orden
// ============================================

interface ProcessedOrderItem {
  course_id: string;
  price: number;
  is_part_of_pack?: boolean;
}

export async function createOrderItems(
  orderId: string,
  items: { course_id: string, price: number }[]
): Promise<OrderItem[]> {
  // Obtener todos los cursos de los items en una sola query
  const courseIds = items.map(item => item.course_id);
  
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description, category')
    .in('id', courseIds);
  
  if (coursesError) {
    console.error('Error al obtener información de cursos:', coursesError);
  }
  
  // Crear mapa de cursos para acceso rápido
  const coursesMap = new Map(
    (coursesData || []).map(course => [course.id, course])
  );
  
  let processedItems: ProcessedOrderItem[] = [...items];
  
  // Identificar packs y sus categorías
  const packCategories: { itemId: string; category: string }[] = [];
  
  for (const item of items) {
    const course = coursesMap.get(item.course_id);
    if (!course) continue;
    
    const isPack = course.title?.toLowerCase().includes('pack completo') || 
                  course.category?.toLowerCase().includes('pack-completo');
    
    if (isPack) {
      const packCategory = course.category?.toLowerCase() || '';
      const titleLower = course.title?.toLowerCase() || '';
      
      let categoryToSearch = '';
      
      if (packCategory.includes('pack-completo-')) {
        categoryToSearch = packCategory.replace('pack-completo-', '');
      } else if (titleLower.includes('pack completo')) {
        const parts = titleLower.split('pack completo');
        if (parts.length > 1) {
          categoryToSearch = parts[1].trim();
        }
      }
      
      if (categoryToSearch) {
        packCategories.push({ itemId: item.course_id, category: categoryToSearch });
      }
    }
  }
  
  // Si hay packs, buscar cursos individuales en una sola query
  if (packCategories.length > 0) {
    // Construir query para todas las categorías de packs
    const categoryPatterns = packCategories.map(p => p.category);
    const packItemIds = packCategories.map(p => p.itemId);
    
    const { data: individualCourses, error: indError } = await supabase
      .from('courses')
      .select('id, title, price, category')
      .not('id', 'in', `(${packItemIds.join(',')})`)
      .or(categoryPatterns.map(cat => `category.ilike.%${cat}%`).join(','));
    
    if (!indError && individualCourses && individualCourses.length > 0) {
      // Agrupar cursos por categoría de pack
      for (const pack of packCategories) {
        const matchingCourses = individualCourses.filter(course => 
          course.category?.toLowerCase().includes(pack.category)
        );
        
        const additionalItems = matchingCourses.map(course => ({
          course_id: course.id,
          price: 0,
          is_part_of_pack: true
        }));
        
        processedItems = [...processedItems, ...additionalItems];
      }
    }
  }
  
  // Eliminar duplicados
  const uniqueItems = processedItems.reduce((acc, item) => {
    if (!acc.find(i => i.course_id === item.course_id)) {
      acc.push(item);
    }
    return acc;
  }, [] as ProcessedOrderItem[]);
  
  const orderItems = uniqueItems.map(item => ({
    order_id: orderId,
    course_id: item.course_id,
    price: item.price,
    is_part_of_pack: item.is_part_of_pack || false
  }));
  
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems)
    .select();
  
  if (error) {
    console.error('Error al crear items de orden:', error);
    throw error;
  }
  
  return data;
}

// ============================================
// API de Historial de Transacciones
// ============================================

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
  const { data: result, error } = await supabaseAdmin
    .from('order_transaction_history')
    .insert([{ order_id: orderId, status, data }])
    .select()
    .single();
  
  if (error) {
    console.error('Error al agregar historial de transacción:', error);
    throw error;
  }
  
  return result;
}

// ============================================
// API de Archivos
// ============================================

export async function uploadCourseFile(
  courseId: string, 
  file: File | Blob,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<string> {
  const uniquePath = `courses/${courseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9\.-]/g, '_')}`;
  
  await uploadFile(BUCKET_COURSES, uniquePath, file, {
    contentType: fileType,
    upsert: true
  });
  
  const publicUrl = getPublicUrl(BUCKET_COURSES, uniquePath);
  
  const { error } = await supabase
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
    await deleteFile(BUCKET_COURSES, file.path);
    
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


// ============================================
// API de Archivos Excel de Cursos
// ============================================

interface ExcelFileResult {
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
  isPackComplete?: boolean;
  packFiles?: Array<{
    data: Buffer | null;
    filename: string | null;
    contentType: string | null;
  }>;
}

function formatCategoryFolder(category: string): string {
  return category
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getContentType(filename: string): string {
  return filename.endsWith('.xlsx') 
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.ms-excel';
}

function isPhaseOneFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  const containsFaseI = lowerName.includes('fase i') || 
                        lowerName.includes('fase-i') || 
                        lowerName.includes('fase 1') || 
                        lowerName.includes('fase-1') ||
                        lowerName.includes('iniciacion') ||
                        lowerName.includes('preparacion');
                        
  const containsFaseIIorIII = lowerName.includes('fase ii') || 
                              lowerName.includes('fase-ii') || 
                              lowerName.includes('fase 2') || 
                              lowerName.includes('fase-2') ||
                              lowerName.includes('fase iii') || 
                              lowerName.includes('fase-iii') || 
                              lowerName.includes('fase 3') || 
                              lowerName.includes('fase-3');
  
  return containsFaseI && !containsFaseIIorIII;
}

function sortExcelFilesByPhase(files: any[]): any[] {
  return [...files].sort((a, b) => {
    const getRomanOrNumber = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('fase i') || lower.includes('fase 1') || lower.includes('fase-i') || lower.includes('fase-1')) return 1;
      if (lower.includes('fase ii') || lower.includes('fase 2') || lower.includes('fase-ii') || lower.includes('fase-2')) return 2;
      if (lower.includes('fase iii') || lower.includes('fase 3') || lower.includes('fase-iii') || lower.includes('fase-3')) return 3;
      return 999;
    };
    return getRomanOrNumber(a.name) - getRomanOrNumber(b.name);
  });
}

async function downloadExcelFile(filePath: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_COURSE_EXCEL)
    .download(filePath);
  
  if (error || !data) {
    console.log(`Error descargando ${filePath}:`, error);
    return null;
  }
  
  const buffer = await data.arrayBuffer().then(ab => Buffer.from(ab));
  const filename = filePath.split('/').pop() || '';
  return { buffer, filename };
}

async function findExcelInFolder(folderPath: string, phaseIdentifier?: string): Promise<ExcelFileResult> {
  console.log(`findExcelInFolder: buscando en ${folderPath}`);
  
  const { data: files, error } = await supabaseAdmin.storage
    .from(BUCKET_COURSE_EXCEL)
    .list(folderPath);
  
  if (error || !files || files.length === 0) {
    return { data: null, filename: null, contentType: null };
  }
  
  const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
  if (excelFiles.length === 0) {
    return { data: null, filename: null, contentType: null };
  }
  
  const sortedFiles = sortExcelFilesByPhase(excelFiles);
  let targetFile = sortedFiles[0];
  
  // Si buscamos fase específica
  if (phaseIdentifier === 'i' || phaseIdentifier === '1') {
    const phaseOneFile = sortedFiles.find(f => isPhaseOneFile(f.name));
    if (phaseOneFile) targetFile = phaseOneFile;
  }
  
  const result = await downloadExcelFile(`${folderPath}/${targetFile.name}`);
  if (!result) return { data: null, filename: null, contentType: null };
  
  return {
    data: result.buffer,
    filename: result.filename,
    contentType: getContentType(result.filename)
  };
}

// Mapeo de categorías de DB a carpetas del bucket
function getCategoryFolder(category: string, isForWomen: boolean): string {
  const categoryLower = category.toLowerCase();
  
  // Mapeo directo basado en la categoría
  if (categoryLower.includes('ganancia muscular')) {
    return isForWomen ? 'ganancia-muscular-mujeres' : 'ganancia-muscular';
  }
  if (categoryLower.includes('pérdida de grasa') || categoryLower.includes('perdida de grasa')) {
    return isForWomen ? 'perdida-de-grasa-corporal-mujeres' : 'perdida-de-grasa-corporal';
  }
  if (categoryLower.includes('ganancia de fuerza') || categoryLower.includes('fuerza')) {
    return 'ganancia-de-fuerza'; // TODO: agregar carpeta cuando exista
  }
  if (categoryLower.includes('powerlifting')) {
    return 'powerlifting'; // TODO: agregar carpeta cuando exista
  }
  
  // Fallback: formatear la categoría
  return formatCategoryFolder(category);
}

// Mapeo de fase del título a carpeta
function getPhaseFolder(title: string, category: string): string {
  const titleLower = title.toLowerCase();
  const categoryLower = category.toLowerCase();
  
  // Detectar número de fase
  let phaseNum = 'i';
  if (titleLower.includes('fase i:') || titleLower.includes('fase 1') || titleLower.includes('fase i -')) {
    phaseNum = 'i';
  } else if (titleLower.includes('fase ii:') || titleLower.includes('fase 2') || titleLower.includes('fase ii -')) {
    phaseNum = 'ii';
  } else if (titleLower.includes('fase iii:') || titleLower.includes('fase 3') || titleLower.includes('fase iii -')) {
    phaseNum = 'iii';
  }
  
  // Determinar sufijo según categoría y fase
  if (categoryLower.includes('ganancia muscular')) {
    if (phaseNum === 'i') return 'fase-i-iniciacion';
    if (phaseNum === 'ii') return 'fase-ii-progresion';
    if (phaseNum === 'iii') return 'fase-iii-maestria';
  }
  
  if (categoryLower.includes('pérdida de grasa') || categoryLower.includes('perdida de grasa')) {
    if (phaseNum === 'i') return 'fase-i-preparacion';
    if (phaseNum === 'ii') return 'fase-ii-construccion';
    if (phaseNum === 'iii') return 'fase-iii-potenciacion';
  }
  
  // Fallback genérico
  return `fase-${phaseNum}`;
}

export async function getCourseExcelFile(
  courseId: string,
  category?: string,
  phase: string = "Fase 1"
): Promise<ExcelFileResult> {
  try {
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('title, category, description')
      .eq('id', courseId)
      .single();
    
    if (courseError) {
      console.log(`Error al obtener curso ${courseId}:`, courseError);
      return { data: null, filename: null, contentType: null };
    }
    
    if (!course) {
      console.log(`Curso ${courseId} no encontrado`);
      return { data: null, filename: null, contentType: null };
    }

    console.log(`Buscando Excel para: "${course.title}" (${course.category})`);

    // Detectar si es para mujeres
    const isForWomen = 
      course.category?.toLowerCase().includes('mujer') || 
      course.title?.toLowerCase().includes('mujer');

    // Detectar si es pack completo
    const isPackComplete = course.title.toLowerCase().includes('pack completo');

    // Obtener carpeta de categoría
    const categoryFolder = getCategoryFolder(course.category, isForWomen);
    console.log(`Carpeta de categoría: ${categoryFolder}`);

    if (isPackComplete) {
      console.log(`Es pack completo, buscando todos los archivos...`);
      const packFiles = await getPackCompleteFiles(categoryFolder);
      console.log(`Archivos encontrados para pack: ${packFiles.length}`);
      return { data: null, filename: null, contentType: null, isPackComplete: true, packFiles };
    }

    // Curso individual - obtener carpeta de fase
    const phaseFolder = getPhaseFolder(course.title, course.category);
    const fullPath = `${categoryFolder}/${phaseFolder}`;
    console.log(`Buscando en: ${fullPath}`);

    // Buscar archivo Excel en la carpeta
    const result = await findExcelInFolder(fullPath);
    
    if (!result.data) {
      console.log(`No se encontró archivo en ${fullPath}, intentando alternativas...`);
      
      // Intentar listar carpetas disponibles
      const { data: subfolders } = await supabaseAdmin.storage
        .from(BUCKET_COURSE_EXCEL)
        .list(categoryFolder);
      
      if (subfolders && subfolders.length > 0) {
        console.log(`Carpetas disponibles en ${categoryFolder}:`, subfolders.map(f => f.name));
        
        // Buscar carpeta que contenga el número de fase
        const phaseNum = phaseFolder.match(/fase-(\w+)/)?.[1] || 'i';
        const matchingFolder = subfolders.find(f => 
          f.name.toLowerCase().includes(`fase-${phaseNum}`)
        );
        
        if (matchingFolder) {
          console.log(`Intentando con carpeta alternativa: ${matchingFolder.name}`);
          return findExcelInFolder(`${categoryFolder}/${matchingFolder.name}`);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error al obtener archivo Excel para curso ${courseId}:`, error);
    return { data: null, filename: null, contentType: null };
  }
}

async function getPackCompleteFiles(categoryFolder: string): Promise<Array<{
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
}>> {
  const files: Array<{ data: Buffer | null; filename: string | null; contentType: string | null }> = [];
  
  console.log(`Buscando archivos de pack en: ${categoryFolder}`);

  // Estrategia 1: Buscar en carpeta pack-completo
  const packFolderName = `pack-completo-${categoryFolder.replace('-mujeres', '')}`;
  const packPath = `${categoryFolder}/${packFolderName}`;
  
  console.log(`Intentando carpeta pack: ${packPath}`);
  
  const { data: packFiles, error: packError } = await supabaseAdmin.storage
    .from(BUCKET_COURSE_EXCEL)
    .list(packPath);

  if (!packError && packFiles && packFiles.length > 0) {
    console.log(`Encontrados ${packFiles.length} archivos en pack`);
    const excelFiles = sortExcelFilesByPhase(
      packFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    );
    
    for (const excelFile of excelFiles) {
      const result = await downloadExcelFile(`${packPath}/${excelFile.name}`);
      if (result) {
        files.push({
          data: result.buffer,
          filename: result.filename,
          contentType: getContentType(result.filename)
        });
      }
    }
    
    if (files.length > 0) {
      console.log(`Retornando ${files.length} archivos del pack`);
      return files;
    }
  }

  // Estrategia 2: Buscar en carpetas de fase individuales
  console.log(`Buscando en carpetas de fase individuales...`);
  
  const { data: subfolders } = await supabaseAdmin.storage
    .from(BUCKET_COURSE_EXCEL)
    .list(categoryFolder);

  if (subfolders && subfolders.length > 0) {
    // Ordenar carpetas por fase
    const phaseFolders = subfolders
      .filter(f => f.name.startsWith('fase-'))
      .sort((a, b) => {
        const getPhaseNum = (name: string) => {
          if (name.includes('-i-') || name === 'fase-i') return 1;
          if (name.includes('-ii-') || name === 'fase-ii') return 2;
          if (name.includes('-iii-') || name === 'fase-iii') return 3;
          return 99;
        };
        return getPhaseNum(a.name) - getPhaseNum(b.name);
      });

    console.log(`Carpetas de fase encontradas:`, phaseFolders.map(f => f.name));

    for (const phaseFolder of phaseFolders) {
      // Saltar carpetas de pack
      if (phaseFolder.name.includes('pack-completo')) continue;
      
      const phasePath = `${categoryFolder}/${phaseFolder.name}`;
      const { data: phaseFiles } = await supabaseAdmin.storage
        .from(BUCKET_COURSE_EXCEL)
        .list(phasePath);

      if (phaseFiles && phaseFiles.length > 0) {
        const excelFiles = phaseFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
        
        for (const excelFile of excelFiles) {
          const result = await downloadExcelFile(`${phasePath}/${excelFile.name}`);
          if (result) {
            files.push({
              data: result.buffer,
              filename: result.filename,
              contentType: getContentType(result.filename)
            });
          }
        }
      }
    }
  }

  console.log(`Total archivos encontrados para pack: ${files.length}`);
  return files;
}

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
      results.push({ courseId, data, filename, contentType });
    } catch (error) {
      console.error(`Error al obtener Excel para curso ${courseId}:`, error);
      results.push({ courseId, data: null, filename: null, contentType: null });
    }
  }
  
  return results;
}

export async function getAllExcelFiles(): Promise<Array<{
  id: string;
  name: string;
  category: string;
  course_id: string;
  course_name: string;
  phase: string;
}>> {
  const { data: categories } = await supabase.storage
    .from(BUCKET_COURSE_EXCEL)
    .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
  
  if (!categories) return [];

  const { data: allCourses } = await supabase
    .from('courses')
    .select('id, title, category');

  const courseMap = new Map<string, { id?: string; title: string; category: string }>();
  if (allCourses) {
    allCourses.forEach(course => {
      courseMap.set(course.id, { title: course.title, category: course.category });
      const formattedName = formatCategoryFolder(course.title);
      courseMap.set(formattedName, { id: course.id, title: course.title, category: course.category });
    });
  }

  const result = [];
  const categoryFolders = categories.filter(item => item.metadata?.mimetype === null);

  for (const categoryFolder of categoryFolders) {
    const { data: courses } = await supabase.storage
      .from(BUCKET_COURSE_EXCEL)
      .list(categoryFolder.name, { limit: 100 });
    
    if (!courses) continue;

    const courseFolders = courses.filter(item => item.metadata?.mimetype === null);

    for (const courseFolder of courseFolders) {
      const { data: files } = await supabase.storage
        .from(BUCKET_COURSE_EXCEL)
        .list(`${categoryFolder.name}/${courseFolder.name}`, { limit: 100 });
      
      if (!files) continue;

      const courseInfo = courseMap.get(courseFolder.name);
      const courseId = courseInfo?.id || courseFolder.name;
      const courseTitle = courseInfo?.title || courseFolder.name;

      const excelFiles = files.filter(file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));

      for (const excelFile of excelFiles) {
        let phase = 'Desconocida';
        if (excelFile.name.toLowerCase().startsWith('fase')) {
          phase = excelFile.name.split('.')[0];
        }

        result.push({
          id: `${categoryFolder.name}/${courseFolder.name}/${excelFile.name}`,
          name: excelFile.name,
          category: categoryFolder.name,
          course_id: courseId,
          course_name: courseTitle,
          phase
        });
      }
    }
  }

  return result;
}

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
  const course = await getCourseById(courseId);
  if (!course) {
    console.error(`No se encontró el curso con ID ${courseId}`);
    return false;
  }

  const pathParts = excelFile.path.split('/');
  const category = excelFile.category || (pathParts.length > 1 ? pathParts[0] : undefined);
  const phase = excelFile.phase || (excelFile.filename.toLowerCase().startsWith('fase') 
    ? excelFile.filename.split('.')[0] 
    : 'Fase 1');

  const { error } = await supabase
    .from('files')
    .insert([{
      course_id: courseId,
      name: excelFile.filename,
      path: excelFile.path,
      type: excelFile.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: excelFile.size || 0,
    }]);

  if (error) {
    console.error(`Error al asociar archivo Excel al curso ${courseId}:`, error);
    return false;
  }

  return true;
}
