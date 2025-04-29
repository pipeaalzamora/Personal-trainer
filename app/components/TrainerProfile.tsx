import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import perfil from "@/public/perfil.jpeg"
import Image from "next/image";
import Link from "next/link";
import { Instagram } from 'lucide-react'

export default function TrainerProfile() {
  return (
    <Card className="mb-8 shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-500 to-black p-4">
        <CardTitle className="text-3xl font-extrabold text-white">
          Conoce a tu Entrenador
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center p-6  bg-gradient-to-r from-red-500 to-black">
      <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-6">
        <Image
          src={perfil.src}
          alt="Foto del entrenador"
          width={400}
          height={600}
          className="w-80 h-80 object-cover rounded-full mb-4 md:mb-0 md:mr-5 shadow-md border-white border-4 hover:border-black"
        />
         <Link 
            href="https://www.instagram.com/coach_inostroza10/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center mt-4 text-white hover:text-blue-800"
          >
            <Instagram className="w-5 h-5 mr-2" />
            <span>@coach_inostroza</span>
          </Link>
        </div>
        <div className="text-white">
          <h3 className="text-2xl font-semibold mb-2">David Inostroza Devia</h3>
          <p className="mb-4">
            Soy David Inostroza Devia, preparador físico especializado en
            ganancia muscular, ganancia de fuerza y definición. Me apasiona
            acompañar a mis alumnos en su camino hacia el logro de sus
            objetivos, ofreciendo un entrenamiento personalizado y centrado en
            sus necesidades. Mi misión es que cada persona alcance su máximo
            potencial físico en un ambiente motivador y seguro.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li className="font-medium">Actitud y enfoque:</li>
            <li>Me caracterizo por ser comprometido y dedicado, siempre preocupado por el progreso de mis alumnos. Creo en la importancia de la constancia y el esfuerzo como pilares fundamentales para alcanzar resultados sostenibles.</li>
            <li className="font-medium">Logros:</li>
            <ul className="list-disc list-inside pl-5">
              <li>Presidente del club deportivo de powerlifting Viking Lifters.</li>
              <li>Más de 50 alumnos satisfechos con resultados logrados en fuerza, ganancia muscular, definición y rendimiento físico.</li>
              <li>Incremento del rendimiento físico en mis alumnos, diseñando estrategias personalizadas según sus metas.</li>
            </ul>
            <li className="font-medium">Cursos y certificaciones:</li>
            <ul className="list-disc list-inside pl-5">
              <li>Preparador físico certificado.</li>
              <li>Certificación en Evaluación Antropométrica.</li>
              <li>Certificación en Evaluación de Test Físicos.</li>
              <li>Certificación en Ganancia Muscular y Fuerza.</li>
              <li>Certificación en Entrenamiento Funcional.</li>
              <li>Certificación en Diseño del Plan del Entrenamiento.</li>
              <li>Certificación en Nutrición Básica.</li>
              <li>Certificado de Entrenamiento fisico en poblaciones especiales</li>
              <li>Certificado de gestión de proyectos en actividad física</li>
              <li>Especialización en Mejoramiento de las Condiciones Físicas del Alumno.</li>
            </ul>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
