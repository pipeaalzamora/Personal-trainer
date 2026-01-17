"use client"

import { useState, useEffect } from 'react'
import { useCourses } from '@/hooks/useCourses'
import TrainerProfile from './components/TrainerProfile'
import GenderSelectionModal from '@/components/GenderSelectionModal'
import { CourseCategory } from '@/components/courses/CourseCategory'
import { Loader2 } from 'lucide-react'

// Categorías base para hombres
const MALE_CATEGORIES = [
  'Ganancia Muscular',
  'Pérdida de Grasa Corporal', 
  'Ganancia de Fuerza'
];

// Categorías para mujeres
const FEMALE_CATEGORIES = [
  'Ganancia Muscular Mujeres',
  'Pérdida de Grasa Corporal Mujeres',
  'Ganancia de Fuerza'
];

export default function Home() {
  const { courses, loading, error, getCoursesByCategory } = useCourses();
  const [isFemale, setIsFemale] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Cargar preferencia de género al iniciar
  useEffect(() => {
    const storedGender = localStorage.getItem('selectedGender');
    setIsFemale(storedGender === 'female');
    setIsInitialized(true);
  }, []);

  const handleGenderSelect = (gender: 'male' | 'female') => {
    setIsFemale(gender === 'female');
  };

  // Obtener categorías según género
  const displayCategories = isFemale ? FEMALE_CATEGORIES : MALE_CATEGORIES;

  // Generar ID para secciones
  const getCategoryId = (category: string) => {
    return category
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  };

  // Loading state
  if (loading || !isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-red-500 animate-spin mb-4" />
        <p className="text-white text-lg">Cargando programas...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-500 text-lg mb-4">Error al cargar los programas</p>
        <p className="text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GenderSelectionModal onGenderSelect={handleGenderSelect} />
      
      <TrainerProfile />

      {displayCategories.map((category) => {
        const filteredCourses = getCoursesByCategory(category);
        
        // No mostrar categorías vacías
        if (filteredCourses.length === 0) return null;
        
        return (
          <CourseCategory
            key={category}
            title={category}
            id={getCategoryId(category)}
            courses={filteredCourses}
            isFemale={isFemale}
          />
        );
      })}
    </div>
  );
}
