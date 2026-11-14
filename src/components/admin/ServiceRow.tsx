"use client";

import { useActionState } from "react";
import { updateServiceAction, type ServiceState } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import type { Service } from "@/lib/bookings";

export function ServiceRow({ service }: { service: Service }) {
  const [state, action, pending] = useActionState<ServiceState, FormData>(updateServiceAction, {});
  return (
    <form action={action} className={styles.serviceRow}>
      <input type="hidden" name="id" value={service.id} />
      <span>
        <strong>{service.name_en}</strong>
        <small>{service.name_az}</small>
      </span>
      <input name="duration_min" type="number" min={15} step={15} defaultValue={service.duration_min} aria-label="Minutes" />
      <input name="price_azn" type="number" min={0} defaultValue={service.price_azn} aria-label="Price in AZN" />
      <input name="active" type="checkbox" defaultChecked={service.active} aria-label="Active" />
      <span className={styles.saveCell}>
        <button className={styles.mini} disabled={pending}>
          {pending ? "…" : "Save"}
        </button>
        {state.saved && <span className={styles.ok}>saved</span>}
        {state.error && <span className={styles.err}>{state.error}</span>}
      </span>
    </form>
  );
}
