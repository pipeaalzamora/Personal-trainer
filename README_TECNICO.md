# Coach Inostroza - Documentación Técnica

Esta documentación técnica detalla la implementación, arquitectura y guía de mantenimiento de la plataforma de entrenamiento personal del Coach Inostroza.

## Índice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Base de Datos](#base-de-datos)
4. [Sistema de Archivos](#sistema-de-archivos)
5. [Procesamiento de Pagos](#procesamiento-de-pagos)
6. [Envío de Correos](#envío-de-correos)
7. [Diferenciación por Género](#diferenciación-por-género)
8. [Packs Completos](#packs-completos)
9. [Guía de Mantenimiento](#guía-de-mantenimiento)
10. [Solución de Problemas](#solución-de-problemas)

## Arquitectura del Sistema

La plataforma está construida como una aplicación web full-stack utilizando las siguientes tecnologías:

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase PostgreSQL
- **Almacenamiento**: Supabase Storage
- **Autenticación**: Sistema propio por email
- **Email**: Servicios de Resend
- **Procesamiento de pagos**: Transbank Webpay Plus

### Diagrama de Arquitectura

```
Cliente (Navegador) ←→ Next.js Server ←→ API Routes
                                         ↑
                                         ↓
                        ┌───────────────┴───────────────┐
                        ↓                               ↓
                     Supabase                        Servicios Externos
                     ├── PostgreSQL                  ├── Transbank (Webpay)
                     └── Storage                     └── Resend (Email)
```

## Estructura del Proyecto

```
/app                        # Directorio principal de Next.js (App Router)
  /api                      # Endpoints de la API
    /webhooks               # Webhooks para servicios externos
    /transaction            # Endpoints para procesar transacciones
  /cart                     # Página del carrito de compras
  /categories               # Páginas de categorías de cursos
  /checkout                 # Flujo de pago
  /confirmation             # Página de confirmación post-pago
  /shop                     # Tienda principal
/components                 # Componentes React reutilizables
/config                     # Configuraciones del sistema
/lib                        # Bibliotecas y utilidades
  /supabase.ts              # Cliente de Supabase
  /supabase-api.ts          # Funciones para interactuar con Supabase
  /transbank.ts             # Configuración y funciones de Transbank
  /emails                   # Plantillas de correo electrónico
/public                     # Archivos estáticos
/styles                     # Estilos globales
```

## Base de Datos

### Tablas Principales

#### `courses`
- `id`: UUID (PK)
- `title`: String
- `description`: Text
- `price`: Integer
- `category`: String
- `image_url`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### `users`
- `id`: UUID (PK)
- `email`: String
- `verified`: Boolean
- `verification_token`: String
- `created_at`: Timestamp

#### `orders`
- `id`: UUID (PK)
- `user_id`: UUID (FK)
- `total_amount`: Integer
- `status`: String
- `buy_order`: String
- `session_id`: String
- `transaction_token`: String
- `transaction_response`: JSON
- `emails_sent`: Boolean
- `emails_sent_at`: Timestamp
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### `order_items`
- `id`: UUID (PK)
- `order_id`: UUID (FK)
- `course_id`: UUID (FK)
- `price`: Integer
- `is_part_of_pack`: Boolean
- `created_at`: Timestamp

#### `files`
- `id`: UUID (PK)
- `course_id`: UUID (FK)
- `name`: String
- `path`: String
- `type`: String
- `size`: Integer
- `metadata`: JSON
- `created_at`: Timestamp

## Sistema de Archivos

### Estructura de Almacenamiento

La plataforma utiliza dos buckets en Supabase Storage:

1. `course-files`: Para archivos relacionados con los cursos (imágenes, etc.)
2. `course-excel`: Para los archivos Excel de las rutinas de entrenamiento

#### Estructura del bucket `course-excel`

```
[categoria]/
├── fase-i-iniciacion/
│   ├── Fase I Preparacion.xlsx
├── fase-ii-progresion/
│   ├── Fase II Construccion.xlsx
├── fase-iii-maestria/
│   ├── Fase III Potenciacion.xlsx
├── pack-completo-[categoria]/
    ├── Fase I Preparacion.xlsx
    ├── Fase II Construccion.xlsx
    ├── Fase III Potenciacion.xlsx
```

Para los cursos de mujeres, se sigue una estructura similar pero con un sufijo:

```
[categoria]-mujer/
├── fase-i-iniciacion/
│   ├── Fase I Preparacion.xlsx
```

o alternativamente:

```
[categoria]-mujeres/
├── fase-i-iniciacion/
│   ├── Fase I Preparacion.xlsx
```

### Lógica de Búsqueda de Archivos

El sistema implementa una lógica robusta para localizar los archivos correctos:

1. Detecta si el curso es para mujeres basado en el título, categoría o descripción
2. Busca en la carpeta correspondiente a la categoría y fase
3. Utiliza un sistema de respaldo que intenta múltiples ubicaciones:
   - Carpetas específicas de fase
   - Carpetas alternativas (singular/plural para carpetas de mujeres)
   - Búsqueda recursiva en el sistema de archivos

La implementación del algoritmo está en `lib/supabase-api.ts` en las funciones:
- `getCourseExcelFile`
- `findFaseIFileAnywhere`
- `getPackCompleteFiles`
- `searchPackFilesInCategory`

## Procesamiento de Pagos

### Flujo de Pago con Transbank

1. Usuario añade productos al carrito
2. En checkout, se crea una orden en la tabla `orders` con estado `INITIATED`
3. Se inicia una transacción con Transbank Webpay Plus
4. Usuario es redirigido a la pasarela de pago
5. Después del pago, Transbank redirige al usuario de vuelta
6. El sistema procesa el resultado de la transacción
7. Se actualiza el estado de la orden a `COMPLETED` o `FAILED`
8. Si es exitoso, se envían los archivos por correo electrónico

### Configuración de Ambiente

La plataforma soporta dos ambientes para Transbank:
- **Integración**: Para pruebas, con credenciales de prueba
- **Producción**: Con credenciales reales del comercio

La configuración se establece en `config/config.ts` y se controla con la variable `isProduction`.

## Envío de Correos

### Proceso de Envío

1. Cuando una orden es completada, se verifica si ya se enviaron los correos (campo `emails_sent`)
2. Si no se han enviado, se obtienen los archivos Excel correspondientes
3. Se construye un correo con los archivos adjuntos
4. Se envía usando la API de Resend
5. Se marca la orden como `emails_sent = true` y se registra la fecha en `emails_sent_at`

Este control evita el envío duplicado de correos si el usuario recarga la página de confirmación.

## Diferenciación por Género

### Implementación

La plataforma distingue entre rutinas para hombres y mujeres:

1. Detección basada en la categoría, título o descripción del curso
2. Búsqueda de archivos en carpetas específicas según el género
3. Interface de usuario adaptada para mostrar:
   - "Ganancia Muscular Mujeres"
   - "Pérdida de Grasa Corporal Mujeres"

La lógica de detección está implementada principalmente en `lib/supabase-api.ts`.

## Packs Completos

### Funcionamiento

Los packs completos son productos que incluyen todas las fases de una categoría:

1. Al comprar un pack completo, el sistema:
   - Registra la compra del pack en `order_items`
   - Busca todos los cursos individuales de esa categoría
   - Los agrega como items adicionales con precio 0 y `is_part_of_pack = true`
   
2. Al enviar los archivos:
   - Detecta si es un pack completo
   - Busca archivos en la carpeta específica del pack o en cada fase individual
   - Envía todos los archivos de las tres fases en un solo correo

## Guía de Mantenimiento

### Añadir Nuevos Cursos

1. Accede a la interfaz administrativa
2. Crea el nuevo curso con su categoría y precio
3. Sube los archivos Excel correspondientes al bucket `course-excel` siguiendo la estructura:
   - Para cursos regulares: `[categoria]/fase-i-iniciacion/Nombre.xlsx`
   - Para cursos de mujer: `[categoria]-mujer/fase-i-iniciacion/Nombre.xlsx`
   - Para packs completos: `[categoria]/pack-completo-[categoria]/Fase I.xlsx`, etc.

### Actualizar Archivos de Rutinas

1. Accede al bucket `course-excel` en Supabase
2. Navega a la carpeta correspondiente
3. Sube la nueva versión del archivo con el mismo nombre para reemplazar

### Cambiar Credenciales de Transbank

1. Actualiza las variables en `.env.local`:
   ```
   TRANSBANK_COMMERCE_CODE=nuevo-codigo
   TRANSBANK_API_KEY=nueva-clave
   ```
2. Para cambiar el ambiente, modifica `isProduction` en `config/config.ts`

## Solución de Problemas

### Archivos No Encontrados

Si hay problemas con la descarga de archivos Excel:

1. Verifica que los archivos estén subidos a las carpetas correctas
2. Revisa los registros para identificar las carpetas que está intentando buscar
3. Asegúrate de que los nombres de archivos sigan la convención:
   - Para fase 1: "Fase I Preparacion.xlsx"
   - Para fase 2: "Fase II Construccion.xlsx"
   - Para fase 3: "Fase III Potenciacion.xlsx"

### Transacciones Fallidas

Si las transacciones fallan consistentemente:

1. Verifica las credenciales de Transbank
2. Asegúrate de que la URL de retorno esté correctamente configurada
3. Revisa los logs de transacción en el panel de Transbank

### Correos No Enviados

Si los correos no se envían:

1. Verifica la clave API de Resend
2. Asegúrate de que el dominio del remitente esté verificado
3. Revisa si la tabla `orders` tiene los campos `emails_sent` y `emails_sent_at`

### Optimizaciones Realizadas

1. **Algoritmo de Búsqueda Mejorado**: Implementación de un sistema robusto para localizar archivos Excel sin importar la estructura de carpetas
2. **Prevención de Correos Duplicados**: Sistema para evitar el envío múltiple al recargar la página
3. **Diferenciación por Género**: Detección y manejo automático de cursos específicos por género
4. **Gestión de Packs Completos**: Lógica para enviar correctamente todos los archivos en una sola compra

---

Documento elaborado por [Tu Nombre], última actualización: [Fecha] 