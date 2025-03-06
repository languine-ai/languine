export const TIERS_MAX_KEYS = {
  0: 500,
  1: 3000,
  2: 5000,
  3: 10000,
  4: 20000,
  5: 30000,
  6: 50000,
  7: 100000,
};

export const TIERS_MAX_DOCUMENTS = {
  0: 5,
  1: 25,
  2: 50,
  3: 100,
  4: 200,
  5: 300,
  6: 500,
  7: 1000,
};

export const TIER_PRICES = {
  1: 19,
  2: 29,
  3: 49,
  4: 149,
  5: 299,
  6: 499,
  7: 999,
};

export const PRODUCT_ID_MAP_PRODUCTION = {
  1: "530dfd1c-1c85-42b6-84f7-598b84f922ee",
  2: "0cb12733-d7f9-4795-baa1-76cb4edcd239",
  3: "1d63b754-06d6-4186-9be5-817e7693264f",
  4: "4dc28104-46d9-42b0-a55f-d96930333ae2",
  5: "be20ddfe-dee7-49ea-9008-3934b01dcb8a",
  6: "6c2929f7-8941-47da-8f45-bd2fe304e384",
  7: "b893ae5d-ae55-42fc-a919-8b7c142cf6be",
};

export const PRODUCT_ID_MAP_SANDBOX = {
  1: "",
  2: "8f0d623f-8dc8-4975-aa00-a143108ebab0",
  3: "2cc94f27-7cfc-40c7-9726-8e94d63fd8e2",
  4: "89689fb1-cde9-474a-b6d1-96b672446c8b",
  5: "cf48e7c3-7ac6-4553-a92e-1054ffb63c27",
  6: "b53ff0db-0a16-4e33-9f98-7c7397fa5048",
  7: "b0350cb1-2304-4a3e-940b-195a2b4a8d4c",
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
