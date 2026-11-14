import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingWizard } from "@/components/BookingWizard";
import { getDict, isLocale } from "@/i18n/dict";
import { getServices } from "@/lib/queries";
import styles from "./book.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/book">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDict(locale).book.title } : {};
}

export default async function BookPage({ params }: PageProps<"/[locale]/book">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const services = await getServices();
  return (
    <main className={`container ${styles.page}`}>
      <h1 className={styles.title}>{getDict(locale).book.title}</h1>
      {/* The wizard reads ?s= from the URL (useSearchParams), which is only known
          per request, so it sits behind Suspense and the title stays static. */}
      <Suspense fallback={<div className={styles.skeleton} />}>
        <BookingWizard locale={locale} services={services} />
      </Suspense>
    </main>
  );
}
