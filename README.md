# Coach Inostroza - Plataforma de Cursos

Plataforma para la venta de cursos de entrenamiento con sistema de pago integrado. Implementada con Next.js, Supabase, Resend y Transbank.

## Configuración del Proyecto

### Requisitos Previos

- Node.js 18 o superior
- NPM o Yarn
- Cuenta en Supabase para la base de datos
- Cuenta en Resend para el envío de correos electrónicos
- Cuenta en Transbank (opcional, para pagos)

### Variables de Entorno

La aplicación requiere ciertas variables de entorno para funcionar correctamente. Debes crear un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# Variables requeridas para Supabase (Base de datos)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-aqui

# Variables para Resend (Email)
RESEND_API_KEY=re_tu_api_key_aqui

# Variables para Transbank (Pagos - opcionales para desarrollo)
TBK_COMMERCE_CODE=tu-codigo-de-comercio
TBK_API_KEY=tu-clave-secreta
TBK_ENVIRONMENT=TEST
```

Puedes copiar el archivo `.env.example` a `.env.local` y completar los valores.

### Obtener las Claves de Supabase

1. Ingresa a tu proyecto en [Supabase](https://app.supabase.com/)
2. Ve a "Project Settings" (Configuración del proyecto)
3. Ve a la pestaña "API"
4. En "Project URL" encontrarás la URL que debes usar como `NEXT_PUBLIC_SUPABASE_URL`
5. En "Project API keys", copia la "anon public" para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

## Estructura del Bucket para Archivos de Cursos

Los archivos Excel de los cursos deben seguir esta estructura en el bucket de Supabase "course-excel":

```
fase 1/
├── categorias/
│   ├── [archivos.xlsx]
├── ganancia-muscular/
│   ├── [archivos.xlsx]
├── [otras-categorias]/
│   ├── [archivos.xlsx]
└── fase 1.xlsx
```

## Solución de Problemas

### Conexión a la Base de Datos

Si tienes problemas de conexión a la base de datos, verifica:

1. Que las variables de entorno estén correctamente configuradas en `.env.local`
2. Que tu proyecto en Supabase esté activo
3. Que las claves API sean correctas

Puedes verificar la conexión accediendo a `/api/check-connection` en tu navegador.

### Envío de Correos

Si los correos no se envían:

1. Verifica la clave API de Resend en `.env.local`
2. Asegúrate de que el dominio esté verificado en Resend

### Procesamiento de Pagos

Si los pagos no se procesan correctamente:

1. Verifica las credenciales de Transbank
2. En ambiente de prueba, usa las tarjetas de prueba proporcionadas por Transbank

## Características

- Catálogo de cursos
- Carrito de compras
- Procesamiento de pagos con Transbank
- Envío automático de archivos por correo electrónico
- Administración de cursos y usuarios

## Arquitectura

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Supabase Storage
- **Email**: Resend
- **Pagos**: Transbank Webpay Plus

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
