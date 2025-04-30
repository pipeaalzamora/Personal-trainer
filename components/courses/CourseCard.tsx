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

  return (
    <Card className="flex flex-col bg-gradient-to-b from-red-500 to-black h-full transition-transform hover:scale-105">
      <CardHeader className="text-white">
        <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-md">
          <Image
            src={getCorrectImage()}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
          />
        </div>
        <CardTitle className="text-lg text-white">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm mb-2 text-white line-clamp-3">{course.description}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="font-semibold text-white">${course.price.toFixed(2)}</p>
          <p className="text-sm text-white">{course.duration}</p>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4">
        <Link href={`/course/${course.id}`} className="w-full">
          <Button 
            className="w-full bg-red-600 hover:bg-red-700 transition-colors"
            aria-label={`Ver detalles de ${course.title}`}
          >
            Ver Detalles
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
} 