"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePlanModal } from "@/hooks/use-plan-modal";
import { TIERS_MAX_DOCUMENTS, TIERS_MAX_KEYS } from "@/lib/tiers";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function CurrentTier({
  tier,
  polarCustomerId,
  canceledAt,
}: {
  tier: number;
  polarCustomerId?: string;
  canceledAt?: string | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("current_tier");
  const { setQueryStates } = usePlanModal();

  const maxKeys = TIERS_MAX_KEYS[tier as keyof typeof TIERS_MAX_KEYS];
  const maxDocuments =
    TIERS_MAX_DOCUMENTS[tier as keyof typeof TIERS_MAX_DOCUMENTS];

  return (
    <div>
      {t("currentTier")}

      <Card className="bg-transparent mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-normal">
            {tier > 0 ? `${t("tier")} ${tier}` : t("free")}
          </CardTitle>
          <CardDescription>
            {maxKeys.toLocaleString()} {t("translationKeys")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          {polarCustomerId && (
            <SubmitButton
              variant="outline"
              isSubmitting={isSubmitting}
              onClick={() => setIsSubmitting(true)}
            >
              <Link href={`/api/portal?id=${polarCustomerId}`}>
                {t("manage_button")}
              </Link>
            </SubmitButton>
          )}

          {canceledAt && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-yellow-500" />
              <span>{t("canceled")}</span>
            </div>
          )}

          {!polarCustomerId && (
            <Button
              variant="outline"
              onClick={() =>
                setQueryStates({ modal: "plan", tier: Math.min(tier + 1, 9) })
              }
            >
              {t("changePlan")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
