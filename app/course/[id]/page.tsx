"use client";

import AddToCartButton from "../../components/AddToCartButton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCourses, Course } from "@/hooks/useCourses";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CoursePage({ params }: { params: { id: string } }) {
  const { courses, loading, getCourseById } = useCourses();
  const [isFemale, setIsFemale] = useState<boolean>(false);
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [searchComplete, setSearchComplete] = useState(false);

  useEffect(() => {
    const storedGender = localStorage.getItem("selectedGender");
    setIsFemale(storedGender === "female");
  }, []);

  useEffect(() => {
    if (!loading && courses.length > 0) {
      const foundCourse = getCourseById(params.id);
      setCourse(foundCourse);
      setSearchComplete(true);
    }
  }, [loading, courses, params.id, getCourseById]);

  // Loading state
  if (loading || !searchComplete) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-red-500 animate-spin mb-4" />
        <p className="text-white text-lg">Cargando programa...</p>
      </div>
    );
  }

  // Not found - mostrar página amigable en lugar de 404
  if (searchComplete && !course) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Programa no encontrado</h1>
        <p className="text-gray-300 mb-6">El programa que buscas no existe o ha sido eliminado.</p>
        <Link href="/">
          <Button className="bg-red-600 hover:bg-red-700">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  if (!course) return null;

  // Obtener la imagen correcta según el género
  const getCorrectImage = () => {
    if (isFemale && course.imageFemale) {
      return typeof course.imageFemale === "string"
        ? course.imageFemale
        : course.imageFemale.src;
    }
    return typeof course.image === "string" ? course.image : course.image.src;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Image
            src={getCorrectImage()}
            alt={course.title}
            width={500}
            height={400}
            className="w-full h-50 object-cover mb-4 rounded-md"
          />
          <CardTitle className="text-3xl font-bold">{course.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 whitespace-pre-line">{course.description}</p>
          
          {/* Sección: ¿Qué incluye este programa? */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold mb-3 text-gray-800">¿Qué incluye este programa?</h3>
            <p className="text-gray-700 mb-3">
              Archivo descargable en formato Excel, diseñado para guiarte paso a paso en tu proceso de entrenamiento.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">Hoja 1:</span>
                <span>Introducción con el objetivo del programa e instrucciones claras para su uso.</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">Hoja 2:</span>
                <span>Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales.</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">Hoja 3:</span>
                <span>Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta.</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">Hoja 4:</span>
                <span>Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos.</span>
              </li>
            </ul>
          </div>

          <p className="font-semibold text-xl mb-2">
            Precio: CLP ${course.price.toLocaleString("es-CL")}
          </p>
          <p className="mb-2">Duración: {course.duration}</p>
        </CardContent>
        <CardFooter>
          <AddToCartButton course={course} />
        </CardFooter>
      </Card>
    </div>
  );
}
