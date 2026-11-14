import { getDict, type Locale } from "@/i18n/dict";
import { Logo } from "./Header";
import styles from "./Footer.module.css";

export function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale).footer;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <Logo />
          <p className={styles.meta}>
            {t.address}
            <br />
            {t.hours}
          </p>
        </div>
        <p className={styles.fiction}>{t.fiction}</p>
      </div>
    </footer>
  );
}
