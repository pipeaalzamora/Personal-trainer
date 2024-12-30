import type { StaticImageData } from 'next/image';

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  image: string | StaticImageData;
  category: string;
}
import ganancia1 from "@/public/ganancia1.jpg"
import ganancia3 from "@/public/ganancia3.jpg"
import fuerza1 from "@/public/fuerza1.jpeg"
import fuerza2 from "@/public/fuerza2.jpeg"
import fuerza3 from "@/public/fuerza3.jpg"
import perdida2 from "@/public/perdida2.jpg"
import perdida3 from "@/public/perdida3.jpg"
import power1 from "@/public/power1.jpg"
import porwer2 from "@/public/power2.jpeg"
import power3 from "@/public/power3.jpg"


export const courses: Course[] = [
  {
    id: "1",
    title: "Fase I: Iniciación",
    description:
      "Esta fase está diseñada para crear una adaptación al entrenamiento, centrada en movimientos fundamentales y desarrollo de una base sólida de fuerza. Se trabajará en la correcta ejecución de ejercicios y en aumentar la resistencia muscular general.",
    price: 20.00,
    duration: "4 semanas",
    image: ganancia1,
    category: "Ganancia Muscular",
  },
  {
    id: "2",
    title: "Fase II: Progresión",
    description:
      "En esta fase se implementarán ejercicios más avanzados y métodos de entrenamiento complejos que desafiarán tus músculos y acelerarán el crecimiento. La intensidad aumentará progresivamente para mejorar la hipertrofia y la fuerza muscular.",
    price: 20.00,
    duration: "4 semanas",
    image: "/placeholder.svg?height=200&width=300",
    category: "Ganancia Muscular",
  },
  {
    id: "3",
    title: "Fase III: Maestría",
    description:
      "Esta fase es el reto definitivo, donde pondrás a prueba todo tu potencial. Aquí, superarás tus límites con técnicas avanzadas y entrenamientos de alto volumen e intensidad. ¡Solo los más comprometidos logran el éxito total! Prepárate para una transformación épica en tu físico.",
    price: 25.00,
    duration: "5 semanas",
    image: ganancia3,
    category: "Ganancia Muscular",
  },
  {
    id: "4",
    title: "Fase I: Preparación",
    description:
      "En esta fase, iniciaremos el proceso con ejercicios funcionales y trabajo cardiovascular moderado, ayudando a tu cuerpo a adaptarse al régimen de entrenamiento y comenzando la quema de grasa de manera efectiva. Crearemos la base para resultados sostenibles.",
    price: 20.00,
    duration: "4 semanas",
    image: "/placeholder.svg?height=200&width=300",
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "5",
    title: "Fase II: Construcción",
    description:
      "En esta fase, se intensificarán las rutinas al combinar fuerza y cardio, lo que acelerará la quema de grasa mientras mantienes tu masa muscular. Con una dieta adecuada, construirás un cuerpo más tonificado y definido.",
    price: 20.00,
    duration: "6 semanas",
    image: perdida2,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "6",
    title: "Fase III: Potenciación",
    description:
      "¡La fase definitiva! Aquí trabajaremos con entrenamientos de alta intensidad y técnicas avanzadas para maximizar la pérdida de grasa y definir tu cuerpo. Esta es la fase donde alcanzarás tus metas de definición total y mejor forma física. ¡Estás a punto de transformar tu cuerpo!",
    price: 20.00,
    duration: "4 semanas",
    image: perdida3,
    category: "Pérdida de Grasa Corporal",
  },
  {
    id: "7",
    title: "Fase I: Despegue",
    description:
      "En esta fase sentarás las bases para ganar fuerza con ejercicios fundamentales que mejorarán tu técnica y preparación general. Se enfocará en mejorar la eficiencia de los movimientos básicos y desarrollar fuerza funcional.",
    price: 20.00,
    duration: "4 semanas",
    image: fuerza1,
    category: "Ganancia de Fuerza",
  },
  {
    id: "8",
    title: "Fase II: Impulso",
    description: "Ahora comenzamos a intensificar el trabajo con cargas progresivas y variaciones de ejercicios más desafiantes para seguir incrementando tu fuerza. En esta fase, mejorarás tu rendimiento en los principales levantamientos como sentadillas, peso muerto y press de banca.",
    price: 20.00,
    duration: "4 semanas",
    image: fuerza2,
    category: "Ganancia de Fuerza",
  },
  {
    id: "9",
    title: "Fase III: Dominio",
    description:
      "La fase de máxima intensidad y técnica refinada. Aquí, aplicarás lo aprendido para romper tus récords personales, enfrentando cargas mucho más altas y utilizando métodos avanzados de entrenamiento. ¡Prepárate para dominar tus levantamientos y elevar tu fuerza a niveles impresionantes!",
    price: 25.00,
    duration: "5 semanas",
    image: fuerza3,
    category: "Ganancia de Fuerza",
  },
  {
    id: "10",
    title: "Fase I: Base",
    description:
      "En esta fase, estableceremos una base sólida para los tres levantamientos clave: sentadilla, press de banca y peso muerto. Te enfocarás en la técnica adecuada, fuerza general y movilidad para preparar tu cuerpo para cargas más pesadas.",
    price: 20.00,
    duration: "4 semanas",
    image: power1,
    category: "Powerlifting",
  },
  {
    id: "11",
    title: "Fase II: Crecimiento",
    description: "Ahora que tienes la base, comenzaremos a aumentar las cargas progresivamente y a perfeccionar tu técnica. Trabajaremos en mejorar la eficiencia de tus levantamientos y en aumentar la fuerza para maximizar tu rendimiento en cada uno de ellos.",
    price: 20.00,
    duration: "4 semanas",
    image: porwer2,
    category: "Powerlifting",
  },
  {
    id: "12",
    title: "Fase III: Élite",
    description:
      "Esta fase es para aquellos que quieren convertirse en auténticos campeones del powerlifting. Trabajarás en levantar tus máximos históricos con métodos avanzados, periodización y estrategias específicas para competencias. ¡Es hora de alcanzar el nivel de élite y dominar los levantamientos!",
    price: 25.00,
    duration: "5 semanas",
    image: power3,
    category: "Powerlifting",
  },
];
