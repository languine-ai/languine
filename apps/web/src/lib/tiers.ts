export const TIERS_MAX_KEYS = {
  0: 100,
  1: 5000,
  2: 10000,
  3: 20000,
  4: 30000,
  5: 50000,
  6: 100000,
  // 7: 200000,
  // 8: 500000,
  // 9: 1000000,
};

export const TIERS_MAX_DOCUMENTS = {
  0: 5,
  1: 25,
  2: 50,
  3: 100,
  4: 200,
  5: 300,
  6: 500,
  // 7: 2000,
  // 8: 5000,
  // 9: 10000,
};

export const TIER_PRICES = {
  1: 29,
  2: 49,
  3: 149,
  4: 299,
  5: 499,
  6: 999,
  // 7: 1999,
  // 8: 4999,
  // 9: 9999,
};

export const PRODUCT_ID_MAP_PRODUCTION = {
  1: "0cb12733-d7f9-4795-baa1-76cb4edcd239",
  2: "1d63b754-06d6-4186-9be5-817e7693264f",
  3: "4dc28104-46d9-42b0-a55f-d96930333ae2",
  4: "be20ddfe-dee7-49ea-9008-3934b01dcb8a",
  5: "6c2929f7-8941-47da-8f45-bd2fe304e384",
  6: "b893ae5d-ae55-42fc-a919-8b7c142cf6be",
  // 7: "44278d04-34a5-4ad8-9a8d-91b3b90c0b42",
  // 8: "c7f4e979-6a90-427d-bb5c-3b4dcaa1d5f2",
  // 9: "70076651-2079-4ecf-ad3a-73294e2a715c",
};

export const PRODUCT_ID_MAP_SANDBOX = {
  1: "8f0d623f-8dc8-4975-aa00-a143108ebab0",
  2: "2cc94f27-7cfc-40c7-9726-8e94d63fd8e2",
  3: "89689fb1-cde9-474a-b6d1-96b672446c8b",
  4: "cf48e7c3-7ac6-4553-a92e-1054ffb63c27",
  5: "b53ff0db-0a16-4e33-9f98-7c7397fa5048",
  6: "b0350cb1-2304-4a3e-940b-195a2b4a8d4c",
  // 7: "8e53c58c-1062-47a8-9492-9e29d71acfe4",
  // 8: "f2875dd4-a214-402c-9c0e-94d0ee25d184",
  // 9: "23627b2c-70bd-48a4-956c-0306336dbba1",
};

export const PRODUCT_ID_MAP =
  process.env.NEXT_PUBLIC_POLAR_ENVIRONMENT === "sandbox"
    ? PRODUCT_ID_MAP_SANDBOX
    : PRODUCT_ID_MAP_PRODUCTION;

export function getTierFromProductId(productId: string) {
  const tier = Object.entries(PRODUCT_ID_MAP).find(
    ([_, value]) => value === productId,
  )?.[0];

  return tier ? Number.parseInt(tier) : null;
}
