import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configurar cliente S3
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET || '';

/**
 * Genera una URL presignada para subir un archivo directamente a S3
 */
export const generateUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generando URL de carga:', error);
    throw error;
  }
};

/**
 * Genera una URL presignada para descargar un archivo desde S3
 */
export const generateDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generando URL de descarga:', error);
    throw error;
  }
};

/**
 * Elimina un archivo de S3
 */
export const deleteFile = async (key: string): Promise<boolean> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return false;
  }
};

/**
 * Genera una ruta para un nuevo archivo de curso
 */
export const generateCourseMaterialPath = (
  courseId: string, 
  fileName: string
): string => {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\.-]/g, '_');
  return `courses/${courseId}/materials/${Date.now()}-${sanitizedFileName}`;
}; 