import React from "react";

export function Hero() {
  return (
    <div>
        <h1>{t("Hero.mainHeading")}</h1>
        <p>{t("Hero.secondaryDescription")}</p>

        <div>
          <button type="button">{t("Hero.contactFoundersButtonText")}</button>
          <button type="button">{t("Hero.signInButtonText")}</button>
        </div>

        <img alt={t("Hero.imageAltText")} src="" />
      </div>
  );
}
