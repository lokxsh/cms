import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, count, cx, delta, money, pct, startOfDay, startOfMonth } from "../lib/format";
import { dailySeries, hourlySeries, isRevenue, summarize } from "../lib/metrics";
import { isMto, productStock } from "../lib/seed";
import type { Order } from "../lib/types";
import { Delta, PageHeader, Panel, Ref, Segmented, StatusBadge, Tape, Thumb } from "../components/ui";
import { OrdersBars, RevenueChart, ShareList } from "../components/charts";
import { SalonDay } from "../components/SalonDay";

type Range = "today" | "month";
const DAY = 86_400_000;

export function Dashboard() {
  const orders = useStore((s) => s.orders);
  const txns = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const reviews = useStore((s) => s.reviews);
  const categories = useStore((s) => s.categories);
  const appointments = useStore((s) => s.appointments);
  const visitors = useStore((s) => s.liveVisitors);
  const fresh = useStore((s) => s.freshIds);
  const settings = useStore((s) => s.settings);
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("today");
  const [chart, setChart] = useState<"revenue" | "orders">("revenue");

  const now = Date.now();
  const from = range === "today" ? startOfDay() : startOfMonth();
  const prevFrom = range === "today" ? from - DAY : startOfMonth(from - DAY);
  const prevTo = prevFrom + (now - from);
  const cur = useMemo(() => summarize(orders, txns, from, now), [orders, txns, from, now]);
  const prev = useMemo(() => summarize(orders, txns, prevFrom, prevTo), [orders, txns, prevFrom, prevTo]);
  const newCustomers = customers.filter((c) => c.joinedAt >= from).length;
  const prevNewCustomers = customers.filter((c) => c.joinedAt >= prevFrom && c.joinedAt < prevTo).length;

  const target = range === "today" ? settings.dailyRevenueTarget : settings.monthlyRevenueTarget;
  const monthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();

  const lowStock = products.filter((p) => p.status === "active" && p.variants.some((v) => v.stock > 0 && v.stock <= p.lowStockAt && !isMto(v.options))).length;
  const soldOut = products.filter((p) => p.status === "active" && p.variants.some((v) => v.stock === 0 && !isMto(v.options))).length;
  const needs = [
    { label: "Orders to confirm", n: orders.filter((o) => o.status === "pending").length, to: "/orders?status=pending" },
    { label: "Awaiting shipment", n: orders.filter((o) => o.status === "processing").length, to: "/orders?status=processing" },
    { label: "Unpaid orders", n: orders.filter((o) => o.paymentStatus === "pending" && o.status !== "cancelled").length, to: "/payments?status=pending" },
    { label: "Appointment requests", n: appointments.filter((a) => a.status === "requested").length, to: "/appointments?status=requested" },
    { label: "Products with sizes sold out", n: soldOut, to: "/catalog/inventory?filter=out", bad: true },
    { label: "Reviews to moderate", n: reviews.filter((r) => r.status === "pending").length, to: "/reviews" },
  ];
  const ops = [
    { label: "delivered in the last 7 days", n: orders.filter((o) => o.status === "delivered" && o.createdAt > now - 7 * DAY).length, to: "/orders?status=delivered" },
    { label: "refunds in the last 7 days", n: orders.filter((o) => o.status === "refunded" && o.createdAt > now - 7 * DAY).length, to: "/orders?status=refunded" },
    { label: "products low on stock", n: lowStock, to: "/catalog/inventory?filter=low" },
  ];

  const series = useMemo(() => (range === "today" ? hourlySeries(orders) : dailySeries(orders, dayOfMonth)), [orders, range, dayOfMonth]);
  const last30 = useMemo(() => orders.filter((x) => x.createdAt >= now - 30 * DAY && isRevenue(x)), [orders, now]);
  const topProducts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of last30) for (const it of o.items) m.set(it.productId, (m.get(it.productId) ?? 0) + it.price * it.qty);
    return products.map((p) => ({ p, rev: m.get(p.id) ?? 0 })).sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [last30, products]);
  const byLine = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    const rootOf = (id: string) => { const c = categories.find((x) => x.id === id); return c?.parentId ?? c?.id; };
    const prodRoot = new Map(products.map((p) => [p.id, rootOf(p.categoryId)]));
    const rows = last30.flatMap((o) => o.items);
    return roots.map((r) => ({ label: r.name, value: rows.filter((i) => prodRoot.get(i.productId) === r.id).reduce((s, i) => s + i.price * i.qty, 0) })).sort((a, b) => b.value - a.value);
  }, [categories, products, last30]);
  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of last30) m.set(o.paymentMethod, (m.get(o.paymentMethod) ?? 0) + o.total);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [last30]);
  const returning = useMemo(() => {
    const first = new Map<string, number>();
    for (const o of orders) first.set(o.customerId, Math.min(first.get(o.customerId) ?? Infinity, o.createdAt));
    const recent = orders.filter((o) => o.createdAt >= now - 30 * DAY);
    const n = recent.filter((o) => first.get(o.customerId)! >= now - 30 * DAY).length;
    return [{ label: "Returning clients", value: recent.length - n }, { label: "New clients", value: n }];
  }, [orders, now]);

  const compare = range === "today" ? "vs. this time yesterday" : "vs. this point last month";
  const kt = settings.kpiTargets;
  const scale = range === "today" ? 1 : monthDays;
  const kpis: { label: string; value: string; d: number | null; invert?: boolean; bad?: boolean; progress?: number; target?: string }[] = [
    { label: "Orders", value: count(cur.orders), d: delta(cur.orders, prev.orders), progress: cur.orders / (kt.orders * scale), target: count(kt.orders * scale) },
    { label: "Avg. order value", value: money(Math.round(cur.aov)), d: delta(cur.aov, prev.aov), progress: cur.aov / kt.aov, target: money(kt.aov) },
    { label: "Conversion rate", value: pct(cur.conversion, 2), d: delta(cur.conversion, prev.conversion), progress: cur.conversion / kt.conversion, target: pct(kt.conversion, 1) },
    { label: "Successful payments", value: count(cur.paid), d: delta(cur.paid, prev.paid), progress: cur.paid / (kt.paid * scale), target: count(kt.paid * scale) },
    { label: "Failed payments", value: count(cur.failed), d: delta(cur.failed, prev.failed), invert: true, bad: cur.failed > 0 },
    { label: "New clients", value: count(newCustomers), d: delta(newCustomers, prevNewCustomers), progress: newCustomers / (kt.newClients * scale), target: count(kt.newClients * scale) },
  ];

  return (
    <>
      <PageHeader
        title={range === "today" ? new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        actions={<Segmented label="Period" value={range} onChange={setRange} items={[{ value: "today", label: "Today" }, { value: "month", label: "This month" }]} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-50 motion-reduce:hidden" /><span className="relative inline-flex size-2 rounded-full bg-ok" /></span>
          <span><span className="num font-medium text-ink">{visitors}</span> on the store now</span>
        </span>
        <span><span className="num font-medium text-ink">{orders.filter((o) => o.status === "processing").length}</span> orders being processed</span>
        <span><span className="num font-medium text-ink">{txns.filter((t) => t.status === "pending").length}</span> payments in progress</span>
        <span><span className={cx("num font-medium", lowStock ? "text-warn" : "text-ink")}>{lowStock}</span> low-stock products</span>
      </div>

      <section aria-label="Needs you" className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        {needs.map((n) => (
          <Link key={n.label} to={n.to} className="group flex flex-col gap-1.5 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2">
            <span className={cx("num text-[24px] font-medium leading-none", n.n === 0 ? "text-faint" : n.bad ? "text-bad" : "text-ink")}>{n.n}</span>
            <span className="flex items-center justify-between gap-2 text-[12.5px] leading-snug text-muted group-hover:text-ink">{n.label}<ArrowRight size={12} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" /></span>
          </Link>
        ))}
      </section>

      <section className="mb-4 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line lg:grid-cols-[1.2fr_2fr]">
        <div className="flex flex-col justify-between gap-6 bg-surface p-5">
          <div>
            <div className="text-[12.5px] text-muted">Revenue {range === "today" ? "today" : "this month"}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="num text-[34px] font-medium leading-tight tracking-[-0.035em]">{money(cur.revenue)}</span>
              <Delta value={delta(cur.revenue, prev.revenue)} />
            </div>
            <div className="text-[12px] text-faint">{compare}</div>
          </div>
          <div>
            <Tape value={cur.revenue / target} major={4} height={12} label="Revenue against target" />
            <div className="mt-2 flex justify-between gap-3 text-[12px] text-muted">
              <span><span className="num text-ink">{Math.round((cur.revenue / target) * 100)}%</span> of the {money(target)} target</span>
              <Link to="/settings/store" className="underline decoration-line-strong underline-offset-2 hover:text-ink">Edit target</Link>
            </div>
            {range === "month" && (
              <div className="mt-4">
                <Tape value={dayOfMonth / monthDays} major={4} height={6} animate={false} label="Month elapsed" />
                <div className="num mt-1.5 text-[12px] text-muted">Day {dayOfMonth} of {monthDays}</div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 bg-surface px-4 py-3.5">
              <span className="text-[12px] text-muted">{k.label}</span>
              <span className="flex items-baseline justify-between gap-2">
                <span className={cx("num text-[20px] font-medium tracking-[-0.02em]", k.bad && "text-bad")}>{k.value}</span>
                <Delta value={k.d} invert={k.invert} />
              </span>
              {k.progress !== undefined ? (
                <div className="mt-1.5">
                  <Tape value={k.progress} major={4} height={6} label={`${k.label} against target`} />
                  <span className="mt-1 block text-[11px] text-faint">target {k.target}</span>
                </div>
              ) : (
                <span className="mt-1.5 text-[11px] text-faint">{cur.failed ? "check Payments, Failed" : "none today"}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <Panel
        className="mb-4"
        title="Salon today"
        description="Each atelier in its own local time. Gold shows how far the day has run."
        actions={<Link to="/appointments" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">Appointments <ArrowRight size={12} /></Link>}
        bodyClass=""
      >
        <SalonDay dense onSelect={(a) => navigate(`/appointments?a=${a.id}`)} />
      </Panel>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title={chart === "revenue" ? (range === "today" ? "Revenue so far today" : "Revenue by day") : range === "today" ? "Orders by hour" : "Orders by day"}
          description={range === "today" && chart === "revenue" ? "Running total. The dashed line is yesterday." : undefined}
          actions={<Segmented label="Chart" value={chart} onChange={setChart} items={[{ value: "revenue", label: "Revenue" }, { value: "orders", label: "Orders" }]} />}
        >
          {chart === "revenue" ? <RevenueChart data={series} compare={range === "today" ? "Yesterday" : undefined} /> : <OrdersBars data={range === "today" ? hourlyOrders(orders) : series} height={260} />}
        </Panel>

        <Panel title="Latest orders" actions={<Link to="/orders" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">All orders <ArrowRight size={12} /></Link>} bodyClass="">
          <ul>
            {orders.slice(0, 6).map((o) => {
              const c = customers.find((x) => x.id === o.customerId);
              return (
                <li key={o.id} className={cx("border-t border-line first:border-0", fresh.includes(o.id) && "row-new")}>
                  <Link to={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                    <Thumb src={o.items[0]?.image} alt="" size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2"><Ref>{o.number}</Ref><span className="truncate text-[12.5px] text-muted">{c?.name}</span></div>
                      <div className="mt-1"><StatusBadge status={o.paymentStatus} /></div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[13px] font-medium">{money(o.total)}</div>
                      <div className="text-[11.5px] text-muted">{ago(o.createdAt)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Top sellers, 30 days" bodyClass="" className="xl:col-span-2">
          <ul>
            {topProducts.map(({ p, rev }) => (
              <li key={p.id} className="border-t border-line first:border-0">
                <Link to={`/catalog/products/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2">
                  <Thumb src={p.image} alt="" size={40} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
                  <span className="num hidden text-[12px] text-muted sm:inline">{productStock(p)} in stock</span>
                  <span className="num w-20 text-right text-[13px] font-medium">{money(rev)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Sales by line, 30 days"><ShareList rows={byLine} fmt={money} /></Panel>
        <div className="grid gap-4">
          <Panel title="Payment methods, 30 days"><ShareList rows={byMethod} fmt={money} /></Panel>
          <Panel title="New vs. returning, 30 days"><ShareList rows={returning} fmt={(n) => `${n} orders`} /></Panel>
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-muted">
        {ops.map((o) => (
          <Link key={o.label} to={o.to} className="hover:text-ink"><span className="num font-medium text-ink">{o.n}</span> {o.label}</Link>
        ))}
      </p>
    </>
  );
}

function hourlyOrders(orders: Order[]) {
  const today = startOfDay();
  const nowH = new Date().getHours();
  return Array.from({ length: nowH + 1 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}:00`,
    orders: orders.filter((o) => o.createdAt >= today + h * 3_600_000 && o.createdAt < today + (h + 1) * 3_600_000).length,
  }));
}
