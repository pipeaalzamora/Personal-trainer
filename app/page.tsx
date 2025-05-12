"use client"

import { useState, useEffect } from 'react'
import { courses } from '@/lib/courses'
import TrainerProfile from './components/TrainerProfile'
import GenderSelectionModal from '@/components/GenderSelectionModal'
import { CourseCategory } from '@/components/courses/CourseCategory'

// Mapeo de categorías masculinas a femeninas
const FEMALE_CATEGORY_MAPPING = {
  'Ganancia Muscular': 'Ganancia Muscular Mujeres',
  'Pérdida de Grasa Corporal': 'Pérdida de Grasa Corporal Mujeres'
};

export default function Home() {
  const allCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal', 'Ganancia de Fuerza', 'Powerlifting']
  const femaleCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal']
  
  const [categories, setCategories] = useState<string[]>(allCategories)
  const [displayCategories, setDisplayCategories] = useState<string[]>(allCategories)
  const [isFemale, setIsFemale] = useState<boolean>(false)
  
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

