"use client"
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { FileText, FileVideo, FileImage, FileAudio, Download, BookOpen } from "lucide-react"

interface Material {
  id: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
  createdAt: string
}

interface CourseDetails {
  id: string
  title: string
  description: string
  category: string
}

export default function CourseContentPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    if (!courseId) return
    
    const fetchCourseAndMaterials = async () => {
      try {
        // Verificar si el usuario tiene acceso al curso
        const accessResponse = await fetch(`/api/my-courses/access?courseId=${courseId}`)
        
        if (!accessResponse.ok) {
          // Si no tiene acceso, mostrar mensaje y redirigir
          setHasAccess(false)
          toast({
            title: "Acceso denegado",
            description: "No tienes acceso a este curso",
            variant: "destructive",
          })
          router.push('/my-courses')
          return
        }
        
        setHasAccess(true)
        
        // Obtener detalles del curso
        const courseResponse = await fetch(`/api/courses/${courseId}`)
        if (!courseResponse.ok) {
          throw new Error('No se pudo cargar el curso')
        }
        const courseData = await courseResponse.json()
        setCourse(courseData)
        
        // Obtener materiales del curso
        const materialsResponse = await fetch(`/api/courses/${courseId}/materials`)
        if (!materialsResponse.ok) {
          throw new Error('No se pudieron cargar los materiales')
        }
        const materialsData = await materialsResponse.json()
        setMaterials(materialsData)
      } catch (error) {
        console.error('Error cargando datos:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del curso",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourseAndMaterials()
  }, [courseId, toast, router])
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-6 w-6" />
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className="h-6 w-6" />
    } else if (fileType.startsWith('audio/')) {
      return <FileAudio className="h-6 w-6" />
    } else {
      return <FileText className="h-6 w-6" />
    }
  }
  
  if (!hasAccess) {
    return null // No mostrar nada si no tiene acceso, ya se redirigió
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {course?.title || 'Cargando...'}
        </h1>
        <Button onClick={() => router.push('/my-courses')}>
          Volver a mis cursos
        </Button>
      </div>
      
      {course && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Descripción del curso</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{course.description}</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Materiales del curso</CardTitle>
          <CardDescription>
            Archivos y recursos para tu aprendizaje
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-2" />
              <p>No hay materiales disponibles para este curso.</p>
              <p className="text-sm">Pronto se añadirán nuevos recursos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((material) => (
                <Card key={material.id} className="overflow-hidden">
                  <div className="p-4 flex items-start space-x-4">
                    <div className="bg-gray-100 p-3 rounded">
                      {getFileIcon(material.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{material.title}</h3>
                      {material.description && (
                        <p className="text-sm text-gray-500 mt-1">{material.description}</p>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 flex items-center"
                        onClick={() => window.open(`/api/courses/materials/${material.id}/download`, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 