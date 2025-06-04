import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import perfil from "@/public/perfil.jpeg";
import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

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
          <ul className="list-disc list-inside space-y-2">
            <li>
              Preparador fisico certificado especializado en ganancia muscular,
              ganancia de fuerza y perdida de grasa corporal.
            </li>
            <li className="font-medium">
              Más de 100 alumnos con resultados comprobados.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
