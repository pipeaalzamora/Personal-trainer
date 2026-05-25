'use client';

import {
  MARKETING_CURRENCY,
  MarketingEventName,
  MarketingEventPayload,
  MarketingProduct,
  createMarketingEventId,
  normalizeMarketingProducts,
} from './types';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    ttq?: {
      page?: () => void;
      track?: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  }
}

function setClientCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 90): void {
  if (typeof document === 'undefined' || !value) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
}

function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
}

export function captureMarketingClickIds(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  const ttclid = params.get('ttclid');

  if (fbclid && !getClientCookie('_fbc')) {
    setClientCookie('_fbc', `fb.1.${Date.now()}.${fbclid}`);
  }

  if (ttclid) {
    setClientCookie('ttclid', ttclid);
  }
}

function buildMetaPayload(payload: MarketingEventPayload = {}) {
  const products = normalizeMarketingProducts(payload.products);

  return {
    currency: payload.currency || MARKETING_CURRENCY,
    value: Number(payload.value || 0),
    content_type: 'product',
    content_ids: products.map(product => product.id),
    contents: products.map(product => ({
      id: product.id,
      quantity: product.quantity,
      item_price: product.price,
    })),
    content_name: products.length === 1 ? products[0].title : undefined,
    content_category: products.length === 1 ? products[0].category : undefined,
    num_items: products.reduce((sum, product) => sum + product.quantity, 0),
  };
}

function buildTikTokPayload(payload: MarketingEventPayload = {}) {
  const products = normalizeMarketingProducts(payload.products);

  return {
    currency: payload.currency || MARKETING_CURRENCY,
    value: Number(payload.value || 0),
    content_type: 'product',
    content_id: products.length === 1 ? products[0].id : undefined,
    content_name: products.length === 1 ? products[0].title : undefined,
    contents: products.map(product => ({
      content_id: product.id,
      content_name: product.title,
      content_category: product.category,
      content_type: 'product',
      price: product.price,
      quantity: product.quantity,
    })),
    event_id: payload.eventId,
  };
}

function trackMeta(eventName: MarketingEventName, payload: MarketingEventPayload = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;

  if (eventName === 'PageView') {
    window.fbq('track', 'PageView');
    return;
  }

  window.fbq(
    'track',
    eventName,
    buildMetaPayload(payload),
    payload.eventId ? { eventID: payload.eventId } : undefined
  );
}

function trackTikTok(eventName: MarketingEventName, payload: MarketingEventPayload = {}) {
  if (typeof window === 'undefined' || !window.ttq) return;

  if (eventName === 'PageView') {
    window.ttq.page?.();
    return;
  }

  const tikTokEventName = eventName === 'Purchase' ? 'CompletePayment' : eventName;
  window.ttq.track?.(tikTokEventName, buildTikTokPayload(payload));
}

export function trackMarketingEvent(eventName: MarketingEventName, payload: MarketingEventPayload = {}): string {
  const eventId = payload.eventId || createMarketingEventId(eventName);
  const payloadWithEventId = { ...payload, eventId };

  trackMeta(eventName, payloadWithEventId);
  trackTikTok(eventName, payloadWithEventId);

  return eventId;
}

export function productFromCourse(course: {
  id: string;
  title: string;
  category?: string | null;
  price?: number | null;
}): MarketingProduct {
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    price: course.price,
    quantity: 1,
  };
}
