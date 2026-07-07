export const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export const valueFromEnv = (env, keys) => {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

export const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

// Baseline shape every provider maps into. Providers only override the fields they can
// actually supply; the rest stay honest zero/empty values (the client already renders
// those as "N/A" / "Not provided" rather than faking data).
export const blankProduct = (asin) => ({
  id: asin,
  asin,
  name: `Amazon product ${asin}`,
  brand: 'Unknown',
  category: 'Amazon',
  subCategory: undefined,
  price: 0,
  priceDisplay: '',
  currency: '',
  image: '',
  rating: 0,
  reviews: 0,
  trend: 0,
  description: '',
  priceHistory: [],
  bsrHistory: [],
  bsr: 0,
  estimatedSales: 0,
  isEstimatedSales: false,
  referralFee: 0,
  fbaFee: 0,
  storageFee: 0,
  weight: '',
  dimensions: '',
  sellers: 0,
  isHazmat: false,
  isIpRisk: false,
  isOversized: false,
  riskDataAvailable: false,
  seasonalityTags: [],
  availability: '',
  fulfillmentChannel: '',
  detailUrl: `https://www.amazon.com/dp/${asin}`,
  dataSource: '',
  lastSyncedAt: new Date().toISOString()
});
