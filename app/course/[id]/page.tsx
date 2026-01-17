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
        <p className="text-white text-lg">Cargando curso...</p>
      </div>
    );
  }

  // Not found - mostrar página amigable en lugar de 404
  if (searchComplete && !course) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Curso no encontrado</h1>
        <p className="text-gray-300 mb-6">El curso que buscas no existe o ha sido eliminado.</p>
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
