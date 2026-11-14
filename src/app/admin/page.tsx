// Workshop board: one column per bay, one card per booking, on a 09:00-19:00 axis.
// ?date=YYYY-MM-DD picks the day; ?code=R-XXXXX jumps to that booking's day.

import Link from "next/link";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { requireAdmin } from "@/lib/auth";
import { bookingByCode, dayBookings, listServices, type DayBooking, type Status } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { BAY_IDS, CLOSE, OPEN } from "@/lib/schedule";
import { addDays, hhmm, isIsoDate, toLocal } from "@/lib/time";
import { setStatusAction } from "./actions";
import styles from "./admin.module.css";

export const metadata = { title: "Board" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <AdminBar active="board" />
      <main className={`container ${styles.main}`}>
        <Suspense fallback={<p className={styles.muted}>Loading the board…</p>}>
          <Board searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

const NEXT: Record<Status, { status: Status; label: string }[]> = {
  booked: [
    { status: "in_progress", label: "Start" },
    { status: "cancelled", label: "Cancel" },
  ],
  in_progress: [{ status: "done", label: "Done" }],
  done: [],
  cancelled: [],
};

async function Board({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const now = toLocal(new Date());

  let date = typeof sp.date === "string" && isIsoDate(sp.date) ? sp.date : now.date;
  const code = typeof sp.code === "string" ? sp.code.toUpperCase() : null;
  if (code) {
    const found = await bookingByCode(db, code);
    if (found) date = found.date;
  }

  const [jobs, services] = await Promise.all([
    dayBookings(db, date, { includeCancelled: true }),
    listServices(db),
  ]);
  const names = Object.fromEntries(services.map((s) => [s.slug, s.name_en]));
  const live = jobs.filter((j) => j.status !== "cancelled");
  const revenue = live.reduce((sum, j) => sum + j.total, 0);
  const minutes = live.reduce((sum, j) => sum + (j.end - j.start), 0);
  const load = Math.round((minutes / ((CLOSE - OPEN) * BAY_IDS.length)) * 100);
  const top = (m: number) => `${((m - OPEN) / (CLOSE - OPEN)) * 100}%`;
  const hours = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN + i * 60);

  return (
    <>
      <div className={styles.dayBar}>
        <Link href={`/admin?date=${addDays(date, -1)}`} className="btn btnGhost" aria-label="Previous day">
          ←
        </Link>
        <h1>{date}</h1>
        <Link href={`/admin?date=${addDays(date, 1)}`} className="btn btnGhost" aria-label="Next day">
          →
        </Link>
        {date !== now.date && (
          <Link href="/admin" className={styles.todayLink}>
            Today
          </Link>
        )}
        <dl className={styles.stats}>
          <div>
            <dt>Jobs</dt>
            <dd>{live.length}</dd>
          </div>
          <div>
            <dt>Load</dt>
            <dd>{load}%</dd>
          </div>
          <div>
            <dt>Revenue</dt>
            <dd>{revenue} AZN</dd>
          </div>
        </dl>
      </div>

      <div className={styles.board}>
        <div className={styles.axis} aria-hidden>
          {hours.map((h) => (
            <span key={h} style={{ top: top(h) }}>
              {hhmm(h)}
            </span>
          ))}
        </div>
        {BAY_IDS.map((bay) => (
          <section key={bay} className={styles.column} aria-label={`Bay ${bay}`}>
            <h2>Bay {bay}</h2>
            <div className={styles.lane}>
              {date === now.date && now.minutes >= OPEN && now.minutes <= CLOSE && (
                <div className={styles.now} style={{ top: top(now.minutes) }} />
              )}
              {jobs
                .filter((j) => j.bay === bay)
                .map((j) => (
                  <JobCard key={j.id} job={j} names={names} highlight={j.code === code} top={top} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function JobCard({
  job,
  names,
  highlight,
  top,
}: {
  job: DayBooking;
  names: Record<string, string>;
  highlight: boolean;
  top: (m: number) => string;
}) {
  return (
    <article
      className={styles.job}
      data-status={job.status}
      data-highlight={highlight}
      style={{ top: top(job.start), height: `calc(${top(job.end)} - ${top(job.start)} - 4px)` }}
    >
      <header>
        <strong>
          {hhmm(job.start)}–{hhmm(job.end)}
        </strong>
        <span className={styles.code}>{job.code}</span>
      </header>
      <p className={styles.car}>
        {job.car} · {job.total} AZN {job.source === "demo" && <em>demo</em>}
      </p>
      <p className={styles.small}>{job.services.map((s) => names[s] ?? s).join(", ")}</p>
      <p className={styles.small}>
        {job.customer} · <a href={`tel:${job.phone}`}>{job.phone}</a>
      </p>
      {job.note && <p className={styles.small}>“{job.note}”</p>}
      <div className={styles.jobActions}>
        <span className={styles.status}>{job.status.replace("_", " ")}</span>
        {NEXT[job.status].map((n) => (
          <form key={n.status} action={setStatusAction}>
            <input type="hidden" name="id" value={job.id} />
            <input type="hidden" name="status" value={n.status} />
            <button className={styles.mini} data-kind={n.status}>
              {n.label}
            </button>
          </form>
        ))}
      </div>
    </article>
  );
}
