// A car seen from above, drawn as an X-ray: body outline plus the parts we work on.
// `active` lists part names (services.part in the database); those parts light up.
// No hooks, so it renders on the server and inside client components alike.

import styles from "./CarTopView.module.css";

export const PARTS = ["engine", "battery", "ac", "brakes", "wheels", "axles", "suspension", "dash"] as const;

type Props = {
  active?: string[];
  tone?: "light" | "dark";
  className?: string;
  label?: string;
};

const SPRING = "0,0 -6,5 6,10 -6,15 6,20 -6,25 6,30 0,34";
const WHEELS = [
  { x: 26, y: 66, side: -1 },
  { x: 178, y: 66, side: 1 },
  { x: 26, y: 318, side: -1 },
  { x: 178, y: 318, side: 1 },
];

export function CarTopView({ active = [], tone = "light", className, label }: Props) {
  const on = (part: string) => active.includes(part);
  return (
    <svg
      viewBox="0 0 220 440"
      // Explicit size: when this drawing is nested inside another <svg> (the
      // garage floor), a nested svg without width/height fills its parent.
      width="220"
      height="440"
      className={`${styles.car} ${tone === "dark" ? styles.dark : ""} ${className ?? ""}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* tyres sit under the body so the body edge overlaps them */}
      <g className={styles.part} data-on={on("wheels")}>
        {WHEELS.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="16" height="50" rx="5" />
        ))}
      </g>

      <path
        className={styles.body}
        d="M72 22C92 12 128 12 148 22C170 32 178 52 179 80L182 350C183 392 172 414 150 421C128 428 92 428 70 421C48 414 37 392 38 350L41 80C42 52 50 32 72 22Z"
      />
      <ellipse className={styles.body} cx="34" cy="150" rx="8" ry="5" />
      <ellipse className={styles.body} cx="186" cy="150" rx="8" ry="5" />
      <path className={styles.glass} d="M64 128C90 120 130 120 156 128L160 168C130 160 90 160 60 168Z" />
      <rect className={styles.glass} x="63" y="174" width="94" height="120" rx="10" />
      <path className={styles.glass} d="M64 298C90 304 130 304 156 298L150 334C128 340 92 340 70 334Z" />

      {/* cabin, for scale only */}
      <g className={styles.ghost}>
        <rect x="70" y="200" width="32" height="36" rx="7" />
        <rect x="118" y="200" width="32" height="36" rx="7" />
        <rect x="70" y="252" width="80" height="32" rx="8" />
      </g>

      <g className={styles.part} data-on={on("axles")}>
        <line x1="42" y1="91" x2="178" y2="91" />
        <line x1="42" y1="343" x2="178" y2="343" />
        <circle cx="110" cy="343" r="9" />
      </g>

      <g className={styles.part} data-on={on("suspension")}>
        {WHEELS.map((w, i) => (
          <polyline
            key={i}
            points={SPRING}
            transform={`translate(${w.side < 0 ? 58 : 162} ${w.y + 8})`}
          />
        ))}
      </g>

      <g className={styles.part} data-on={on("brakes")}>
        {WHEELS.map((w, i) => (
          <rect key={i} x={w.side < 0 ? 43 : 170} y={w.y + 13} width="7" height="24" rx="2" />
        ))}
      </g>

      <g className={styles.part} data-on={on("ac")}>
        <rect x="80" y="25" width="60" height="10" rx="3" />
        {[90, 100, 110, 120, 130].map((x) => (
          <line key={x} x1={x} y1="27" x2={x} y2="33" />
        ))}
      </g>

      <g className={styles.part} data-on={on("engine")}>
        <rect x="80" y="44" width="56" height="58" rx="6" />
        {[92, 104, 116, 128].map((x) => (
          <circle key={x} cx={x - 2} cy="66" r="5" />
        ))}
        <line x1="88" y1="86" x2="128" y2="86" />
      </g>

      <g className={styles.part} data-on={on("battery")}>
        <rect x="144" y="44" width="18" height="26" rx="2" />
        <line x1="149" y1="50" x2="149" y2="56" />
        <line x1="146" y1="53" x2="152" y2="53" />
        <line x1="154" y1="62" x2="160" y2="62" />
      </g>

      <g className={styles.part} data-on={on("dash")}>
        <rect x="66" y="176" width="88" height="11" rx="3" />
        <circle cx="86" cy="196" r="10" />
        <rect x="104" y="179" width="14" height="5" rx="1" />
      </g>
    </svg>
  );
}
