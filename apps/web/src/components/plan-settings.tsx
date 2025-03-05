"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TIERS_MAX_DOCUMENTS, TIERS_MAX_KEYS } from "@/lib/tiers";
import { useTranslations } from "next-intl";

interface PlanSettingsProps {
  tier: number;
  keysUsed: number;
  documentsUsed: number;
}

export function PlanSettings({
  tier,
  keysUsed = 0,
  documentsUsed = 0,
}: PlanSettingsProps) {
  const t = useTranslations("plan_settings");

  const maxKeys = TIERS_MAX_KEYS[tier as keyof typeof TIERS_MAX_KEYS] || 0;
  const maxDocuments =
    TIERS_MAX_DOCUMENTS[tier as keyof typeof TIERS_MAX_DOCUMENTS] || 0;

  const getPercentage = (value: number, max: number) =>
    Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-sm font-normal">
            {t("translationKeys")}
          </CardTitle>
          <CardDescription>
            {keysUsed.toLocaleString()}/{maxKeys.toLocaleString()}{" "}
            {t("keysUsed")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={getPercentage(keysUsed, maxKeys)} className="h-2" />
        </CardContent>
      </Card>

      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-sm font-normal">
            {t("documents")}
          </CardTitle>
          <CardDescription>
            {documentsUsed.toLocaleString()}/{maxDocuments.toLocaleString()}{" "}
            {t("documentsUsed")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={getPercentage(documentsUsed, maxDocuments)}
            className="h-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}
