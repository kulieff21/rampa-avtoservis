import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Header";
import { DEMO_PASSWORD, isDemoLogin } from "@/lib/auth";
import styles from "../admin.module.css";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className={styles.login}>
      <Logo />
      <h1>Workshop board</h1>
      <LoginForm />
      {isDemoLogin() && (
        <p className={styles.demo}>
          Public demo. Password: <code>{DEMO_PASSWORD}</code>
        </p>
      )}
    </main>
  );
}
