import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/dict";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return LOCALES.flatMap((locale) =>
    ["", "/book"].map((path) => ({
      url: `${base}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
