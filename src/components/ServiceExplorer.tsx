"use client";

// Price list + car drawing. Pointing at (or focusing) a job lights up the part of
// the car it touches. On touch screens a tap does the same.

import Link from "next/link";
import { useState } from "react";
import { getDict, serviceName, type Locale } from "@/i18n/dict";
import type { Service } from "@/lib/bookings";
import { CarTopView } from "./CarTopView";
import styles from "./ServiceExplorer.module.css";

export function ServiceExplorer({ locale, services }: { locale: Locale; services: Service[] }) {
  const t = getDict(locale);
  const [active, setActive] = useState<Service>(services[1] ?? services[0]);

  return (
    <div className={styles.grid}>
      <ul className={styles.list}>
        {services.map((s) => (
          <li key={s.slug}>
            <button
              type="button"
              className={styles.item}
              aria-pressed={active?.slug === s.slug}
              onMouseEnter={() => setActive(s)}
              onFocus={() => setActive(s)}
              onClick={() => setActive(s)}
            >
              <span className={styles.name}>{serviceName(s, locale)}</span>
              <span className={styles.meta}>
                {s.duration_min} {t.services.min}
              </span>
              <span className={styles.price}>
                {s.price_azn} <small>{t.services.azn}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.stage}>
        <div className={styles.grid2} aria-hidden />
        <CarTopView active={active ? [active.part] : []} className={styles.car} />
        {active && (
          <div className={styles.card} key={active.slug}>
            <span className="eyebrow">{t.services.parts[active.part] ?? active.part}</span>
            <strong>{serviceName(active, locale)}</strong>
            <span>
              {active.duration_min} {t.services.min} · {active.price_azn} {t.services.azn}
            </span>
            <Link href={`/${locale}/book?s=${active.slug}`} className="btn btnPaint">
              {t.nav.book}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
