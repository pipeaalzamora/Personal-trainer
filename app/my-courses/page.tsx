"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from 'next/image'
import Link from 'next/link'

type PurchasedCourse = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  image_url?: string | null;
}

function fallbackImage(course: PurchasedCourse): string {
  const category = (course.category || '').toLowerCase();
  if (category.includes('pérdida') || category.includes('perdida')) return '/perdida1.jpg';
  if (category.includes('fuerza')) return '/fuerza1.jpeg';
  if (category.includes('powerlifting')) return '/power1.jpg';
  return '/ganancia1.jpg';
}

export default function MyCourses() {
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        const response = await fetch('/api/my-courses', {
          credentials: 'include',
        });

        if (response.status === 401) {
          setPurchasedCourses([]);
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudieron cargar tus programas');
        }

        const data = await response.json();
        setPurchasedCourses(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar tus programas');
      } finally {
        setLoading(false);
      }
    };

    loadPurchases();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-8 text-white">Cargando tus programas...</h2>
      </div>
    );
  }

  if (purchasedCourses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-8 text-white">Mis Programas</h2>
        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center py-8">
              {error || 'Aún no tienes programas asociados a esta sesión.'}
            </p>
            <Link href="/">
              <Button className="w-full">Explorar Programas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8 text-white">Mis Programas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchasedCourses.map((course) => (
          <Card key={course.id} className="bg-gradient-to-b from-red-500 to-black">
            <CardHeader>
              <div className="relative w-full aspect-video mb-4">
                <Image
                  src={course.image_url || fallbackImage(course)}
                  alt={course.title}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
              <CardTitle className="text-white">{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-200">
              <p className="mb-2 line-clamp-2">{course.description}</p>
              {course.category && <p className="text-sm">{course.category}</p>}
            </CardContent>
            <CardFooter>
              <Link href={`/my-courses/${course.id}`} className="w-full">
                <Button className="w-full">Acceder al Programa</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
