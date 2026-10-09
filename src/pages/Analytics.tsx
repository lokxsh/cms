import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DownloadSimple } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { count, cx, delta, downloadCsv, money, pct, startOfDay } from "../lib/format";
import { dailySeries, isRevenue } from "../lib/metrics";
import { isMto, productStock } from "../lib/seed";
import { Button, Delta, PageHeader, Panel, Segmented, Tabs, Tape, Thumb, td, th, tr } from "../components/ui";
import { OrdersBars, RevenueChart, ShareList, StackedBars } from "../components/charts";

type View = "sales" | "products" | "customers" | "payments" | "inventory";
const DAY = 86_400_000;

export function Analytics() {
  const orders = useStore((s) => s.orders);
  const txns = useStore((s) => s.transactions);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const customers = useStore((s) => s.customers);
  const toast = useStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) || "sales";
  const setView = (v: View) => setParams(v === "sales" ? {} : { view: v });
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const n = Number(days);
  const from = startOfDay() - (n - 1) * DAY;
  const prevFrom = from - n * DAY;

  const inRange = useMemo(() => orders.filter((o) => o.createdAt >= from), [orders, from]);
  const prevRange = useMemo(() => orders.filter((o) => o.createdAt >= prevFrom && o.createdAt < from), [orders, from, prevFrom]);
  const rev = (list: typeof orders) => list.filter(isRevenue).reduce((s, o) => s + o.total, 0);
  const aov = (list: typeof orders) => rev(list) / Math.max(1, list.filter(isRevenue).length);
  const series = useMemo(() => dailySeries(orders, n), [orders, n]);
  const grouped = useMemo(() => {
    if (n <= 7) return series;
    const size = n === 30 ? 3 : 7;
    const out: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < series.length; i += size) {
      const chunk = series.slice(i, i + size);
      out.push({ label: chunk[0].label, revenue: chunk.reduce((s, d) => s + d.revenue, 0), orders: chunk.reduce((s, d) => s + d.orders, 0) });
    }
    return out;
  }, [series, n]);

  const productRows = useMemo(() => {
    const m = new Map<string, { units: number; revenue: number; orders: number }>();
    for (const o of inRange.filter(isRevenue)) for (const it of o.items) {
      const r = m.get(it.productId) ?? { units: 0, revenue: 0, orders: 0 };
      r.units += it.qty; r.revenue += it.qty * it.price; r.orders++;
      m.set(it.productId, r);
    }
    return products.map((p) => {
      const r = m.get(p.id) ?? { units: 0, revenue: 0, orders: 0 };
      return { p, ...r, margin: r.revenue ? ((r.revenue - r.units * p.cost) / r.revenue) * 100 : null };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [inRange, products]);

  const byLine = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    const rootOf = (id: string) => { const c = categories.find((x) => x.id === id); return c?.parentId ?? c?.id; };
    const prodRoot = new Map(products.map((p) => [p.id, rootOf(p.categoryId)]));
    return roots.map((r) => ({ label: r.name, value: inRange.filter(isRevenue).flatMap((o) => o.items).filter((i) => prodRoot.get(i.productId) === r.id).reduce((s, i) => s + i.qty * i.price, 0) })).sort((a, b) => b.value - a.value);
  }, [categories, products, inRange]);

  const firstOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.customerId, Math.min(m.get(o.customerId) ?? Infinity, o.createdAt));
    return m;
  }, [orders]);
  const newVsReturning = useMemo(() => {
    const size = n === 7 ? 1 : n === 30 ? 3 : 7;
    const out: { label: string; new: number; returning: number }[] = [];
    for (let i = 0; i < n; i += size) {
      const a = from + i * DAY, b = a + size * DAY;
      const os = orders.filter((o) => o.createdAt >= a && o.createdAt < b);
      out.push({ label: new Date(a).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), new: os.filter((o) => firstOrder.get(o.customerId)! >= a).length, returning: os.filter((o) => firstOrder.get(o.customerId)! < a).length });
    }
    return out;
  }, [orders, from, n, firstOrder]);
  const byCountry = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of inRange.filter(isRevenue)) m.set(o.address.country, (m.get(o.address.country) ?? 0) + o.total);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [inRange]);
  const topCustomers = useMemo(() => {
    const m = new Map<string, { orders: number; spent: number }>();
    for (const o of inRange.filter(isRevenue)) { const r = m.get(o.customerId) ?? { orders: 0, spent: 0 }; r.orders++; r.spent += o.total; m.set(o.customerId, r); }
    return [...m.entries()].sort((a, b) => b[1].spent - a[1].spent).slice(0, 8).map(([id, r]) => ({ c: customers.find((c) => c.id === id)!, ...r }));
  }, [inRange, customers]);

  const txIn = txns.filter((t) => t.createdAt >= from);
  const methods = ["Card", "Apple Pay", "PayPal", "Bank transfer", "Cash on delivery"] as const;
  const methodRows = methods.map((m) => {
    const ts = txIn.filter((t) => t.method === m);
    const os = inRange.filter((o) => o.paymentMethod === m);
    const ok = ts.filter((t) => t.status !== "failed" && t.status !== "pending").length;
    return { m, orders: os.length, value: rev(os), success: ts.length ? (ok / ts.length) * 100 : null, failed: ts.filter((t) => t.status === "failed").length, refunded: ts.reduce((s, t) => s + t.refunded, 0) };
  });
  const reasons = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txIn) if (t.failureReason) m.set(t.failureReason, (m.get(t.failureReason) ?? 0) + 1);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [txIn]);

  const inventoryRows = useMemo(() => products.filter((p) => p.status !== "archived").map((p) => {
    const sold = productRows.find((r) => r.p.id === p.id)?.units ?? 0;
    const stock = productStock(p);
    const sellable = p.variants.filter((v) => !isMto(v.options));
    return { p, stock, sold, value: stock * p.cost, sellThrough: sold + stock ? sold / (sold + stock) : 0, cover: sold ? Math.round(stock / (sold / n)) : null, outOptions: sellable.filter((v) => v.stock === 0).length, options: sellable.length };
  }).sort((a, b) => b.sellThrough - a.sellThrough), [products, productRows, n]);

  const headline = [
    { label: "Net revenue", value: money(rev(inRange)), d: delta(rev(inRange), rev(prevRange)) },
    { label: "Orders", value: count(inRange.length), d: delta(inRange.length, prevRange.length) },
    { label: "Avg. order value", value: money(Math.round(aov(inRange))), d: delta(aov(inRange), aov(prevRange)) },
    { label: "Discounts given", value: money(inRange.reduce((s, o) => s + o.discount, 0)), d: delta(inRange.reduce((s, o) => s + o.discount, 0), prevRange.reduce((s, o) => s + o.discount, 0)), invert: true },
    { label: "Cancelled or refunded", value: pct((inRange.filter((o) => o.status === "cancelled" || o.status === "refunded").length / Math.max(1, inRange.length)) * 100), d: null as number | null, invert: true },
  ];

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (view === "products") downloadCsv(`rinaz-products-${stamp}.csv`, [["Product", "SKU", "Pieces sold", "Orders", "Revenue", "Margin %"], ...productRows.map((r) => [r.p.name, r.p.sku, r.units, r.orders, r.revenue, r.margin?.toFixed(1) ?? ""])]);
    else if (view === "payments") downloadCsv(`rinaz-payments-${stamp}.csv`, [["Method", "Orders", "Value", "Success %", "Failed", "Refunded"], ...methodRows.map((r) => [r.m, r.orders, r.value, r.success?.toFixed(1) ?? "", r.failed, r.refunded])]);
    else if (view === "inventory") downloadCsv(`rinaz-inventory-${stamp}.csv`, [["Product", "In stock", "Sold", "Sell-through %", "Days of cover", "Stock value at cost"], ...inventoryRows.map((r) => [r.p.name, r.stock, r.sold, (r.sellThrough * 100).toFixed(0), r.cover ?? "", r.value])]);
    else if (view === "customers") downloadCsv(`rinaz-customers-${stamp}.csv`, [["Client", "Country", "Orders", "Spent"], ...topCustomers.map((r) => [r.c.name, r.c.country, r.orders, r.spent])]);
    else downloadCsv(`rinaz-sales-${stamp}.csv`, [["Date", "Revenue", "Orders"], ...series.map((d) => [new Date(d.ts).toISOString().slice(0, 10), d.revenue, d.orders])]);
    toast("Report exported", "info");
  };

  return (
    <>
      <PageHeader title="Analytics" actions={<><Segmented label="Period" value={days} onChange={setDays} items={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} /><Button icon={DownloadSimple} onClick={exportCsv}>Export report</Button></>} />

      <section className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-5">
        {headline.map((k) => (
          <div key={k.label} className="bg-surface p-4">
            <div className="text-[12px] text-muted">{k.label}</div>
            <div className="num mt-1 text-[20px] font-medium tracking-[-0.02em]">{k.value}</div>
            {k.d !== null ? <Delta value={k.d} invert={k.invert} /> : <span className="text-[12px] text-faint">of orders this period</span>}
          </div>
        ))}
      </section>

      <Tabs className="mb-4" value={view} onChange={setView} items={[{ value: "sales", label: "Sales" }, { value: "products", label: "Products" }, { value: "customers", label: "Customers" }, { value: "payments", label: "Payments" }, { value: "inventory", label: "Inventory" }]} />

      {view === "sales" && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel title="Revenue over time" className="lg:col-span-2"><RevenueChart data={series} height={290} /></Panel>
          <Panel title="Orders over time"><OrdersBars data={grouped} /></Panel>
          <Panel title="Sales by line"><ShareList rows={byLine} fmt={money} /></Panel>
        </div>
      )}

      {view === "products" && (
        <Panel title="Product performance" description="Sorted by revenue. Margin uses each product's cost." bodyClass="">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="bg-surface-2"><th className={th}>Product</th><th className={th + " text-right"}>Pieces sold</th><th className={th + " text-right"}>Orders</th><th className={th + " text-right"}>Revenue</th><th className={th + " text-right"}>Margin</th></tr></thead>
              <tbody>
                {productRows.filter((r) => r.p.status !== "archived").map((r) => (
                  <tr key={r.p.id} className={tr}>
                    <td className={td}><Link to={`/catalog/products/${r.p.id}`} className="flex items-center gap-3 hover:underline"><Thumb src={r.p.image} alt="" size={40} /><span className="max-w-72 truncate">{r.p.name}</span></Link></td>
                    <td className={td + " num text-right"}>{r.units}</td>
                    <td className={td + " num text-right text-muted"}>{r.orders}</td>
                    <td className={td + " num text-right font-medium"}>{money(r.revenue)}</td>
                    <td className={cx(td, "num text-right", r.margin !== null && r.margin < 40 ? "text-warn" : "text-muted")}>{r.margin === null ? "n/a" : pct(r.margin, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {view === "customers" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="New vs. returning clients" className="lg:col-span-2" description="Orders from first-time buyers against clients who ordered before">
            <StackedBars data={newVsReturning} keys={[{ key: "returning", name: "Returning", color: "var(--ink)" }, { key: "new", name: "New", color: "var(--line-strong)" }]} />
          </Panel>
          <Panel title="Revenue by country"><ShareList rows={byCountry} fmt={money} /></Panel>
          <Panel title="Top clients" bodyClass="">
            <ul>
              {topCustomers.map((r) => (
                <li key={r.c.id} className="border-t border-line first:border-0">
                  <Link to={`/customers?c=${r.c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-surface-2">
                    <span className="flex-1 truncate">{r.c.name}<span className="ml-2 text-muted">{r.c.country}</span></span>
                    <span className="num text-muted">{r.orders} order{r.orders > 1 ? "s" : ""}</span>
                    <span className="num w-24 text-right font-medium">{money(r.spent)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {view === "payments" && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="By payment method" bodyClass="">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead><tr className="bg-surface-2"><th className={th}>Method</th><th className={th + " text-right"}>Orders</th><th className={th + " text-right"}>Value</th><th className={th + " text-right"}>Success</th><th className={th + " text-right"}>Failed</th><th className={th + " text-right"}>Refunded</th></tr></thead>
                <tbody>
                  {methodRows.map((r) => (
                    <tr key={r.m} className={tr}>
                      <td className={td + " font-medium"}>{r.m}</td>
                      <td className={td + " num text-right"}>{r.orders}</td>
                      <td className={td + " num text-right"}>{money(r.value)}</td>
                      <td className={cx(td, "num text-right", r.success !== null && r.success < 85 && "text-warn")}>{r.success === null ? "n/a" : pct(r.success)}</td>
                      <td className={cx(td, "num text-right", r.failed ? "text-bad" : "text-muted")}>{r.failed}</td>
                      <td className={td + " num text-right text-muted"}>{money(r.refunded)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Why payments failed">{reasons.length ? <ShareList rows={reasons} fmt={(v) => `${v}×`} /> : <p className="text-[13px] text-muted">No failed payments in this period.</p>}</Panel>
        </div>
      )}

      {view === "inventory" && (
        <div className="grid gap-4">
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-4">
            {[
              ["Stock value at cost", money(inventoryRows.reduce((s, r) => s + r.value, 0))],
              ["Pieces on hand", count(inventoryRows.reduce((s, r) => s + r.stock, 0))],
              ["Pieces sold", count(inventoryRows.reduce((s, r) => s + r.sold, 0))],
              ["Options sold out", count(inventoryRows.reduce((s, r) => s + r.outOptions, 0))],
            ].map(([k, v]) => <div key={k} className="bg-surface p-4"><div className="text-[12px] text-muted">{k}</div><div className="num mt-1 text-[20px] font-medium">{v}</div></div>)}
          </section>
          <Panel title="Sell-through" description={`Share of available pieces sold in the last ${n} days. Days of cover is how long current stock lasts at this pace.`} bodyClass="">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead><tr className="bg-surface-2"><th className={th}>Product</th><th className={th + " w-[220px]"}>Sell-through</th><th className={th + " text-right"}>In stock</th><th className={th + " text-right"}>Sold</th><th className={th + " text-right"}>Days of cover</th><th className={th + " text-right"}>Sold-out options</th></tr></thead>
                <tbody>
                  {inventoryRows.map((r) => (
                    <tr key={r.p.id} className={tr}>
                      <td className={td}><Link to={`/catalog/products/${r.p.id}`} className="flex items-center gap-3 hover:underline"><Thumb src={r.p.image} alt="" size={40} /><span className="max-w-64 truncate">{r.p.name}</span></Link></td>
                      <td className={td}><div className="flex items-center gap-3"><span className="num w-9 text-right">{Math.round(r.sellThrough * 100)}%</span><Tape value={r.sellThrough} major={4} height={8} animate={false} label="Sell-through" className="max-w-36" /></div></td>
                      <td className={td + " num text-right"}>{r.stock}</td>
                      <td className={td + " num text-right text-muted"}>{r.sold}</td>
                      <td className={cx(td, "num text-right", r.cover !== null && r.cover < 14 ? "text-warn" : "text-muted")}>{r.cover === null ? "no sales" : `${r.cover} d`}</td>
                      <td className={cx(td, "num text-right", r.outOptions ? "text-bad" : "text-muted")}>{r.outOptions} of {r.options}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
