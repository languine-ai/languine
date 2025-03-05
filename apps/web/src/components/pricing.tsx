"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MdCheck } from "react-icons/md";
import { PricingSlider } from "./pricing-slider";
import { OutlinedButton } from "./ui/outlined-button";

export function Pricing() {
  const t = useTranslations("pricing");
  const [value, setValue] = useState(1);

  return (
    <div className="pt-14 md:pt-28">
      <h1 className="text-3xl">{t("title")}</h1>
      <div className="border border-border mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-12 relative">
            <div className="absolute -top-4 left-6 bg-background px-4 py-1">
              <h3 className="text-sm font-medium uppercase">
                {t("free.title")}
              </h3>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.unlimited_projects")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.fine_tuning")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.overrides")}</span>
              </li>

              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.analytics")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.context_memory")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.community_support")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.keys_limit")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("free.features.docs_limit")}</span>
              </li>
            </ul>
          </div>

          <div className="p-12 relative">
            <div className="absolute -top-4 left-6 bg-background px-4 py-1">
              <h3 className="text-sm font-medium uppercase">
                {t("pro.title")}
              </h3>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-secondary mb-4">
                <span>{t("pro.includes_free")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.github_action")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.priority_queues")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.priority_support")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.keys_limit")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.docs_limit")}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <MdCheck className="w-4 h-4 text-primary" />
                <span>{t("pro.features.latest_features")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
          <div className="p-12 pt-10 relative min-h-[300px]">
            <div className="flex flex-col gap-2">
              <span className="text-sm">{t("free.keys_limit")}</span>
              <span className="text-sm text-secondary">
                {t("free.description")}
              </span>
            </div>

            <div className="absolute bottom-11">
              <h3 className="text-xl font-medium mb-6 mt-2">
                {t("free.price")}
              </h3>

              <Link href="/login">
                <OutlinedButton variant="secondary">{t("cta")}</OutlinedButton>
              </Link>
            </div>
          </div>

          <div className="p-12 pt-28">
            <PricingSlider value={value} setValue={setValue} />

            <div className="mt-4">
              <Link href="/login">
                <OutlinedButton>{t("cta")}</OutlinedButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-secondary mt-4">
        {t("keys_limit_explanation")}
      </p>
    </div>
  );
}
