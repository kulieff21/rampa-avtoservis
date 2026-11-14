"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className={styles.loginForm}>
      <label>
        <span>Password</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error && <p className={styles.err}>{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
