"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Course } from '@/lib/courses'
import Image from 'next/image'
import Link from 'next/link'

export default function MyCourses() {
  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // En un caso real, esto vendría de tu API después de autenticación
    // Por ahora simularemos esto con localStorage
    const loadPurchases = () => {
      try {
        // Simular carga de cursos comprados
        // En producción, esto sería una llamada a tu API
        const purchases = localStorage.getItem('tbk_purchases');
        
        if (purchases) {
          setPurchasedCourses(JSON.parse(purchases));
        } else {
          // Para demostración, mostraremos el último carrito comprado
          const lastCart = localStorage.getItem('tbk_cart');
          if (lastCart) {
            setPurchasedCourses(JSON.parse(lastCart));
            // Guardarlo como compras para futura referencia
            localStorage.setItem('tbk_purchases', lastCart);
          }
        }
      } catch (error) {
        console.error('Error al cargar los cursos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPurchases();
  }, []);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-8 text-white">Cargando tus cursos...</h2>
      </div>
    );
  }
  
  if (purchasedCourses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-8 text-white">Mis Cursos</h2>
        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-6">
            <p className="text-center py-8">Aún no has comprado ningún curso.</p>
            <Link href="/">
              <Button className="w-full">Explorar Cursos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8 text-white">Mis Cursos</h2>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchasedCourses.map((course) => (
          <Card key={course.id} className="bg-gradient-to-b from-red-500 to-black">
            <CardHeader>
              <div className="relative w-full aspect-video mb-4">
                  <Image
                  src={typeof course.image === 'string' ? course.image : course.image.src}
                    alt={course.title}
                    fill
                  className="object-cover rounded-md"
                />
              </div>
              <CardTitle className="text-white">{course.title}</CardTitle>
              </CardHeader>
            <CardContent className="text-gray-200">
              <p className="mb-2 line-clamp-2">{course.description}</p>
              <p className="text-sm">Duración: {course.duration}</p>
              </CardContent>
            <CardFooter>
              <Button className="w-full">Acceder al Curso</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
    </div>
  );
} 