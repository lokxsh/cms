import type { Order, Transaction } from "./types";
import { startOfDay } from "./format";

const DAY = 86_400_000;

export const isRevenue = (o: Order) => o.status !== "cancelled" && o.paymentStatus !== "failed";

// Mock session counts so conversion rate has a denominator. Stable per day.
export function sessionsFor(dayStart: number, orders: number) {
  const seed = Math.sin(dayStart / DAY) * 10000;
  const rate = 0.022 + (seed - Math.floor(seed)) * 0.011;
  return Math.max(orders * 20, Math.round(orders / rate));
}

export function rangeStart(range: "today" | "7d" | "30d" | "90d") {
  const today = startOfDay();
  return range === "today" ? today : today - ({ "7d": 6, "30d": 29, "90d": 89 }[range]) * DAY;
}

export function summarize(orders: Order[], txns: Transaction[], from: number, to: number) {
  const os = orders.filter((o) => o.createdAt >= from && o.createdAt < to);
  const rev = os.filter(isRevenue);
  const revenue = rev.reduce((s, o) => s + o.total, 0);
  const ts = txns.filter((t) => t.createdAt >= from && t.createdAt < to);
  const days = Math.max(1, Math.round((to - from) / DAY));
  let sessions = 0;
  for (let d = 0; d < days; d++) {
    const ds = startOfDay(from + d * DAY);
    sessions += sessionsFor(ds, os.filter((o) => o.createdAt >= ds && o.createdAt < ds + DAY).length || 1);
  }
  return {
    orders: os.length,
    revenue,
    aov: rev.length ? revenue / rev.length : 0,
    conversion: sessions ? (os.length / sessions) * 100 : 0,
    sessions,
    paid: ts.filter((t) => t.status === "captured").length,
    failed: ts.filter((t) => t.status === "failed").length,
    pendingPay: ts.filter((t) => t.status === "pending").length,
    refunds: ts.reduce((s, t) => s + t.refunded, 0),
    refundCount: ts.filter((t) => t.refunded > 0).length,
  };
}

export function dailySeries(orders: Order[], days: number) {
  const today = startOfDay();
  return Array.from({ length: days }, (_, i) => {
    const ds = today - (days - 1 - i) * DAY;
    const os = orders.filter((o) => o.createdAt >= ds && o.createdAt < ds + DAY);
    const rev = os.filter(isRevenue);
    return {
      ts: ds,
      label: new Date(ds).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: rev.reduce((s, o) => s + o.total, 0),
      orders: os.length,
    };
  });
}

export function hourlySeries(orders: Order[]) {
  const today = startOfDay();
  const yesterday = today - DAY;
  const nowH = new Date().getHours();
  // Running totals, so "are we ahead of yesterday?" reads at a glance.
  let t = 0;
  let y = 0;
  return Array.from({ length: 24 }, (_, h) => {
    const end = (h + 1) * 3_600_000;
    t += orders.filter((o) => isRevenue(o) && o.createdAt >= today + h * 3_600_000 && o.createdAt < today + end).reduce((s, o) => s + o.total, 0);
    y += orders.filter((o) => isRevenue(o) && o.createdAt >= yesterday + h * 3_600_000 && o.createdAt < yesterday + end).reduce((s, o) => s + o.total, 0);
    return { label: `${String(h).padStart(2, "0")}:00`, revenue: h <= nowH ? t : null, prev: y };
  });
}
