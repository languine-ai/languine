import { Slider } from "@/components/ui/slider";
import { TIERS_MAX_DOCUMENTS, TIERS_MAX_KEYS, TIER_PRICES } from "@/lib/tiers";
import NumberFlow from "@number-flow/react";
import { useTranslations } from "next-intl";

export function PricingSlider({
  value,
  min,
  setValue,
}: {
  value: number;
  min?: number;
  setValue: (value: number) => void;
}) {
  const t = useTranslations("pricing_slider");

  const getPriceForTier = (tier: number) => {
    return TIER_PRICES[tier as keyof typeof TIER_PRICES] || TIER_PRICES[1];
  };

  const getKeysForTier = (tier: number) => {
    return (
      TIERS_MAX_KEYS[tier as keyof typeof TIERS_MAX_KEYS] || TIERS_MAX_KEYS[1]
    );
  };

  const getDocumentsForTier = (tier: number) => {
    return (
      TIERS_MAX_DOCUMENTS[tier as keyof typeof TIERS_MAX_DOCUMENTS] ||
      TIERS_MAX_DOCUMENTS[1]
    );
  };

  const handleValueChange = (newValue: number[]) => {
    const tier = Math.round(newValue[0]);
    if (min !== undefined && tier < min) {
      setValue(min);
      return;
    }
    setValue(tier);
  };

  const currentTier = Math.round(value);
  const currentPrice = getPriceForTier(currentTier);

  return (
    <div className="mt-8 ml-[100px]">
      <div className="relative mb-6">
        <div
          className="bg-[#1D1D1D] absolute -top-[135px] transform -translate-x-1/2 font-medium text-primary whitespace-nowrap flex flex-col gap-1 text-xs w-[210px]"
          style={{
            left: `${((currentTier - 1) / 7) * 100}%`,
            transition: "left 0.2s ease-out",
          }}
        >
          <div className="border-b border-background p-2 flex text-xs uppercase">
            {t("tier", { tier: currentTier.toString() })}
          </div>

          <div className="text-xs flex items-center justify-between px-2 py-1">
            <span className="text-primary">
              {getKeysForTier(currentTier).toLocaleString()}
            </span>
            <span className="text-secondary">{t("keys")}</span>
          </div>

          <div className="text-xs flex items-center justify-between px-2 pb-2">
            <span className="text-primary">
              {getDocumentsForTier(currentTier).toLocaleString()}
            </span>
            <span className="text-secondary">{t("documents")}</span>
          </div>
        </div>

        <div className="flex">
          <div className="flex w-full">
            <div className="w-[100px] -ml-[100px] h-1.5 bg-white" />
            <Slider
              value={[value]}
              onValueChange={handleValueChange}
              step={1}
              min={1}
              max={Object.keys(TIER_PRICES).length}
              className="w-full"
            />
          </div>
        </div>

        <NumberFlow
          value={currentPrice}
          defaultValue={29}
          className="font-mono text-2xl -ml-[100px] mt-2"
          locales="en-US"
          format={{
            style: "currency",
            currency: "USD",
            trailingZeroDisplay: "stripIfInteger",
          }}
          suffix={`/${t("period")}`}
        />
      </div>
    </div>
  );
}
