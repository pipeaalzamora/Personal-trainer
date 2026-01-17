// Configuración de Transbank
// IMPORTANTE: Todas las credenciales deben venir de variables de entorno
// Nunca hardcodear credenciales en el código

const commerceCode = process.env.TRANSBANK_COMMERCE_CODE;
const apiKey = process.env.TRANSBANK_API_KEY;

// Validar que las credenciales estén configuradas
if (!commerceCode || !apiKey) {
  console.error('⚠️ ADVERTENCIA: Las credenciales de Transbank no están configuradas.');
  console.error('Configure TRANSBANK_COMMERCE_CODE y TRANSBANK_API_KEY en las variables de entorno.');
}

// Determinar ambiente basado en variable de entorno
export const isProduction = process.env.NODE_ENV === 'production' && 
                            process.env.TRANSBANK_ENVIRONMENT === 'production';

// URLs de Transbank
const INTEGRATION_URL = 'https://webpay3gint.transbank.cl';
const PRODUCTION_URL = 'https://webpay3g.transbank.cl';

export const config = {
  commerceCode: commerceCode || '',
  apiKey: apiKey || '',
  environment: isProduction ? 'Production' : 'Integration',
  webpayHost: isProduction ? PRODUCTION_URL : INTEGRATION_URL,
};

// Exportar credenciales individuales para compatibilidad
export const COMMERCE_CODE = commerceCode;
export const API_KEY = apiKey;
