import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";
import { Logo } from "../Header";

export function AdminBar({ active }: { active: "board" | "services" }) {
  return (
    <header className={styles.bar}>
      <div className={`container ${styles.barInner}`}>
        <Link href="/admin" className={styles.home}>
          <Logo />
          <span>admin</span>
        </Link>
        <nav>
          <Link href="/admin" aria-current={active === "board" ? "page" : undefined}>
            Board
          </Link>
          <Link href="/admin/services" aria-current={active === "services" ? "page" : undefined}>
            Services
          </Link>
          <Link href="/en" target="_blank">
            Site ↗
          </Link>
        </nav>
        <form action={logoutAction}>
          <button className="btn btnGhost">Sign out</button>
        </form>
      </div>
    </header>
  );
}
