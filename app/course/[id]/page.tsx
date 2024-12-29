"use client"
import { courses } from '../../../lib/courses';
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



export default function CoursePage({ params }: { params: { id: string } }) {
  const course = courses.find(c => c.id === params.id)

  if (!course) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Image
            src={course.image}
            alt={course.title}
            width={200} // Agrega un ancho
            height={300} // Agrega una altura, ajusta según tus necesidades
            className="w-full h-64 object-cover mb-4 rounded-md"
          />
          <CardTitle className="text-3xl font-bold">
            {course.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{course.description}</p>
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