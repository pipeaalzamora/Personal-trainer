"use client"

import { useState, useEffect } from 'react'
import { courses } from '@/lib/courses'
import TrainerProfile from './components/TrainerProfile'
import GenderSelectionModal from '@/components/GenderSelectionModal'
import { CourseCategory } from '@/components/courses/CourseCategory'
import Image from 'next/image'
import logoImage from '@/public/logo.png'

// Mapeo de categorías masculinas a femeninas
const FEMALE_CATEGORY_MAPPING = {
  'Ganancia Muscular': 'Ganancia Muscular Mujeres',
  'Pérdida de Grasa Corporal': 'Pérdida de Grasa Corporal Mujeres'
};

// Fecha de lanzamiento - ajustar a la fecha real deseada
const LAUNCH_DATE = new Date('2023-05-13T10:00:00'); // Fecha pasada para que la página esté lanzada

export default function Home() {
  const allCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal', 'Ganancia de Fuerza', 'Powerlifting']
  const femaleCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal']
  
  const [categories, setCategories] = useState<string[]>(allCategories)
  const [displayCategories, setDisplayCategories] = useState<string[]>(allCategories)
  const [isFemale, setIsFemale] = useState<boolean>(false)
  const [showContent, setShowContent] = useState<boolean>(true)
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  // Verificar si debe mostrar el contenido completo (basado en parámetro URL o fecha)
  // Este efecto ya no es necesario porque showContent es true por defecto
  // pero lo mantenemos por si en el futuro se necesita usar parámetros URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Si hay un parámetro específico, podemos hacer algo con él
      if (urlParams.get('acceso') === 'preview2025') {
        // El contenido ya está visible por defecto
      }
    }
  }, []);
  
  // Este efecto para el countdown ya no es necesario porque la fecha ya pasó
  // Lo eliminamos para evitar cálculos innecesarios
  
  // Actualizar las categorías mostradas cuando cambia isFemale
  useEffect(() => {
    if (isFemale) {
      // Para mujeres, mapear a categorías específicas
      const mappedCategories = categories.map(category => 
        FEMALE_CATEGORY_MAPPING[category as keyof typeof FEMALE_CATEGORY_MAPPING] || category
      );
      setDisplayCategories(mappedCategories);
    } else {
      setDisplayCategories(categories);
    }
  }, [isFemale, categories]);
  
  // Configurar las categorías iniciales basadas en localStorage al cargar
  useEffect(() => {
    const storedGender = localStorage.getItem('selectedGender');
    if (storedGender === 'female') {
      setCategories(femaleCategories);
      setIsFemale(true);
    } else {
      setCategories(allCategories);
      setIsFemale(false);
    }
  }, []);

  const handleGenderSelect = (gender: 'male' | 'female') => {
    if (gender === 'male') {
      setCategories(allCategories)
      setIsFemale(false);
    } else {
      setCategories(femaleCategories)
      setIsFemale(true);
    }
  }

  // Generar IDs para las secciones basados en el nombre de la categoría
  const getCategoryId = (category: string) => {
    return category
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  };

  // Filtrar cursos considerando género
  const filterCoursesByCategory = (category: string) => {
    // Para mujeres, busca cursos que coincidan con la categoría base
    const baseCategory = Object.entries(FEMALE_CATEGORY_MAPPING)
      .find(([_, femaleCategory]) => femaleCategory === category)?.[0] || category;
    
    return courses.filter(course => course.category === baseCategory);
  };

  // Si no se debe mostrar el contenido, mostrar página de "Próximamente"
  if (!showContent) {
    return (
      <div 
        className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-red-600 to-black p-4 text-white z-50"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6 flex justify-center">
            <Image
              src={logoImage}
              alt="Logo Personal Trainer"
              width={200}
              height={200}
              priority
              className="rounded-full border-4 border-white shadow-lg"
            />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">PRÓXIMAMENTE</h1>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8">Estamos trabajando para lanzar nuestra plataforma muy pronto.</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center max-w-md mx-auto mb-6 sm:mb-10">
            <div className="bg-black bg-opacity-40 p-2 sm:p-4 rounded-lg shadow-lg">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{countdown.days}</div>
              <div className="text-xs sm:text-sm uppercase">Días</div>
            </div>
            <div className="bg-black bg-opacity-40 p-2 sm:p-4 rounded-lg shadow-lg">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{countdown.hours}</div>
              <div className="text-xs sm:text-sm uppercase">Horas</div>
            </div>
            <div className="bg-black bg-opacity-40 p-2 sm:p-4 rounded-lg shadow-lg">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{countdown.minutes}</div>
              <div className="text-xs sm:text-sm uppercase">Minutos</div>
            </div>
            <div className="bg-black bg-opacity-40 p-2 sm:p-4 rounded-lg shadow-lg">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{countdown.seconds}</div>
              <div className="text-xs sm:text-sm uppercase">Segundos</div>
            </div>
          </div>
        </div>
        
        {/* CSS para ocultar navbar y footer */}
        <style jsx global>{`
          nav, footer {
            display: none !important;
          }
        `}</style>
      </div>
    );
  }

  // Si se debe mostrar el contenido, mostrar la página normal
  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <GenderSelectionModal onGenderSelect={handleGenderSelect} />
      
      <TrainerProfile />

      {displayCategories.map((displayCategory, index) => {
        // Filtrar cursos basados en la categoría visualizada
        // Si es mujer, mostrar directamente los cursos de categorías femeninas (17-24)
        // Si es hombre, mostrar los cursos de categorías masculinas (1-16)
        const filteredCourses = courses.filter(course => course.category === displayCategory);
        
        return (
          <CourseCategory
            key={displayCategory}
            title={displayCategory}
            id={getCategoryId(displayCategory)}
            courses={filteredCourses}
            isFemale={isFemale}
          />
        );
      })}
    </div>
    </>
  )
}

