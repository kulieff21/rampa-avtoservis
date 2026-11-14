// A second root layout: /admin has its own <html>, no public header or footer.

import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-archivo" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jet" });

export const metadata: Metadata = {
  title: { default: "Rampa admin", template: "%s · Rampa admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
