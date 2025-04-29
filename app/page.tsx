"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { courses, Course } from '../lib/courses'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import TrainerProfile from './components/TrainerProfile'
import Image from 'next/image'
import GenderSelectionModal from '@/components/GenderSelectionModal'

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

  // Función para obtener la imagen correcta según el género
  const getCorrectImage = (course: Course) => {
    if (isFemale && course.imageFemale) {
      return typeof course.imageFemale === 'string' ? course.imageFemale : course.imageFemale.src;
    }
    return typeof course.image === 'string' ? course.image : course.image.src;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <GenderSelectionModal onGenderSelect={handleGenderSelect} />
      
      <TrainerProfile />

      {categories.map((category) => (
        <div key={category} className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-white">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses
              .filter((course) => course.category === category)
              .slice(0, 4)
              .map((course) => (
                <Card key={course.id} className="flex flex-col bg-gradient-to-b from-red-500 to-black">
                  <CardHeader className=" text-white">
                    <Image
                      src={getCorrectImage(course)}
                      alt={course.title}
                      width={600}
                      height={500}
                      className="w-full h-50 object-cover mb-4 rounded-md"
                    />
                    <CardTitle className="text-lg text-white">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm  mb-2 text-white">{course.description.substring(0, 100) + '...'}</p>
                    <p className="font-semibold text-white">Precio: ${course.price}</p>
                    <p className="text-sm text-white">Duración: {course.duration}</p>
                  </CardContent>
                  <CardFooter className="mt-auto ">
                    <Link href={`/course/${course.id}`} passHref>
                      <Button className="w-full">Ver Detalles</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

