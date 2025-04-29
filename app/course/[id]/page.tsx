"use client"
import { courses, Course } from '../../../lib/courses';
import { notFound } from 'next/navigation';
import AddToCartButton from '../../components/AddToCartButton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function CoursePage({ params }: { params: { id: string } }) {
  const course = courses.find(c => c.id === params.id)
  const [isFemale, setIsFemale] = useState<boolean>(false);

  useEffect(() => {
    const storedGender = localStorage.getItem('selectedGender');
    if (storedGender === 'female') {
      setIsFemale(true);
    } else {
      setIsFemale(false);
    }
  }, []);

  if (!course) {
    notFound()
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Image
            src={getCorrectImage(course)}
            alt={course.title}
            width={500}
            height={400}
            className="w-full h-50 object-cover mb-4 rounded-md"
          />
          <CardTitle className="text-3xl font-bold">
            {course.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{course.description}</p>
          <p className="font-semibold text-xl mb-2">
            Precio: ${course.price}
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