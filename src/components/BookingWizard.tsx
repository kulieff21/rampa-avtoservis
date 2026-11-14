"use client";

// Four-step booking: work -> day -> time -> contact details.
// Steps 1-3 are client-side state. Step 3 asks /api/availability for free times.
// The last step submits a real <form> to a Server Action (bookAction); the server
// checks everything again, because anything the browser sends can be forged.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { bookAction, type BookState } from "@/app/[locale]/book/actions";
import { getDict, serviceName, type Locale } from "@/i18n/dict";
import type { Service } from "@/lib/bookings";
import { bookableDates, isOpenDay } from "@/lib/schedule";
import { hhmm, toLocal } from "@/lib/time";
import { CarTopView } from "./CarTopView";
import styles from "./BookingWizard.module.css";

type Slot = { start: number; free: number };
type Availability = { status: "idle" | "loading" | "done" | "error"; slots: Slot[] };

export function BookingWizard({ locale, services }: { locale: Locale; services: Service[] }) {
  const dict = getDict(locale);
  const t = dict.book;
  const reduce = useReducedMotion();
  const params = useSearchParams();

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(() => {
    const s = params.get("s");
    return s && services.some((x) => x.slug === s) ? [s] : [];
  });
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [avail, setAvail] = useState<Availability>({ status: "idle", slots: [] });
  // Controlled fields: React resets a form after its action runs, and a visitor
  // who mistyped the phone should not have to type their name again.
  const [contact, setContact] = useState({ customer: "", phone: "", car: "", note: "" });
  const bind = (name: keyof typeof contact) => ({
    name,
    value: contact[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContact((c) => ({ ...c, [name]: e.target.value })),
  });
  const [state, formAction, pending] = useActionState<BookState, FormData>(bookAction, {});

  // "Today" comes from the visitor's clock, so it is computed after mount: the
  // server-rendered HTML and the first client render must match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the clock once on mount
    setDates(bookableDates(toLocal(new Date()).date));
  }, []);

  const chosen = useMemo(() => services.filter((s) => picked.includes(s.slug)), [services, picked]);
  const duration = chosen.reduce((sum, s) => sum + s.duration_min, 0);
  const total = chosen.reduce((sum, s) => sum + s.price_azn, 0);

  // Fetch free times whenever the day or the amount of work changes.
  useEffect(() => {
    if (!date || picked.length === 0) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the loading state for this request
    setAvail({ status: "loading", slots: [] });
    fetch(`/api/availability?date=${date}&services=${picked.join(",")}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { slots: Slot[] }) => setAvail({ status: "done", slots: data.slots }))
      .catch((err) => {
        if (!ctrl.signal.aborted) setAvail({ status: "error", slots: [] });
        return err;
      });
    return () => ctrl.abort();
  }, [date, picked]);

  // Someone took the time while the visitor was typing: back to the time board.
  useEffect(() => {
    if (state.error === "slot_taken") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the server's answer
      setStart(null);
      setStep(2);
      setAvail((a) => ({ ...a, status: "loading" }));
      fetch(`/api/availability?date=${date}&services=${picked.join(",")}`)
        .then((r) => r.json())
        .then((data: { slots: Slot[] }) => setAvail({ status: "done", slots: data.slots }));
    }
    // only when a new answer arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.attempt]);

  const toggle = (slug: string) => {
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));
    setStart(null);
  };

  const canNext = [picked.length > 0, !!date, start !== null, true][step];
  const fieldError = (name: string) =>
    state.error === "invalid" && state.fields?.includes(name)
      ? t.errors[name as keyof typeof t.errors]
      : null;

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -28 },
      };

  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <ol className={styles.lane} aria-label="Steps">
          {t.steps.map((label, i) => (
            <li key={label} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
              <button type="button" onClick={() => i < step && setStep(i)} disabled={i >= step}>
                <span>{String(i + 1).padStart(2, "0")}</span> {label}
              </button>
            </li>
          ))}
        </ol>

        <form action={formAction} className={styles.form} noValidate>
          <input type="hidden" name="locale" value={locale} />
          {picked.map((s) => (
            <input key={s} type="hidden" name="services" value={s} />
          ))}
          <input type="hidden" name="date" value={date ?? ""} />
          <input type="hidden" name="start" value={start ?? ""} />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide} transition={{ duration: 0.22, ease: "easeOut" }}>
              {step === 0 && (
                <div className={styles.services}>
                  {services.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      className={styles.service}
                      aria-pressed={picked.includes(s.slug)}
                      onClick={() => toggle(s.slug)}
                    >
                      <span className={styles.check} aria-hidden />
                      <span className={styles.serviceName}>{serviceName(s, locale)}</span>
                      <span className={styles.serviceMeta}>
                        {s.duration_min} {dict.services.min} · {s.price_azn} {dict.services.azn}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className={styles.days}>
                  {dates.map((d) => {
                    const p = dict.date(d);
                    const open = isOpenDay(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        className={styles.day}
                        aria-pressed={date === d}
                        disabled={!open}
                        onClick={() => {
                          setDate(d);
                          setStart(null);
                        }}
                      >
                        <span className={styles.dayWd}>{p.wd}</span>
                        <span className={styles.dayNo}>{p.day}</span>
                        <span className={styles.dayMonth}>{open ? p.month : t.closed}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div>
                  {avail.status === "loading" && <p className={styles.note}>{t.loading}</p>}
                  {avail.status === "error" && <p className={styles.error}>{t.errors.generic}</p>}
                  {state.error === "slot_taken" && <p className={styles.error}>{t.errors.slot_taken}</p>}
                  {avail.status === "done" && avail.slots.length === 0 && (
                    <p className={styles.note}>{t.noSlots}</p>
                  )}
                  <div className={styles.board}>
                    {avail.slots.map((s, i) => (
                      <button
                        key={s.start}
                        type="button"
                        className={styles.flap}
                        aria-pressed={start === s.start}
                        aria-label={`${hhmm(s.start)}, ${t.freeBays(s.free)}`}
                        style={{ animationDelay: `${Math.min(i, 24) * 28}ms` }}
                        onClick={() => setStart(s.start)}
                      >
                        <span className={styles.flapTime}>
                          {hhmm(s.start)
                            .split("")
                            .map((ch, k) => (
                              <span key={k} className={ch === ":" ? styles.colon : styles.digit}>
                                {ch}
                              </span>
                            ))}
                        </span>
                        <span className={styles.flapFree}>{t.freeBays(s.free)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className={styles.fields}>
                  <Field label={t.name} {...bind("customer")} autoComplete="name" error={fieldError("customer")} />
                  <Field
                    label={t.phone}
                    {...bind("phone")}
                    type="tel"
                    autoComplete="tel"
                    placeholder="050 123 45 67"
                    error={fieldError("phone")}
                  />
                  <Field label={t.car} {...bind("car")} placeholder="Toyota Prius" error={fieldError("car")} />
                  <label className={styles.field}>
                    <span>{t.note}</span>
                    <textarea {...bind("note")} rows={3} maxLength={300} />
                  </label>
                  {/* honeypot: hidden from people and screen readers */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden />
                  {state.error && state.error !== "invalid" && state.error !== "slot_taken" && (
                    <p className={styles.error}>{t.errors[state.error] ?? t.errors.generic}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className={styles.nav}>
            {step > 0 && (
              <button type="button" className="btn btnGhost" onClick={() => setStep(step - 1)}>
                {t.back}
              </button>
            )}
            {step < 3 ? (
              <button
                key="next"
                type="button"
                className="btn"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
              >
                {t.next} <span aria-hidden>→</span>
              </button>
            ) : (
              <button key="submit" type="submit" className="btn btnPaint" disabled={pending}>
                {pending ? t.sending : t.confirm}
              </button>
            )}
            {step === 0 && picked.length === 0 && <span className={styles.hint}>{t.pickWork}</span>}
          </div>
        </form>
      </div>

      <aside className={styles.sheet} aria-live="polite">
        <div className={styles.sheetCar}>
          <CarTopView active={chosen.map((s) => s.part)} />
        </div>
        <div className={styles.sheetBody}>
          <ul className={styles.sheetList}>
            {chosen.map((s) => (
              <motion.li key={s.slug} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <span>{serviceName(s, locale)}</span>
                <span>{s.price_azn}</span>
              </motion.li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>{t.onLift}</dt>
              <dd>
                <Roll value={duration} /> {dict.services.min}
              </dd>
            </div>
            <div>
              <dt>{t.total}</dt>
              <dd className={styles.big}>
                <Roll value={total} /> {dict.services.azn}
              </dd>
            </div>
          </dl>
          {date && (
            <p className={styles.when}>
              {dict.date(date).long}
              {start !== null && ` · ${hhmm(start)}–${hhmm(start + duration)}`}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Roll({ value }: { value: number }) {
  return (
    <span className={styles.roll}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Field({
  label,
  name,
  error,
  ...rest
}: { label: string; name: string; error: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field} data-invalid={!!error}>
      <span>{label}</span>
      <input name={name} aria-invalid={!!error} required {...rest} />
      {error && <em>{error}</em>}
    </label>
  );
}
