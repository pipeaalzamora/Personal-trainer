import dotenv from 'dotenv';
dotenv.config();

// Determinar el ambiente de Transbank
const isProduction = process.env.TRANSBANK_ENVIRONMENT === 'Production';

// Códigos de integración por defecto si no se especifican
const DEFAULT_INTEGRATION_COMMERCE_CODE = '597055555532';
const DEFAULT_INTEGRATION_API_KEY = '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';

export const config = {
  commerceCode: isProduction 
    ? (process.env.TRANSBANK_COMMERCE_CODE || '')
    : (process.env.TRANSBANK_COMMERCE_CODE || DEFAULT_INTEGRATION_COMMERCE_CODE),
  apiKey: isProduction 
    ? (process.env.TRANSBANK_API_KEY || '')
    : (process.env.TRANSBANK_API_KEY || DEFAULT_INTEGRATION_API_KEY),
  environment: isProduction ? 'Production' : 'Integration',
  // Hosts específicos según el ambiente
  webpayHost: isProduction 
    ? 'https://webpay3g.transbank.cl'
    : 'https://webpay3gint.transbank.cl'
};