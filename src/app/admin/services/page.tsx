import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { ServiceRow } from "@/components/admin/ServiceRow";
import { requireAdmin } from "@/lib/auth";
import { listServices } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import styles from "../admin.module.css";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <>
      <AdminBar active="services" />
      <main className={`container ${styles.main}`}>
        <h1 className={styles.h1}>Services and prices</h1>
        <p className={styles.muted}>Changes go live on the public price list at once.</p>
        <Suspense fallback={<p className={styles.muted}>Loading…</p>}>
          <Rows />
        </Suspense>
      </main>
    </>
  );
}

async function Rows() {
  await requireAdmin();
  const services = await listServices(await getDb());
  return (
    <div className={styles.services}>
      <div className={styles.serviceHead}>
        <span>Service</span>
        <span>Minutes</span>
        <span>AZN</span>
        <span>Active</span>
        <span />
      </div>
      {services.map((s) => (
        <ServiceRow key={s.id} service={s} />
      ))}
    </div>
  );
}
