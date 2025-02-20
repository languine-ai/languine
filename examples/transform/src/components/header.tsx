import React from "react";

export function Header() {
  return (
    <header>
        <nav>
          <ul>
            <li>
              <a href="/" title={t("Header.homeNavigationTitle")}>
                {t("Header.homeLink")}
              </a>
            </li>
            <li>
              <a href="/about" title={t("Header.aboutNavigationTitle")}>
                {t("Header.aboutLink")}
              </a>
            </li>
            <li>
              <a href="/contact" title={t("Header.contactNavigationTitle")}>
                {t("Header.contactLink")}
              </a>
            </li>
          </ul>
        </nav>
      </header>
  );
}
