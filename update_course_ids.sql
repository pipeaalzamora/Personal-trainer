-- Primero, habilitar la extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear una tabla temporal para mantener la relación entre los IDs antiguos y nuevos
CREATE TEMPORARY TABLE course_id_mapping (
    old_id text,
    new_id uuid
);

-- Insertar los cursos existentes en la tabla temporal con nuevos UUIDs
INSERT INTO course_id_mapping (old_id, new_id)
SELECT id::text, gen_random_uuid()
FROM courses;

-- Actualizar las referencias en order_items
UPDATE order_items oi
SET course_id = cm.new_id::text
FROM course_id_mapping cm
WHERE oi.course_id = cm.old_id;

-- Actualizar los IDs en la tabla courses
UPDATE courses c
SET id = cm.new_id::text
FROM course_id_mapping cm
WHERE c.id = cm.old_id;

-- Eliminar la tabla temporal
DROP TABLE course_id_mapping; 