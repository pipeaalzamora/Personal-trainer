import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { RefundTransactionResponse } from '@/app/types/transbank.types';

const options = new Options(config.commerceCode, config.apiKey, config.environment as Environment);
const mallTx = new WebpayPlus.MallTransaction(options);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, childBuyOrder, childCommerceCode, amount } = body;
    const response = await mallTx.refund(token, childBuyOrder, childCommerceCode, amount) as RefundTransactionResponse;
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error refunding transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}