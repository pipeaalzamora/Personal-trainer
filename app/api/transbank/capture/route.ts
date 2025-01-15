import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CaptureTransactionResponse } from '@/app/types/transbank.types';

const options = new Options(config.commerceCode, config.apiKey, config.environment as Environment);
const mallTx = new WebpayPlus.MallTransaction(options);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, childCommerceCode, buyOrder, authorizationCode, captureAmount } = body;
    const response = await mallTx.capture(token, childCommerceCode, buyOrder, authorizationCode, captureAmount) as CaptureTransactionResponse;
    return NextResponse.json(response);
   // ... código existente ...
} catch (error: unknown) {
  console.error('Error capturing transaction:', error);
  return NextResponse.json({ error: (error as Error).message }, { status: 500 });
}
// ... código existente ...
}