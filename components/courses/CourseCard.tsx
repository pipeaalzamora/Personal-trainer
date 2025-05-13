"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Course } from '@/lib/courses'

interface CourseCardProps {
  course: Course
  isFemale: boolean
}

export function CourseCard({ course, isFemale }: CourseCardProps) {
  // Función para obtener la imagen correcta según el género
  const getCorrectImage = () => {
    if (isFemale && course.imageFemale) {
      return typeof course.imageFemale === 'string' ? course.imageFemale : course.imageFemale.src;
    }
    return typeof course.image === 'string' ? course.image : course.image.src;
  };

  // Función para verificar si el curso debe mostrar "Próximamente"
  const isComingSoon = () => {
    // Verificar si existe un parámetro especial en la URL para acceso especial
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('acceso') === 'preview2025') {
        return false;
      }
    }
    
    // Categorías que siempre mostrarán "PRÓXIMAMENTE" incluso después del lanzamiento
    const category = course.category?.toLowerCase() || '';
    const alwaysComingSoon = category.includes('powerlifting') || 
                             category.includes('ganancia de fuerza');
    
    // Si es una categoría que siempre está en "PRÓXIMAMENTE", retornar true
    if (alwaysComingSoon) {
      return true;
    }
    
    // Verificar si ya pasó la fecha de lanzamiento
    if (typeof window !== 'undefined') {
      const launchDate = new Date('2023-05-13T10:00:00');
      // Si ya pasó la fecha de lanzamiento, Ganancia Muscular ya no muestra "PRÓXIMAMENTE"
      if (new Date() >= launchDate) {
        return false;
      }
    }
    
    // Antes del lanzamiento, Ganancia Muscular también muestra "PRÓXIMAMENTE"
    return category.includes('ganancia-muscular');
  };

  // Función para obtener el ID correcto según el género
  const getCourseId = () => {
    // Si no es mujer, devolver el ID normal
    if (!isFemale) {
      return course.id;
    }
    
    // Mapeo de IDs de cursos masculinos a femeninos
    const maleToFemaleIdMap: Record<string, string> = {
      // Ganancia Muscular (1-4) -> Ganancia Muscular Mujeres (17-20)
      "1": "17", // Fase I
      "2": "18", // Fase II
      "3": "19", // Fase III
      "4": "20", // Pack Completo
      
      // Pérdida de Grasa Corporal (5-8) -> Pérdida de Grasa Corporal Mujeres (21-24)
      "5": "21", // Fase I
      "6": "22", // Fase II
      "7": "23", // Fase III
      "8": "24", // Pack Completo
      
      // UUIDs específicos (según el log que mostraste)
      "34b2f118-7e26-4b7b-8a6e-f068b3fa0493": "17", // Fase I: Iniciación -> Fase I: Iniciación Mujeres
    };
    
    // Si el curso actual es de una categoría para mujeres, usar el ID directamente
    if (course.category.includes("Mujeres")) {
      return course.id;
    }
    
    // Si hay un mapeo para este ID, usarlo
    if (maleToFemaleIdMap[course.id]) {
      return maleToFemaleIdMap[course.id];
    }
    
    // Si no hay mapeo, devolver el ID original
    return course.id;
  };

  return (
    <Card className="flex flex-col bg-gradient-to-b from-red-500 to-black h-full transition-transform hover:scale-105 relative">
      <CardHeader className="text-white">
        <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-md">
          <Image
            src={getCorrectImage()}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
        <CardTitle className="text-lg text-white">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm mb-2 text-white line-clamp-3">{course.description}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="font-semibold text-white">CLP ${course.price.toLocaleString('es-CL')}</p>
          <p className="text-sm text-white">{course.duration}</p>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4">
        {isComingSoon() ? (
          <Button 
            className="w-full bg-gray-500 hover:bg-gray-500 transition-colors cursor-not-allowed opacity-70"
            disabled
          >
            PRÓXIMAMENTE
          </Button>
        ) : (
          <Link href={`/course/${getCourseId()}`} className="w-full">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700 transition-colors"
              aria-label={`Ver detalles de ${course.title}`}
            >
              Ver Detalles
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
} 