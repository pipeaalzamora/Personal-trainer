# Supabase

Este directorio versiona el esquema esperado por la aplicacion.

Antes de aplicar una migracion en produccion:

1. Comparar esta definicion con el esquema real de Supabase.
2. Respaldar la base de datos.
3. Verificar policies RLS y buckets en staging.
4. Aplicar con Supabase CLI o desde el SQL editor.

La app usa `SUPABASE_SERVICE_ROLE_KEY` solo en API routes del servidor. Esa variable no debe exponerse al cliente.
