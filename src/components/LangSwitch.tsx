"use client";

// Swaps the first path segment (/az/... <-> /en/...) and keeps the rest of the URL.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/dict";
import styles from "./Header.module.css";

export function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <div className={styles.lang} role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          aria-current={l === locale ? "true" : undefined}
          hrefLang={l}
          lang={l}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
