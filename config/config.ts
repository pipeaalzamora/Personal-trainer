// Códigos de integración por defecto si no se especifican
const DEFAULT_INTEGRATION_COMMERCE_CODE = '597055555532';
const DEFAULT_INTEGRATION_API_KEY = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

// Configuración de Transbank
// Forzamos el uso del ambiente de integración sin importar el entorno
export const isProduction = false; // Forzamos modo integración

// Obtener credenciales configuradas
const configuredCommerceCode = process.env.TRANSBANK_COMMERCE_CODE;
const configuredApiKey = process.env.TRANSBANK_API_KEY;

// URLs para los ambientes de Transbank
const INTEGRATION_URL = 'https://webpay3gint.transbank.cl';
const PRODUCTION_URL = 'https://webpay3g.transbank.cl';

// Configuraciones específicas de Transbank
export const COMMERCE_CODE = process.env.TRANSBANK_WEBPAY_COMMERCE_CODE_INTEGRATION;
export const API_KEY = process.env.TRANSBANK_WEBPAY_API_KEY_INTEGRATION;

export const config = {
  // Siempre usamos credenciales de integración
  commerceCode: (configuredCommerceCode || DEFAULT_INTEGRATION_COMMERCE_CODE),
  apiKey: (configuredApiKey || DEFAULT_INTEGRATION_API_KEY),
  environment: 'Integration', // Forzamos ambiente de integración
  // Siempre usamos la URL de integración
  webpayHost: INTEGRATION_URL,
  // Configuración para tarjetas de prueba
  testCards: {
    visa: {
      number: '4051885600446623',
      cvv: '123'
    },
    mastercard: {
      number: '5186059559590568',
      cvv: '123'
    },
    amex: {
      number: '3700000000002032',
      cvv: '1234'
    },
    redcompra: {
      approved: '4051884239937763',
      rejected: '5186008541233829'
    }
  }
};