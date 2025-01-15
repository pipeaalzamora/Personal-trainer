import { NextRequest, NextResponse } from 'next/server';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { config } from '@/config/config';
import { CommitTransactionResponse } from '@/app/types/transbank.types';

const options = new Options(config.commerceCode, config.apiKey, config.environment as Environment);
const tx = new WebpayPlus.Transaction(options);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    const response = await tx.commit(token) as CommitTransactionResponse;
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error capturing transaction:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}