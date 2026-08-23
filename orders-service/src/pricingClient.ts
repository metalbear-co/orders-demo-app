const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL ?? "http://localhost:8000";

export interface Quote {
  sku: string;
  unit_price: number;
  currency: string;
}

export async function getQuote(sku: string): Promise<Quote | null> {
  const res = await fetch(`${PRICING_SERVICE_URL}/price/${encodeURIComponent(sku)}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pricing-service responded ${res.status}`);

  return (await res.json()) as Quote;
}
