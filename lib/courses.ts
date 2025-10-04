import type { StaticImageData } from "next/image";

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  image: string | StaticImageData;
  imageFemale?: string | StaticImageData;
  category: string;
}
import ganancia1 from "@/public/ganancia1.jpg";
import ganancia2 from "@/public/ganancia2.jpg";
import ganancia3 from "@/public/ganancia3.jpg";
import fuerza1 from "@/public/fuerza1.jpeg";
import fuerza2 from "@/public/fuerza2.jpeg";
import fuerza3 from "@/public/fuerza3.jpg";
import perdida1 from "@/public/perdida1.jpg";
import perdida2 from "@/public/perdida2.jpg";
import perdida3 from "@/public/perdida3.jpg";
import power1 from "@/public/power1.jpg";
import porwer2 from "@/public/power2.jpg";
import power3 from "@/public/power3.jpg";
import packfuerza from "@/public/Pack ganancia de fuerza.jpg";
import packmuscular from "@/public/Pack ganancia muscular.png";
import packgrasa from "@/public/pack perdida de grasa corporal.jpg";
import packpower from "@/public/Pack powerlifting.jpeg";

import gananciaM1 from "@/public/Ganancia mujeres 1.jpg";
import gananciaM2 from "@/public/Ganancia mujeres 2.jpg";
import gananciaM3 from "@/public/Ganancia mujeres 3.jpg";
import gananciaM4 from "@/public/Ganancia Mujeres 4.jpg";
import perdidaM1 from "@/public/Perdida mujeres 1.jpg";
import perdidaM2 from "@/public/Perdida mujeres 2.jpg";
import perdidaM3 from "@/public/Perdida mujeres 3.jpg";
import perdidaM4 from "@/public/Perdida mujeres 4.jpg";

export const courses: Course[] = [
  {
    id: "1",
    title: "Fase I: Iniciación",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: ganancia1,
    imageFemale: gananciaM1,
    category: "Ganancia Muscular",
  },
  {
    id: "2",
    title: "Fase II: Progresión",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: ganancia2,
    imageFemale: gananciaM2,
    category: "Ganancia Muscular",
  },
  {
    id: "3",
    title: "Fase III: Maestría",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: ganancia3,
    imageFemale: gananciaM3,
    category: "Ganancia Muscular",
  },
  {
    id: "4",
    title: "Pack Completo: Ganancia Muscular",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: packmuscular,
    imageFemale: gananciaM4,
    category: "Ganancia Muscular",
  },
  {
    id: "5",
    title: "Fase I: Preparación",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: perdida1,
    imageFemale: perdidaM1,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "6",
    title: "Fase II: Construcción",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: perdida2,
    imageFemale: perdidaM2,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "7",
    title: "Fase III: Potenciación",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: perdida3,
    imageFemale: perdidaM3,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "8",
    title: "Pack Completo: Pérdida de Grasa Corporal",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: packgrasa,
    imageFemale: perdidaM4,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "9",
    title: "Fase I: Despegue",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: fuerza1,
    category: "Ganancia de Fuerza",
  },
  {
    id: "10",
    title: "Fase II: Impulso",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: fuerza2,
    category: "Ganancia de Fuerza",
  },
  {
    id: "11",
    title: "Fase III: Dominio",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: fuerza3,
    category: "Ganancia de Fuerza",
  },
  {
    id: "12",
    title: "Pack Completo: Ganancia de Fuerza",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: packfuerza,
    category: "Ganancia de Fuerza",
  },
  {
    id: "13",
    title: "Fase I: Base",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: power1,
    category: "Powerlifting",
  },
  {
    id: "14",
    title: "Fase II: Crecimiento",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: porwer2,
    category: "Powerlifting",
  },
  {
    id: "15",
    title: "Fase III: Élite",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: power3,
    category: "Powerlifting",
  },
  {
    id: "16",
    title: "Pack Completo: Powerlifting)",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: packpower,
    category: "Powerlifting",
  },
  // Cursos específicos para mujeres - Ganancia Muscular
  {
    id: "17",
    title: "Fase I: Iniciación Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: gananciaM1,
    category: "Ganancia Muscular Mujeres",
  },
  {
    id: "18",
    title: "Fase II: Progresión Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: gananciaM2,
    category: "Ganancia Muscular Mujeres",
  },
  {
    id: "19",
    title: "Fase III: Maestría Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: gananciaM3,
    category: "Ganancia Muscular Mujeres",
  },
  {
    id: "20",
    title: "Pack Completo: Ganancia Muscular Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: gananciaM4,
    category: "Ganancia Muscular Mujeres",
  },
  // Cursos específicos para mujeres - Pérdida de Grasa Corporal
  {
    id: "21",
    title: "Fase I: Preparación Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: perdidaM1,
    category: "Pérdida de Grasa Corporal Mujeres",
  },
  {
    id: "22",
    title: "Fase II: Construcción Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "4 semanas",
    image: perdidaM2,
    category: "Pérdida de Grasa Corporal Mujeres",
  },
  {
    id: "23",
    title: "Fase III: Potenciación Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 15000,
    duration: "5 semanas",
    image: perdidaM3,
    category: "Pérdida de Grasa Corporal Mujeres",
  },
  {
    id: "24",
    title: "Pack Completo: Pérdida de Grasa Corporal Mujer",
    description:
      "¿Qué incluye este curso?\n\n✔️ Archivo descargable en formato Excel diseñado para guiarte paso a paso en tu proceso de entrenamiento\n✔️ Hoja 1: Introducción con el objetivo del curso e instrucciones claras para su uso\n✔️ Hoja 2: Glosario + Indicaciones donde se explican los términos, siglas y métodos del programa, junto con las recomendaciones generales\n✔️ Hoja 3: Ejercicios con video que incluye el nombre de cada ejercicio y su respectivo enlace a YouTube para ver la ejecución correcta\n✔️ Hoja 4: Plan de entrenamiento completo, organizado por días, con ejercicios detallados, series, repeticiones, tiempos de descanso y métodos específicos",
    price: 30000,
    duration: "13 semanas",
    image: perdidaM4,
    category: "Pérdida de Grasa Corporal Mujeres",
  },
];
