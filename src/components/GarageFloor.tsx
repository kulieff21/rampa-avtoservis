"use client";

// The workshop floor on the home page. It receives one day's bookings from the
// server and decides on its own, from a clock, which car is on which lift.
//  - live mode (we are open): the real clock ticks every 15 s and the data is
//    re-fetched every minute with router.refresh(), so cars drive in and out
//    without a page reload.
//  - plan mode (we are closed): the next working day's real bookings are played
//    fast, 09:00 to 19:00 in about 30 seconds, then the day starts again.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import { BAY_IDS, CLOSE, OPEN } from "@/lib/schedule";
import { hhmm, toLocal } from "@/lib/time";
import { CarTopView } from "./CarTopView";
import styles from "./GarageFloor.module.css";

export type FloorJob = { code: string; bay: number; start: number; end: number; parts: string[]; services: string[] };

type Props = {
  locale: Locale;
  date: string;
  isToday: boolean;
  serverNow: number; // minutes, Baku time, when the server rendered
  jobs: FloorJob[];
  serviceNames: Record<string, string>;
};

const BAY_W = 196;
const BAY_GAP = 18;
const bayX = (i: number) => 18 + i * (BAY_W + BAY_GAP);
const CAR_SCALE = 0.68;
const SIM_STEP = 5; // simulated minutes per frame in plan mode
const SIM_FRAME_MS = 250; // 10 hours in 30 seconds

export function GarageFloor({ locale, date, isToday, serverNow, jobs, serviceNames }: Props) {
  const dict = getDict(locale);
  const t = dict.floor;
  const router = useRouter();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(serverNow);
  // Plan mode starts at the busiest moment of the day, so the first thing a
  // visitor sees is cars on the lifts, not a lunch-time gap.
  const [simNow, setSimNow] = useState(() => busiestMinute(jobs));

  useEffect(() => {
    if (isToday || reduce) return;
    const id = setInterval(() => {
      setSimNow((m) => (m + SIM_STEP >= CLOSE ? OPEN : m + SIM_STEP));
    }, SIM_FRAME_MS);
    return () => clearInterval(id);
  }, [isToday, reduce]);

  useEffect(() => {
    if (!isToday) return;
    const tick = setInterval(() => {
      const local = toLocal(new Date());
      if (local.date !== date) router.refresh(); // midnight passed
      else setNow(local.minutes);
    }, 15_000);
    const refresh = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [isToday, date, router]);

  const minuteNow = isToday ? now : simNow;
  const current = (bay: number) =>
    jobs.find((j) => j.bay === bay && j.start <= minuteNow && minuteNow < j.end);
  const nextJob = (bay: number) =>
    jobs.filter((j) => j.bay === bay && j.start > minuteNow).sort((a, b) => a.start - b.start)[0];
  const open = minuteNow >= OPEN && minuteNow < CLOSE;
  const day = dict.date(date);

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <span className={isToday ? styles.dotLive : styles.dotPlan} aria-hidden />
        <strong>{isToday ? t.live : `${t.plan} · ${day.long}`}</strong>
        <span className={styles.clock}>{hhmm(Math.max(OPEN, minuteNow))}</span>
        <span className={styles.caption}>{isToday ? t.caption : t.planCaption}</span>
      </div>
      <svg viewBox="0 0 660 470" className={styles.floor} role="img" aria-label={t.live}>
        <defs>
          <pattern id="epoxy" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#2b2f35" />
            <circle cx="1" cy="2" r="0.6" fill="#353a41" />
            <circle cx="4" cy="5" r="0.5" fill="#24272c" />
          </pattern>
          <linearGradient id="sweep" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="660" height="470" rx="18" fill="url(#epoxy)" />

        {BAY_IDS.map((bay, i) => {
          const x = bayX(i);
          const job = open ? current(bay) : undefined;
          const next = nextJob(bay);
          const progress = job ? (minuteNow - job.start) / (job.end - job.start) : 0;
          return (
            <g key={bay}>
              {/* painted bay lines */}
              <line x1={x} y1="20" x2={x} y2="440" className={styles.paint} />
              <line x1={x + BAY_W} y1="20" x2={x + BAY_W} y2="440" className={styles.paint} />
              <line x1={x} y1="20" x2={x + BAY_W} y2="20" className={styles.paintDash} />
              <text x={x + BAY_W / 2} y="452" className={styles.bayNo} textAnchor="middle">
                {String(bay).padStart(2, "0")}
              </text>

              {/* two-post lift with a status lamp */}
              {[x + 8, x + BAY_W - 18].map((px) => (
                <g key={px}>
                  <rect x={px} y="196" width="10" height="34" rx="2" className={styles.post} />
                  <circle
                    cx={px + 5}
                    cy="190"
                    r="4"
                    className={job ? styles.lampBusy : open ? styles.lampFree : styles.lampOff}
                  />
                </g>
              ))}

              <AnimatePresence>
                {job && (
                  <motion.g
                    key={job.code}
                    initial={reduce ? { opacity: 0 } : { y: 420, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { y: -460, opacity: 0 }}
                    transition={
                      isToday
                        ? { type: "spring", stiffness: 55, damping: 17, delay: reduce ? 0 : 0.25 + i * 0.22 }
                        : { type: "spring", stiffness: 150, damping: 22 } // plan mode: time runs fast
                    }
                  >
                    {/* the shadow spreads once the car is on the lift: it reads as "raised" */}
                    <motion.ellipse
                      cx={x + BAY_W / 2}
                      cy="236"
                      ry="148"
                      className={styles.shadow}
                      initial={{ rx: 58, opacity: 0.5 }}
                      animate={{ rx: reduce ? 58 : 72, opacity: 1 }}
                      transition={{ delay: isToday ? 1.2 : 0.4, duration: isToday ? 1.2 : 0.5, ease: "easeInOut" }}
                    />
                    <g transform={`translate(${x + (BAY_W - 220 * CAR_SCALE) / 2} 82) scale(${CAR_SCALE})`}>
                      <CarTopView active={job.parts} tone="dark" />
                    </g>
                  </motion.g>
                )}
              </AnimatePresence>

              {/* label strip at the back of the bay */}
              <g className={styles.tag}>
                {job ? (
                  <>
                    <text x={x + 12} y="44" className={styles.tagTitle}>
                      {job.parts.slice(0, 2).map((part) => dict.services.parts[part] ?? part).join(" + ")}
                    </text>
                    <text x={x + 12} y="62" className={styles.tagSub}>
                      {t.until(hhmm(job.end))}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={x + 12} y="44" className={styles.tagFree}>
                      {open ? t.free : "—"}
                    </text>
                    <text x={x + 12} y="62" className={styles.tagSub}>
                      {next ? t.next(hhmm(next.start)) : open ? t.freeRest : ""}
                    </text>
                  </>
                )}
              </g>

              {job && (
                <g>
                  <rect x={x + 12} y="72" width={BAY_W - 24} height="3" rx="1.5" className={styles.track} />
                  <motion.rect
                    x={x + 12}
                    y="72"
                    height="3"
                    rx="1.5"
                    className={styles.progress}
                    initial={{ width: 0 }}
                    animate={{ width: (BAY_W - 24) * Math.min(1, Math.max(0, progress)) }}
                    transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
                  />
                </g>
              )}
            </g>
          );
        })}

        {!reduce && <rect className={styles.sweep} width="160" height="470" fill="url(#sweep)" />}
      </svg>

      <Timeline
        locale={locale}
        dayLabel={isToday ? t.today : `${day.wd} ${day.day}`}
        jobs={jobs}
        now={minuteNow}
        serviceNames={serviceNames}
      />
    </div>
  );
}

/** The job start (plus 10 minutes) with the most jobs running at that minute. */
function busiestMinute(jobs: FloorJob[]): number {
  let best = OPEN + 150;
  let bestCount = 0;
  for (const j of jobs) {
    const m = j.start + 10;
    const count = jobs.filter((k) => k.start <= m && m < k.end).length;
    if (count > bestCount) [best, bestCount] = [m, count];
  }
  return best;
}

function Timeline({
  locale,
  dayLabel,
  jobs,
  now,
  serviceNames,
}: {
  locale: Locale;
  dayLabel: string;
  jobs: FloorJob[];
  now: number;
  serviceNames: Record<string, string>;
}) {
  const t = getDict(locale).floor;
  const pct = (m: number) => `${((m - OPEN) / (CLOSE - OPEN)) * 100}%`;
  const hours = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN + i * 60);
  return (
    <div className={styles.timeline}>
      <div className={styles.labels}>
        <span className={styles.today}>{dayLabel}</span>
        {BAY_IDS.map((bay) => (
          <span key={bay}>
            {t.bay} {bay}
          </span>
        ))}
      </div>
      <div className={styles.tracks}>
        <div className={styles.hours} aria-hidden>
          {hours.map((h) => (
            <span key={h} style={{ left: pct(h) }}>
              {hhmm(h).slice(0, 2)}
            </span>
          ))}
        </div>
        {BAY_IDS.map((bay) => (
          <div key={bay} className={styles.track2}>
            {jobs
              .filter((j) => j.bay === bay)
              .map((j) => {
                const state = j.end <= now ? "past" : j.start <= now ? "now" : "future";
                return (
                  <span
                    key={j.code}
                    className={styles.block}
                    data-state={state}
                    style={{ left: pct(j.start), width: `calc(${pct(j.end)} - ${pct(j.start)})` }}
                    title={`${hhmm(j.start)}–${hhmm(j.end)} · ${j.services.map((s) => serviceNames[s] ?? s).join(", ")}`}
                  />
                );
              })}
          </div>
        ))}
        {now >= OPEN && now <= CLOSE && (
          <div className={styles.nowLine} style={{ left: pct(now) }}>
            <span>{hhmm(now)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
