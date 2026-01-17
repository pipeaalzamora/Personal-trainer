"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Course } from "@/hooks/useCourses";

interface CourseCardProps {
  course: Course;
  isFemale: boolean;
}

export function CourseCard({ course, isFemale }: CourseCardProps) {
  // Obtener la imagen correcta según el género
  const getCorrectImage = () => {
    if (isFemale && course.imageFemale) {
      return typeof course.imageFemale === "string"
        ? course.imageFemale
        : course.imageFemale.src;
    }
    return typeof course.image === "string" ? course.image : course.image.src;
  };

  // Verificar si el curso debe mostrar "Próximamente"
  const isComingSoon = () => {
    const category = course.category?.toLowerCase() || "";
    
    // Categorías que siempre muestran "PRÓXIMAMENTE"
    return category.includes("powerlifting") || category.includes("ganancia de fuerza");
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
        <p className="text-sm mb-2 text-white whitespace-pre-line line-clamp-6">
          {course.description}
        </p>
        <div className="flex justify-between items-center mt-2">
          <p className="font-semibold text-white">
            CLP ${course.price.toLocaleString("es-CL")}
          </p>
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
          <Link href={`/course/${course.id}`} className="w-full">
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
  );
}
