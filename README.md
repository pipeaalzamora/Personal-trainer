# Coach Inostroza - Plataforma de Entrenamiento Personal

Plataforma web para la venta de rutinas de entrenamiento con sistema de pago integrado, diseñada específicamente para el "Coach Inostroza". Implementada con Next.js, Supabase, Resend y Transbank.

## 🚀 Características

- **Catálogo de Rutinas**: Visualización de cursos por categorías: Ganancia Muscular, Pérdida de Grasa Corporal, Ganancia de Fuerza y Powerlifting
- **Diferenciación por Género**: Rutinas específicas para hombres y mujeres
- **Carrito de Compras**: Sistema intuitivo para seleccionar y pagar rutinas
- **Procesamiento de Pagos**: Integración completa con Transbank Webpay Plus
- **Packs Completos**: Opción para adquirir todas las fases de una rutina con descuento
- **Envío Automático**: Distribución de archivos Excel por correo electrónico
- **Responsive Design**: Experiencia optimizada en dispositivos móviles y de escritorio

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Supabase Storage para archivos Excel
- **Email**: Resend para envío de correos transaccionales
- **Pagos**: Transbank Webpay Plus (Chile)
- **Hosting**: Vercel

## ⚙️ Configuración del Proyecto

### Requisitos Previos

- Node.js 18 o superior
- NPM o Yarn
- Cuenta en Supabase para la base de datos
- Cuenta en Resend para el envío de correos electrónicos
- Cuenta en Transbank para procesamiento de pagos

### Variables de Entorno

La aplicación requiere ciertas variables de entorno para funcionar correctamente. Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# URL base del sitio (sin barra final)
NEXT_PUBLIC_BASE_URL="https://www.coachinostroza.cl/"

# Clave secreta para firmar transacciones
TRANSACTION_SECRET_KEY="clave-secreta-generada-aleatoriamente"

# Credenciales de Transbank
TRANSBANK_COMMERCE_CODE=tu-codigo-de-comercio
TRANSBANK_API_KEY=tu-clave-api
TRANSBANK_ENVIRONMENT=Production # o Integration para pruebas

# Resend API key
RESEND_API_KEY="tu-clave-api-resend"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-clave-anon"
```

### Instalación y Ejecución

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/coachinostroza.git
cd coachinostroza

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

## 📂 Estructura del Bucket para Archivos de Cursos

Los archivos Excel de las rutinas siguen esta estructura en el bucket de Supabase "course-excel":

```
perdida-de-grasa-corporal/         # Categoría principal
├── fase-i-iniciacion/             # Subcarpeta para Fase I
│   ├── Fase I Preparacion.xlsx    # Archivo de rutina
├── fase-ii-progresion/            # Subcarpeta para Fase II
│   ├── Fase II Construccion.xlsx  # Archivo de rutina
├── fase-iii-maestria/             # Subcarpeta para Fase III
│   ├── Fase III Potenciacion.xlsx # Archivo de rutina
├── pack-completo-perdida-de-grasa-corporal/ # Pack completo
    ├── Fase I Preparacion.xlsx    # Archivo de Fase I
    ├── Fase II Construccion.xlsx  # Archivo de Fase II
    ├── Fase III Potenciacion.xlsx # Archivo de Fase III

# Similar estructura para versiones de mujer
perdida-de-grasa-corporal-mujer/   # Categoría para mujeres
├── fase-i-iniciacion/
├── fase-ii-progresion/
├── fase-iii-maestria/
├── pack-completo-perdida-de-grasa-corporal-mujer/
```

## 🚨 Solución de Problemas Comunes

### Conexión a la Base de Datos
- Verificar variables de entorno en `.env.local`
- Comprobar que el proyecto en Supabase esté activo
- Verificar que las claves API sean correctas

### Envío de Correos
- Verificar la clave API de Resend
- Asegurar que el dominio del remitente esté verificado en Resend

### Procesamiento de Pagos
- Verificar credenciales de Transbank
- Para pruebas, usar las tarjetas de prueba proporcionadas por Transbank
- Comprobar el ambiente correcto (Integration/Production)

## 📄 Licencia

Derechos reservados © Coach Inostroza 2024
