import dotenv from 'dotenv';
dotenv.config();

export const config = {
  commerceCode: process.env.TRANSBANK_COMMERCE_CODE || '',
  apiKey: process.env.TRANSBANK_API_KEY || '',
  environment: process.env.TRANSBANK_ENVIRONMENT === 'Production' ? 'Production' : 'Integration',
};