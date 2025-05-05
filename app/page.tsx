"use client"

import { useState, useEffect } from 'react'
import { courses } from '@/lib/courses'
import TrainerProfile from './components/TrainerProfile'
import GenderSelectionModal from '@/components/GenderSelectionModal'
import { CourseCategory } from '@/components/courses/CourseCategory'

export default function Home() {
  const allCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal', 'Ganancia de Fuerza', 'Powerlifting']
  const femaleCategories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal']
  
  const [categories, setCategories] = useState<string[]>(allCategories)
  const [isFemale, setIsFemale] = useState<boolean>(false)
  
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

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <GenderSelectionModal onGenderSelect={handleGenderSelect} />
      
      <TrainerProfile />

      {categories.map((category) => (
          <CourseCategory
            key={category}
            title={category}
            id={getCategoryId(category)}
            courses={courses.filter((course) => course.category === category)}
            isFemale={isFemale}
          />
              ))}
          </div>
    </>
  )
}

