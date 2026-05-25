# Supabase

Este directorio versiona el esquema esperado por la aplicacion.

Antes de aplicar una migracion en produccion:

1. Comparar esta definicion con el esquema real de Supabase.
2. Respaldar la base de datos.
3. Verificar policies RLS y buckets en staging.
4. Aplicar con Supabase CLI o desde el SQL editor.

La app usa `SUPABASE_SERVICE_ROLE_KEY` solo en API routes del servidor. Esa variable no debe exponerse al cliente.

## Ramas

La rama `dev` de GitHub solo versiona codigo y migraciones SQL. No crea una rama de base de datos por si sola.

Para probar cambios de base de datos sin tocar produccion, crea una branch del proyecto en Supabase, aplica ahi las migraciones pendientes y configura la app local o el deploy de prueba con las variables de esa branch.

La base de produccion solo debe recibir migraciones despues de validar checkout, confirmacion de pago, correos, `Mis Programas` y acceso a archivos del bucket `course-excel` en la branch de Supabase.

La rama `dev` usa `course-excel` como unico bucket de cursos. No depende de un bucket `course-files`; los archivos se suben manualmente a `course-excel` y la descarga se resuelve desde `/api/courses/excel/[id]`.
