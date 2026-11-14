// All visitor-facing text, in Azerbaijani and English. Dates are formatted by hand
// on purpose: browsers format "az" dates inconsistently.

import { hhmm } from "@/lib/time";

export const LOCALES = ["az", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AZ_DAYS = ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { m: m - 1, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

const en = {
  meta: {
    title: "Rampa — three-bay car workshop in Baku",
    description: "Pick the work, see the fixed price and take a free bay. Online booking for a car service in Baku.",
  },
  nav: { services: "Services", prices: "Prices", how: "How it works", book: "Book a bay" },
  hero: {
    eyebrow: "Three-bay workshop · Baku",
    title: (when: string | null) => (when ? `Your car on the lift ${when}.` : "Your car on the lift, on time."),
    lead: "Pick the work, see the price, take a bay that is actually free. No calls, no “come by and we’ll see”.",
    cta: "Book a bay",
    secondary: "See prices",
  },
  when: (date: string, start: number, today: string, tomorrow: string) => {
    if (date === today) return `today at ${hhmm(start)}`;
    if (date === tomorrow) return `tomorrow at ${hhmm(start)}`;
    const p = parts(date);
    return `on ${EN_DAYS[p.wd]} ${p.d} ${EN_MONTHS[p.m]} at ${hhmm(start)}`;
  },
  floor: {
    live: "Live floor",
    caption: "What is on our three lifts right now. It updates by itself.",
    bay: "Bay",
    free: "Free",
    until: (t: string) => `until ${t}`,
    next: (t: string) => `next job ${t}`,
    freeRest: "free until close",
    plan: "Plan",
    planCaption: "We are closed now. These are the next working day’s real bookings, played fast.",
    today: "Today",
  },
  services: {
    title: "Pick the work. See the part.",
    lead: "Every job has a fixed price and a fixed time on the lift. Point at one to see where it happens.",
    min: "min",
    azn: "AZN",
    parts: {
      engine: "Engine", battery: "Battery", ac: "Air-con", brakes: "Brakes",
      wheels: "Wheels", axles: "Axles", suspension: "Suspension", dash: "Electronics",
    } as Record<string, string>,
  },
  how: {
    title: "Three steps, one job card.",
    steps: [
      ["Choose the work", "Price and time on the lift are fixed before you arrive."],
      ["Take a free bay", "You only see times when a lift is really free."],
      ["Drive in with your code", "Your job card has a code. Show it at the gate."],
    ],
  },
  promise: "If we find more work under your car, we call you before we touch it.",
  prices: { title: "Prices", work: "Work", time: "Time", price: "Price" },
  footer: {
    address: "Nobel Avenue 44, Baku",
    hours: "Mon–Sat 09:00–19:00, Sunday closed",
    fiction: "Rampa is a fictional workshop built as a portfolio project. Bookings are real database rows; demo jobs are generated each day.",
  },
  book: {
    title: "Book a bay",
    steps: ["Work", "Day", "Time", "You"],
    next: "Next",
    back: "Back",
    confirm: "Confirm booking",
    sending: "Booking…",
    total: "Total",
    onLift: "On the lift",
    pickWork: "Pick at least one job.",
    closed: "Closed",
    freeBays: (n: number) => (n === 1 ? "1 bay free" : `${n} bays free`),
    noSlots: "No free bay that day for this much work. Try another day.",
    loading: "Checking the lifts…",
    name: "Name",
    phone: "Phone",
    car: "Car (make and model)",
    note: "Note (optional)",
    errors: {
      customer: "Write at least two letters.",
      phone: "Use an Azerbaijani number, e.g. 050 123 45 67.",
      car: "Write the make and model.",
      slot_taken: "Someone just took that time. Pick another one.",
      unknown_service: "One of the jobs is no longer offered. Reload the page.",
      generic: "Something went wrong. Try again.",
    },
  },
  ticket: {
    title: "Your job card",
    show: "Show this code at the gate",
    bay: "Bay",
    arrive: "Arrive",
    work: "Work",
    total: "Total, fixed",
    calendar: "Add to calendar",
    another: "Book another",
    cancelled: "This booking was cancelled.",
    notFound: "No booking with this code.",
  },
  date: (date: string) => {
    const p = parts(date);
    return { wd: EN_DAYS[p.wd], day: String(p.d), month: EN_MONTHS[p.m], long: `${EN_DAYS[p.wd]}, ${p.d} ${EN_MONTHS[p.m]}` };
  },
};

export type Dict = typeof en;

const az: Dict = {
  meta: {
    title: "Rampa — Bakıda üç qaldırıcılı avtoservis",
    description: "İşi seçin, sabit qiyməti görün, boş qaldırıcını tutun. Bakıda avtoservisə onlayn yazılış.",
  },
  nav: { services: "Xidmətlər", prices: "Qiymətlər", how: "Necə işləyir", book: "Yazıl" },
  hero: {
    eyebrow: "Üç qaldırıcılı avtoservis · Bakı",
    title: (when) => (when ? `${when} — maşınınız qaldırıcıda.` : "Maşınınız vaxtında qaldırıcıda."),
    lead: "İşi seçin, qiyməti görün, həqiqətən boş olan qaldırıcını tutun. Zəng yoxdur, “gəlin baxaq” yoxdur.",
    cta: "Servisə yazıl",
    secondary: "Qiymətlər",
  },
  when: (date, start, today, tomorrow) => {
    if (date === today) return `Bu gün ${hhmm(start)}`;
    if (date === tomorrow) return `Sabah ${hhmm(start)}`;
    const p = parts(date);
    return `${p.d} ${AZ_MONTHS[p.m]}, ${hhmm(start)}`;
  },
  floor: {
    live: "Canlı zal",
    caption: "Üç qaldırıcımızda indi nə var. Özü yenilənir.",
    bay: "Qaldırıcı",
    free: "Boş",
    until: (t) => `${t}-dək`,
    next: (t) => `növbəti iş ${t}`,
    freeRest: "axşama qədər boş",
    plan: "Plan",
    planCaption: "İndi bağlıyıq. Bunlar növbəti iş gününün real sifarişləridir, sürətləndirilmiş.",
    today: "Bu gün",
  },
  services: {
    title: "İşi seçin. Hissəni görün.",
    lead: "Hər işin qiyməti və müddəti əvvəlcədən bəllidir. Üzərinə gəlin, harada aparıldığını görün.",
    min: "dəq",
    azn: "AZN",
    parts: {
      engine: "Mühərrik", battery: "Akkumulyator", ac: "Kondisioner", brakes: "Əyləclər",
      wheels: "Təkərlər", axles: "Oxlar", suspension: "Asqı", dash: "Elektronika",
    },
  },
  how: {
    title: "Üç addım, bir iş kartı.",
    steps: [
      ["İşi seçin", "Qiymət və müddət gəlməmişdən əvvəl bəllidir."],
      ["Boş qaldırıcını tutun", "Yalnız qaldırıcının həqiqətən boş olduğu saatları görürsünüz."],
      ["Kodla gəlin", "İş kartınızın kodu var. Darvazada göstərin."],
    ],
  },
  promise: "Maşının altında əlavə iş tapsaq, toxunmazdan əvvəl sizə zəng edirik.",
  prices: { title: "Qiymətlər", work: "İş", time: "Vaxt", price: "Qiymət" },
  footer: {
    address: "Nobel prospekti 44, Bakı",
    hours: "B.e.–Ş. 09:00–19:00, bazar bağlıdır",
    fiction: "Rampa portfolio üçün qurulmuş uydurma avtoservisdir. Sifarişlər real verilənlər bazası sətirləridir; demo işlər hər gün yaradılır.",
  },
  book: {
    title: "Servisə yazıl",
    steps: ["İş", "Gün", "Saat", "Siz"],
    next: "Növbəti",
    back: "Geri",
    confirm: "Təsdiqlə",
    sending: "Göndərilir…",
    total: "Cəmi",
    onLift: "Müddət",
    pickWork: "Ən azı bir iş seçin.",
    closed: "Bağlı",
    freeBays: (n) => `${n} qaldırıcı boş`,
    noSlots: "Bu gün bu həcmdə iş üçün boş qaldırıcı yoxdur. Başqa gün seçin.",
    loading: "Qaldırıcılar yoxlanılır…",
    name: "Ad",
    phone: "Telefon",
    car: "Maşın (marka və model)",
    note: "Qeyd (istəyə bağlı)",
    errors: {
      customer: "Ən azı iki hərf yazın.",
      phone: "Azərbaycan nömrəsi yazın, məsələn 050 123 45 67.",
      car: "Marka və modeli yazın.",
      slot_taken: "Bu saatı indicə başqası tutdu. Başqa saat seçin.",
      unknown_service: "İşlərdən biri artıq təklif olunmur. Səhifəni yeniləyin.",
      generic: "Nəsə alınmadı. Yenidən cəhd edin.",
    },
  },
  ticket: {
    title: "İş kartınız",
    show: "Bu kodu darvazada göstərin",
    bay: "Qaldırıcı",
    arrive: "Gəliş",
    work: "İş",
    total: "Cəmi, sabit",
    calendar: "Təqvimə əlavə et",
    another: "Yeni sifariş",
    cancelled: "Bu sifariş ləğv edilib.",
    notFound: "Bu kodla sifariş yoxdur.",
  },
  date: (date) => {
    const p = parts(date);
    return { wd: AZ_DAYS[p.wd], day: String(p.d), month: AZ_MONTHS[p.m], long: `${p.d} ${AZ_MONTHS[p.m]}, ${AZ_DAYS[p.wd]}` };
  },
};

export const dicts: Record<Locale, Dict> = { az, en };
export const getDict = (locale: Locale) => dicts[locale];

export function serviceName(s: { name_az: string; name_en: string }, locale: Locale) {
  return locale === "az" ? s.name_az : s.name_en;
}
