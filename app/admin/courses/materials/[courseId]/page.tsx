"use client"
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Upload, FilePlus, Trash2, FileText, FileVideo, FileImage, FileAudio, Download } from "lucide-react"

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

export default function CourseMaterialsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  useEffect(() => {
    if (!courseId) return
    
    const fetchCourseAndMaterials = async () => {
      try {
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
  }, [courseId, toast])
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }
  
  const uploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo",
        variant: "destructive",
      })
      return
    }
    
    if (!title) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un título para el material",
        variant: "destructive",
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // Primero, obtenemos una URL prefirmada para subir el archivo a S3
      const uploadUrlResponse = await fetch('/api/courses/materials/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          fileName: file.name,
          contentType: file.type,
        }),
      })
      
      if (!uploadUrlResponse.ok) {
        throw new Error('Error al obtener la URL de carga')
      }
      
      const { uploadUrl, key } = await uploadUrlResponse.json()
      
      // Subir el archivo a S3 usando la URL prefirmada
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo')
      }
      
      // Registrar el material en la base de datos
      const createMaterialResponse = await fetch('/api/courses/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          title,
          description,
          fileUrl: key,
          fileType: file.type,
        }),
      })
      
      if (!createMaterialResponse.ok) {
        throw new Error('Error al registrar el material')
      }
      
      const newMaterial = await createMaterialResponse.json()
      
      // Actualizar la lista de materiales
      setMaterials([...materials, newMaterial])
      
      // Limpiar el formulario
      setTitle('')
      setDescription('')
      setFile(null)
      
      toast({
        title: "Material subido",
        description: "El material se ha subido correctamente",
      })
    } catch (error) {
      console.error('Error al subir material:', error)
      toast({
        title: "Error",
        description: "No se pudo subir el material",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  const deleteMaterial = async (materialId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este material?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/courses/materials/${materialId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar el material')
      }
      
      // Actualizar la lista de materiales
      setMaterials(materials.filter(m => m.id !== materialId))
      
      toast({
        title: "Material eliminado",
        description: "El material se ha eliminado correctamente",
      })
    } catch (error) {
      console.error('Error al eliminar material:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el material",
        variant: "destructive",
      })
    }
  }
  
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Materiales del Curso: {course?.title || 'Cargando...'}
        </h1>
        <Button onClick={() => router.push('/admin/courses')}>
          Volver a cursos
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Materiales del curso</CardTitle>
              <CardDescription>
                Todos los archivos disponibles para este curso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FilePlus className="h-12 w-12 mx-auto mb-2" />
                  <p>No hay materiales disponibles para este curso.</p>
                  <p className="text-sm">Utiliza el formulario para agregar materiales.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-gray-500">
                          {getFileIcon(material.fileType)}
                        </span>
                        <div>
                          <h3 className="font-medium">{material.title}</h3>
                          {material.description && (
                            <p className="text-sm text-gray-500">{material.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/api/courses/materials/${material.id}/download`, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMaterial(material.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Subir nuevo material</CardTitle>
              <CardDescription>
                Añade archivos para el curso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={uploadMaterial} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nombre del material"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción opcional"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo</Label>
                  <div className="border border-dashed rounded-lg p-6 text-center">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="file" className="cursor-pointer block">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm font-medium block mb-1">
                        {file ? file.name : 'Seleccionar archivo'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {file
                          ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                          : 'PDF, videos, imágenes, etc.'}
                      </span>
                    </Label>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUploading || !file}
                >
                  {isUploading ? 'Subiendo...' : 'Subir material'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 