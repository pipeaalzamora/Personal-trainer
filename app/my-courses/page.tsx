"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { BookOpen } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  price: number
  category: string
  image: string
}

export default function MyCoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  
  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const response = await fetch('/api/my-courses')
        
        if (response.status === 401) {
          toast({
            title: "Acceso denegado",
            description: "Debes iniciar sesión para ver tus cursos",
            variant: "destructive",
          })
          // En una implementación real, redirigirías a la página de login
          return
        }
        
        if (!response.ok) {
          throw new Error('Error al cargar los cursos')
        }
        
        const data = await response.json()
        setCourses(data)
      } catch (error) {
        console.error('Error cargando cursos:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar tus cursos",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMyCourses()
  }, [toast])
  
  return (
    <div className="container mx-auto px-4 text-white py-8">
      <h1 className="text-3xl font-bold mb-6">Mis Cursos</h1>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 ">
          <BookOpen className="h-16 w-16 mx-auto mb-4 " />
          <h2 className="text-xl font-medium mb-2">No tienes cursos todavía</h2>
          <p className=" mb-6">Explora nuestro catálogo y compra tu primer curso</p>
          <Button onClick={() => router.push('/')}>Ver cursos disponibles</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden">
              <div className="relative h-48 w-full">
                {course.image && (
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {course.category}
                  </span>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-3">{course.description}</p>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button 
                  onClick={() => router.push(`/my-courses/${course.id}`)}
                  className="w-full"
                >
                  Ver contenido
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 