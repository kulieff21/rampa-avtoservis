// Home page. The static shell (texts, price list) is prerendered at build time;
// the headline time and the live floor depend on "now", so they stream in
// through <Suspense> on every request.

import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GarageFloor } from "@/components/GarageFloor";
import { ServiceExplorer } from "@/components/ServiceExplorer";
import { getDict, isLocale, serviceName, type Locale } from "@/i18n/dict";
import { getFloor, getNextFree, getServices } from "@/lib/queries";
import styles from "./home.module.css";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const services = await getServices();
  const names = Object.fromEntries(services.map((s) => [s.slug, serviceName(s, locale)]));

  return (
    <main>
      <section className={`container ${styles.hero}`}>
        <div className={styles.copy}>
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <Suspense fallback={<h1 className={styles.title}>{t.hero.title(null)}</h1>}>
            <HeroTitle locale={locale} />
          </Suspense>
          <p className={styles.lead}>{t.hero.lead}</p>
          <div className={styles.ctas}>
            <Link href={`/${locale}/book`} className="btn">
              {t.hero.cta} <span aria-hidden>→</span>
            </Link>
            <a href={`/${locale}#prices`} className="btn btnGhost">
              {t.hero.secondary}
            </a>
          </div>
        </div>

        <div className={styles.floorCol}>
          <Suspense fallback={<div className={styles.floorSkeleton} />}>
            <LiveFloor locale={locale} names={names} />
          </Suspense>
        </div>
      </section>

      <section id="services" className={`container ${styles.section}`}>
        <header className={styles.sectionHead}>
          <h2>{t.services.title}</h2>
          <p>{t.services.lead}</p>
        </header>
        <ServiceExplorer locale={locale} services={services} />
      </section>

      <section id="how" className={`container ${styles.section}`}>
        <header className={styles.sectionHead}>
          <h2>{t.how.title}</h2>
        </header>
        <ol className={styles.steps}>
          {t.how.steps.map(([title, text], i) => (
            <li key={title}>
              <span className={styles.stepNo}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.promise}>
        <div className="container">
          <p>{t.promise}</p>
        </div>
      </section>

      <section id="prices" className={`container ${styles.section}`}>
        <header className={styles.sectionHead}>
          <h2>{t.prices.title}</h2>
        </header>
        <table className={styles.prices}>
          <thead>
            <tr>
              <th scope="col">{t.prices.work}</th>
              <th scope="col">{t.prices.time}</th>
              <th scope="col">{t.prices.price}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.slug}>
                <th scope="row">
                  <Link href={`/${locale}/book?s=${s.slug}`}>{serviceName(s, locale)}</Link>
                </th>
                <td>
                  {s.duration_min} {t.services.min}
                </td>
                <td>
                  {s.price_azn} {t.services.azn}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

async function HeroTitle({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const { slot, today, tomorrow } = await getNextFree(60);
  const when = slot ? t.when(slot.date, slot.start, today, tomorrow) : null;
  return <h1 className={styles.title}>{t.hero.title(when)}</h1>;
}

async function LiveFloor({ locale, names }: { locale: Locale; names: Record<string, string> }) {
  const floor = await getFloor();
  return (
    <GarageFloor
      locale={locale}
      date={floor.date}
      isToday={floor.isToday}
      serverNow={floor.now}
      jobs={floor.jobs}
      serviceNames={names}
    />
  );
}
