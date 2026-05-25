"use client"
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { FileText, Download, BookOpen } from "lucide-react"

interface CourseFile {
  index: number
  filename: string
  downloadUrl: string
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
  const [courseFiles, setCourseFiles] = useState<CourseFile[]>([])
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
        
        // Obtener archivos del curso desde el bucket course-excel
        const filesResponse = await fetch(`/api/courses/excel/${courseId}?metadata=1`)
        if (filesResponse.ok) {
          const filesData = await filesResponse.json()
          setCourseFiles(Array.isArray(filesData.files) ? filesData.files : [])
        } else if (filesResponse.status !== 404) {
          throw new Error('No se pudieron cargar los archivos del programa')
        }
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
          <CardTitle>Archivos del programa</CardTitle>
          <CardDescription>
            Descarga los archivos asociados a tu compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : courseFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-2" />
              <p>No hay archivos disponibles para este programa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseFiles.map((file) => (
                <Card key={`${file.index}-${file.filename}`} className="overflow-hidden">
                  <div className="p-4 flex items-start space-x-4">
                    <div className="bg-gray-100 p-3 rounded">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium break-words">{file.filename}</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 flex items-center"
                        onClick={() => window.open(file.downloadUrl, '_blank')}
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
