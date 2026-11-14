import Link from "next/link";
import { Suspense } from "react";
import { getDict, LOCALES, type Locale } from "@/i18n/dict";
import { LangSwitch } from "./LangSwitch";
import styles from "./Header.module.css";

export function Logo() {
  return (
    <span className={styles.logo}>
      <svg viewBox="0 0 36 28" aria-hidden>
        <rect x="2" y="4" width="5" height="22" rx="1.5" />
        <rect x="29" y="4" width="5" height="22" rx="1.5" />
        <rect className={styles.arm} x="5" y="13" width="26" height="4" rx="2" />
        <rect x="0" y="25" width="36" height="3" rx="1.5" />
      </svg>
      Rampa
    </span>
  );
}

export function Header({ locale }: { locale: Locale }) {
  const t = getDict(locale).nav;
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href={`/${locale}`} className={styles.home} aria-label="Rampa">
          <Logo />
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <a href={`/${locale}#services`}>{t.services}</a>
          <a href={`/${locale}#how`}>{t.how}</a>
          <a href={`/${locale}#prices`}>{t.prices}</a>
        </nav>
        <div className={styles.actions}>
          {/* LangSwitch reads the current URL, which on pages like /booking/[code]
              is only known per request. The fallback links to the home pages. */}
          <Suspense
            fallback={
              <div className={styles.lang}>
                {LOCALES.map((l) => (
                  <Link key={l} href={`/${l}`} aria-current={l === locale ? "true" : undefined}>
                    {l.toUpperCase()}
                  </Link>
                ))}
              </div>
            }
          >
            <LangSwitch locale={locale} />
          </Suspense>
          <Link href={`/${locale}/book`} className="btn btnPaint">
            {t.book}
          </Link>
        </div>
      </div>
    </header>
  );
}
