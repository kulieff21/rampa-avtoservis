// The job card shown after booking. The code is only known at request time, so
// the card renders inside <Suspense>; the page around it is a static shell.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CarTopView } from "@/components/CarTopView";
import { getDict, isLocale, serviceName, type Locale } from "@/i18n/dict";
import { getServices, getTicket } from "@/lib/queries";
import { hhmm } from "@/lib/time";
import styles from "./ticket.module.css";

export const metadata = { robots: { index: false } };

export default async function TicketPage({ params }: PageProps<"/[locale]/booking/[code]">) {
  return (
    <main className={`container ${styles.page}`}>
      <Suspense fallback={<div className={styles.slot} />}>
        <Ticket params={params} />
      </Suspense>
    </main>
  );
}

async function Ticket({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const booking = await getTicket(code);
  if (!booking) {
    return <p className={styles.missing}>{t.ticket.notFound}</p>;
  }
  const services = (await getServices()).filter((s) => booking.services.includes(s.slug));

  return (
    <>
      <div className={styles.slot} aria-hidden />
      <article className={styles.card} data-cancelled={booking.status === "cancelled"}>
        <header className={styles.head}>
          <span className={styles.brand}>Rampa</span>
          <span className="eyebrow">{t.ticket.title}</span>
        </header>

        <div className={styles.codeRow}>
          <p className={styles.code} aria-label={booking.code}>
            {booking.code.split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${700 + i * 90}ms` }}>
                {ch}
              </span>
            ))}
          </p>
          <p className={styles.show}>{t.ticket.show}</p>
        </div>

        {booking.status === "cancelled" && <p className={styles.cancelled}>{t.ticket.cancelled}</p>}

        <dl className={styles.grid}>
          <div>
            <dt>{t.ticket.bay}</dt>
            <dd className={styles.bay}>{String(booking.bay).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>{t.ticket.arrive}</dt>
            <dd>
              {t.date(booking.date).long}
              <br />
              <strong>
                {hhmm(booking.start)}–{hhmm(booking.end)}
              </strong>
            </dd>
          </div>
          <div className={styles.wide}>
            <dt>{t.ticket.work}</dt>
            <dd>
              <ul>
                {services.map((s) => (
                  <li key={s.slug}>{serviceName(s, locale)}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>{t.ticket.total}</dt>
            <dd className={styles.total}>
              {booking.total} {t.services.azn}
            </dd>
          </div>
        </dl>

        <div className={styles.foot}>
          <CarTopView active={booking.parts} className={styles.car} />
          <Barcode code={booking.code} />
        </div>
      </article>

      <div className={styles.actions}>
        <a className="btn" href={`/api/bookings/${booking.code}/ics`}>
          {t.ticket.calendar}
        </a>
        <Link className="btn btnGhost" href={`/${locale as Locale}/book`}>
          {t.ticket.another}
        </Link>
      </div>
    </>
  );
}

/** Decorative bars derived from the code, so every card looks different. */
function Barcode({ code }: { code: string }) {
  const bars = code
    .split("")
    .flatMap((ch) => [ch.charCodeAt(0) % 3 + 1, ch.charCodeAt(0) % 5 + 1, (ch.charCodeAt(0) >> 2) % 3 + 1]);
  // x position of each bar = sum of the widths before it
  const xs = bars.map((_, i) => bars.slice(0, i).reduce((a, b) => a + b * 2, 0));
  return (
    <svg className={styles.barcode} viewBox={`0 0 ${bars.reduce((a, b) => a + b * 2, 0)} 40`} aria-hidden>
      {bars.map((w, i) => (i % 2 === 0 ? <rect key={i} x={xs[i]} y="0" width={w} height="40" /> : null))}
    </svg>
  );
}
