export const MARKETING_CURRENCY = 'CLP';

export type MarketingEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

export type MarketingProduct = {
  id: string;
  title: string;
  category?: string | null;
  price?: number | null;
  quantity?: number;
};

export type MarketingEventPayload = {
  eventId?: string;
  value?: number;
  currency?: string;
  products?: MarketingProduct[];
};

export function createMarketingEventId(eventName: MarketingEventName, sourceId?: string): string {
  const suffix = sourceId || Math.random().toString(36).slice(2);
  return `${eventName.toLowerCase()}_${Date.now()}_${suffix}`;
}

export function normalizeMarketingProducts(products: MarketingProduct[] = []): Required<MarketingProduct>[] {
  return products.map(product => ({
    id: product.id,
    title: product.title,
    category: product.category || 'Sin categoria',
    price: Number(product.price || 0),
    quantity: Number(product.quantity || 1),
  }));
}
