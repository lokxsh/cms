// Base currency is a store setting (still undecided by the client), so formatting reads it at call time.
let CURRENCY = "USD";
let fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
let fmtCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 });

export function setCurrency(code: string) {
  CURRENCY = code;
  fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 });
  fmtCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: code, notation: "compact", maximumFractionDigits: 1 });
}
export const currencySymbol = () => fmt.formatToParts(0).find((p) => p.type === "currency")?.value ?? CURRENCY;

const num = new Intl.NumberFormat("en-US");
export const money = (n: number) => fmt.format(n);
export const moneyCompact = (n: number) => fmtCompact.format(n);
export const count = (n: number) => num.format(n);
export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export function date(ts: number, withTime = false, timeZone?: string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: new Date(ts).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    ...(timeZone ? { timeZone } : {}),
  });
}

export function time(ts: number, timeZone?: string) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...(timeZone ? { timeZone } : {}) });
}

export function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 0) {
    const m = Math.round(-s / 60);
    if (m < 60) return `in ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `in ${h} h`;
    return `in ${Math.round(h / 24)} d`;
  }
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return date(ts);
}

export const startOfDay = (ts = Date.now()) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const startOfMonth = (ts = Date.now()) => {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Hour and minute of a timestamp as seen on the wall clock of a given time zone. */
export function localHour(ts: number, timeZone: string) {
  const [h, m] = new Date(ts).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).split(":").map(Number);
  return h + m / 60;
}
export function localDayKey(ts: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ts);
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function delta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Wall-clock date and time in a time zone, converted to a UTC timestamp. */
export function zonedToUtc(dateStr: string, timeStr: string, timeZone: string) {
  const guess = Date.parse(`${dateStr}T${timeStr}:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(guess)
      .map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return guess - (asLocal - guess);
}

/** YYYY-MM-DD and HH:MM of a timestamp in a time zone, for date and time inputs. */
export function zonedParts(ts: number, timeZone: string) {
  const d = localDayKey(ts, timeZone);
  const t = new Date(ts).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return { date: d, time: t };
}
