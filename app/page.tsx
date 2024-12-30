import Link from 'next/link'
import { courses } from '../lib/courses'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import TrainerProfile from './components/TrainerProfile'
import Image from 'next/image'

export default function Home() {
  const categories = ['Ganancia Muscular', 'Pérdida de Grasa Corporal', 'Ganancia de Fuerza', 'Powerlifting']

  return (
    <div className="container mx-auto px-4 py-8">
           
      <TrainerProfile />

      {categories.map((category) => (
        <div key={category} className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses
              .filter((course) => course.category === category)
              .slice(0, 4)
              .map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader>
                    <Image
                      src={typeof course.image === 'string' ? course.image : course.image.src}
                      alt={course.title}
                      width={600}
                      height={500}
                      className="w-full h-50 object-cover mb-4 rounded-md"
                    />
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">{course.description.substring(0, 100) + '...'}</p>
                    <p className="font-semibold">Precio: ${course.price}</p>
                    <p className="text-sm">Duración: {course.duration}</p>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <Link href={`/course/${course.id}`} passHref>
                      <Button className="w-full">Ver Detalles</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

