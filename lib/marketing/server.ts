import { createHash } from 'crypto';
import { MARKETING_CURRENCY, MarketingProduct, normalizeMarketingProducts } from './types';

type PurchaseEventInput = {
  request: Request;
  eventId: string;
  email: string | null;
  userId?: string | null;
  buyOrder: string;
  amount: number;
  products: MarketingProduct[];
};

const metaPixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
const metaGraphVersion = process.env.META_GRAPH_API_VERSION || 'v25.0';
const metaTestEventCode = process.env.META_TEST_EVENT_CODE;

const tikTokPixelId = process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const tikTokAccessToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
const tikTokEventsApiUrl = process.env.TIKTOK_EVENTS_API_URL || 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const tikTokTestEventCode = process.env.TIKTOK_TEST_EVENT_CODE;

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim();

  return request.headers.get('x-real-ip') || undefined;
}

function getEventSourceUrl(request: Request): string {
  return request.headers.get('referer') || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.coachinostroza.cl'}/payment/confirmation`;
}

async function postJson(url: string, init: RequestInit, provider: string): Promise<void> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`[marketing] ${provider} respondió con error ${response.status}: ${body}`);
    }
  } catch (error) {
    console.warn(`[marketing] No se pudo enviar evento a ${provider}:`, error);
  }
}

async function sendMetaPurchase(input: PurchaseEventInput): Promise<void> {
  if (!metaPixelId || !metaAccessToken) return;

  const products = normalizeMarketingProducts(input.products);
  const userData: Record<string, unknown> = {
    client_ip_address: getClientIp(input.request),
    client_user_agent: input.request.headers.get('user-agent') || undefined,
    fbp: getCookie(input.request, '_fbp'),
    fbc: getCookie(input.request, '_fbc'),
  };

  if (input.email) userData.em = [sha256(input.email)];
  if (input.userId) userData.external_id = [sha256(input.userId)];

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: 'website',
        event_source_url: getEventSourceUrl(input.request),
        user_data: userData,
        custom_data: {
          currency: MARKETING_CURRENCY,
          value: input.amount,
          order_id: input.buyOrder,
          content_type: 'product',
          content_ids: products.map(product => product.id),
          contents: products.map(product => ({
            id: product.id,
            quantity: product.quantity,
            item_price: product.price,
          })),
          num_items: products.reduce((sum, product) => sum + product.quantity, 0),
        },
      },
    ],
  };

  if (metaTestEventCode) {
    payload.test_event_code = metaTestEventCode;
  }

  await postJson(
    `https://graph.facebook.com/${metaGraphVersion}/${metaPixelId}/events?access_token=${encodeURIComponent(metaAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Meta'
  );
}

async function sendTikTokPurchase(input: PurchaseEventInput): Promise<void> {
  if (!tikTokPixelId || !tikTokAccessToken) return;

  const products = normalizeMarketingProducts(input.products);
  const payload: Record<string, unknown> = {
    pixel_code: tikTokPixelId,
    event: 'CompletePayment',
    event_id: input.eventId,
    timestamp: new Date().toISOString(),
    context: {
      ad: {
        callback: getCookie(input.request, 'ttclid'),
      },
      page: {
        url: getEventSourceUrl(input.request),
        referrer: input.request.headers.get('referer') || undefined,
      },
      user: {
        email: input.email ? sha256(input.email) : undefined,
        external_id: input.userId ? sha256(input.userId) : undefined,
        ttp: getCookie(input.request, '_ttp'),
      },
      user_agent: input.request.headers.get('user-agent') || undefined,
      ip: getClientIp(input.request),
    },
    properties: {
      currency: MARKETING_CURRENCY,
      value: input.amount,
      order_id: input.buyOrder,
      contents: products.map(product => ({
        content_id: product.id,
        content_name: product.title,
        content_category: product.category,
        content_type: 'product',
        price: product.price,
        quantity: product.quantity,
      })),
    },
  };

  if (tikTokTestEventCode) {
    payload.test_event_code = tikTokTestEventCode;
  }

  await postJson(
    tikTokEventsApiUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': tikTokAccessToken,
      },
      body: JSON.stringify(payload),
    },
    'TikTok'
  );
}

export async function sendPurchaseMarketingEvents(input: PurchaseEventInput): Promise<void> {
  await Promise.all([
    sendMetaPurchase(input),
    sendTikTokPurchase(input),
  ]);
}
