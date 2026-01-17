"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CACHE_TIMES } from '@/lib/cache-config';

// Cache en memoria para cursos
interface CoursesCache {
  data: Course[];
  timestamp: number;
}

let coursesCache: CoursesCache | null = null;

// Tipo de curso para el frontend
export interface Course {
  id: string; // UUID de Supabase
  title: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  imageFemale?: string;
  category: string;
}

// Mapeo de imágenes por título/categoría (rutas relativas a public/)
const IMAGE_MAP: Record<string, { male: string; female?: string }> = {
  // Ganancia Muscular
  'Fase I: Iniciación': { male: '/ganancia1.jpg', female: '/Ganancia mujeres 1.jpg' },
  'Fase II: Progresión': { male: '/ganancia2.jpg', female: '/Ganancia mujeres 2.jpg' },
  'Fase III: Maestría': { male: '/ganancia3.jpg', female: '/Ganancia mujeres 3.jpg' },
  'Pack Completo: Ganancia Muscular': { male: '/Pack ganancia muscular.png', female: '/Ganancia Mujeres 4.jpg' },
  
  // Ganancia Muscular Mujeres
  'Fase I: Iniciación Mujer': { male: '/Ganancia mujeres 1.jpg' },
  'Fase II: Progresión Mujer': { male: '/Ganancia mujeres 2.jpg' },
  'Fase III: Maestría Mujer': { male: '/Ganancia mujeres 3.jpg' },
  'Pack Completo: Ganancia Muscular Mujer': { male: '/Ganancia Mujeres 4.jpg' },
  
  // Pérdida de Grasa
  'Fase I: Preparación': { male: '/perdida1.jpg', female: '/Perdida mujeres 1.jpg' },
  'Fase II: Construcción': { male: '/perdida2.jpg', female: '/Perdida mujeres 2.jpg' },
  'Fase III: Potenciación': { male: '/perdida3.jpg', female: '/Perdida mujeres 3.jpg' },
  'Pack Completo: Pérdida de Grasa Corporal': { male: '/pack perdida de grasa corporal.jpg', female: '/Perdida mujeres 4.jpg' },
  
  // Pérdida de Grasa Mujeres
  'Fase I: Preparación Mujer': { male: '/Perdida mujeres 1.jpg' },
  'Fase II: Construcción Mujer': { male: '/Perdida mujeres 2.jpg' },
  'Fase III: Potenciación Mujer': { male: '/Perdida mujeres 3.jpg' },
  'Pack Completo: Pérdida de Grasa Corporal Mujer': { male: '/Perdida mujeres 4.jpg' },
  
  // Ganancia de Fuerza
  'Fase I: Despegue': { male: '/fuerza1.jpeg' },
  'Fase II: Impulso': { male: '/fuerza2.jpeg' },
  'Fase III: Dominio': { male: '/fuerza3.jpg' },
  'Pack Completo: Ganancia de Fuerza': { male: '/Pack ganancia de fuerza.jpg' },
  
  // Powerlifting
  'Fase I: Base': { male: '/power1.jpg' },
  'Fase II: Crecimiento': { male: '/power2.jpg' },
  'Fase III: Élite': { male: '/power3.jpg' },
  'Pack Completo: Powerlifting': { male: '/Pack powerlifting.jpeg' },
};


// Mapeo de duración por tipo de curso
function getDuration(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('pack completo')) return '13 semanas';
  if (lowerTitle.includes('fase iii') || lowerTitle.includes('fase 3')) return '5 semanas';
  return '4 semanas';
}

// Obtener imagen para un curso
function getImageForCourse(title: string, category: string): { image: string; imageFemale?: string } {
  // Buscar por título exacto
  if (IMAGE_MAP[title]) {
    return { image: IMAGE_MAP[title].male, imageFemale: IMAGE_MAP[title].female };
  }
  
  // Buscar por categoría y tipo de fase
  const lowerTitle = title.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // Verificar si es para mujeres
  const isForWomen = lowerCategory.includes('mujer') || lowerTitle.includes('mujer');
  
  // Determinar tipo de curso
  if (lowerTitle.includes('pack completo')) {
    if (lowerCategory.includes('ganancia muscular')) {
      return { image: isForWomen ? '/Ganancia Mujeres 4.jpg' : '/Pack ganancia muscular.png', imageFemale: '/Ganancia Mujeres 4.jpg' };
    }
    if (lowerCategory.includes('pérdida') || lowerCategory.includes('perdida')) {
      return { image: isForWomen ? '/Perdida mujeres 4.jpg' : '/pack perdida de grasa corporal.jpg', imageFemale: '/Perdida mujeres 4.jpg' };
    }
    if (lowerCategory.includes('fuerza')) return { image: '/Pack ganancia de fuerza.jpg' };
    if (lowerCategory.includes('powerlifting')) return { image: '/Pack powerlifting.jpeg' };
  }
  
  if (lowerTitle.includes('fase i:') || lowerTitle.includes('fase 1')) {
    if (lowerCategory.includes('ganancia muscular')) {
      return { image: isForWomen ? '/Ganancia mujeres 1.jpg' : '/ganancia1.jpg', imageFemale: '/Ganancia mujeres 1.jpg' };
    }
    if (lowerCategory.includes('pérdida') || lowerCategory.includes('perdida')) {
      return { image: isForWomen ? '/Perdida mujeres 1.jpg' : '/perdida1.jpg', imageFemale: '/Perdida mujeres 1.jpg' };
    }
    if (lowerCategory.includes('fuerza')) return { image: '/fuerza1.jpeg' };
    if (lowerCategory.includes('powerlifting')) return { image: '/power1.jpg' };
  }
  
  if (lowerTitle.includes('fase ii:') || lowerTitle.includes('fase 2')) {
    if (lowerCategory.includes('ganancia muscular')) {
      return { image: isForWomen ? '/Ganancia mujeres 2.jpg' : '/ganancia2.jpg', imageFemale: '/Ganancia mujeres 2.jpg' };
    }
    if (lowerCategory.includes('pérdida') || lowerCategory.includes('perdida')) {
      return { image: isForWomen ? '/Perdida mujeres 2.jpg' : '/perdida2.jpg', imageFemale: '/Perdida mujeres 2.jpg' };
    }
    if (lowerCategory.includes('fuerza')) return { image: '/fuerza2.jpeg' };
    if (lowerCategory.includes('powerlifting')) return { image: '/power2.jpg' };
  }
  
  if (lowerTitle.includes('fase iii:') || lowerTitle.includes('fase 3')) {
    if (lowerCategory.includes('ganancia muscular')) {
      return { image: isForWomen ? '/Ganancia mujeres 3.jpg' : '/ganancia3.jpg', imageFemale: '/Ganancia mujeres 3.jpg' };
    }
    if (lowerCategory.includes('pérdida') || lowerCategory.includes('perdida')) {
      return { image: isForWomen ? '/Perdida mujeres 3.jpg' : '/perdida3.jpg', imageFemale: '/Perdida mujeres 3.jpg' };
    }
    if (lowerCategory.includes('fuerza')) return { image: '/fuerza3.jpg' };
    if (lowerCategory.includes('powerlifting')) return { image: '/power3.jpg' };
  }
  
  // Default
  return { image: '/ganancia1.jpg' };
}


interface CoursesContextType {
  courses: Course[];
  loading: boolean;
  error: string | null;
  getCourseById: (id: string) => Course | undefined;
  getCoursesByCategory: (category: string) => Course[];
  getCategories: (isFemale: boolean) => string[];
  refreshCourses: () => Promise<void>;
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

// Verificar si el caché es válido
function isCacheValid(): boolean {
  if (!coursesCache) return false;
  const now = Date.now();
  const cacheAge = (now - coursesCache.timestamp) / 1000; // en segundos
  return cacheAge < CACHE_TIMES.COURSES;
}

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (forceRefresh = false) => {
    try {
      // Usar caché si es válido y no se fuerza refresh
      if (!forceRefresh && isCacheValid() && coursesCache) {
        setCourses(coursesCache.data);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      if (data) {
        const mappedCourses: Course[] = data.map(course => {
          const images = getImageForCourse(course.title, course.category || '');
          return {
            id: course.id,
            title: course.title,
            description: course.description,
            price: course.price,
            duration: getDuration(course.title),
            category: course.category || 'Sin categoría',
            image: images.image,
            imageFemale: images.imageFemale,
          };
        });
        
        // Actualizar caché
        coursesCache = {
          data: mappedCourses,
          timestamp: Date.now()
        };
        
        setCourses(mappedCourses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const getCourseById = useCallback((id: string): Course | undefined => {
    return courses.find(course => course.id === id);
  }, [courses]);

  const getCoursesByCategory = useCallback((category: string): Course[] => {
    return courses.filter(course => course.category === category);
  }, [courses]);

  const getCategories = useCallback((isFemale: boolean): string[] => {
    const allCategories = Array.from(new Set(courses.map(c => c.category)));
    
    if (isFemale) {
      return allCategories.filter(cat => 
        cat.includes('Mujeres') || 
        cat === 'Ganancia de Fuerza' || 
        cat === 'Powerlifting'
      );
    }
    
    return allCategories.filter(cat => !cat.includes('Mujeres'));
  }, [courses]);

  const refreshCourses = useCallback(() => fetchCourses(true), [fetchCourses]);

  return (
    <CoursesContext.Provider value={{
      courses,
      loading,
      error,
      getCourseById,
      getCoursesByCategory,
      getCategories,
      refreshCourses,
    }}>
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CoursesContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CoursesProvider');
  }
  return context;
}
