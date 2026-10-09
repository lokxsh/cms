import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DownloadSimple, Printer, Receipt, Truck, Package as PackageIcon, X } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, cx, date, downloadCsv, money } from "../lib/format";
import { STAGES, stageOf } from "../lib/orders";
import type { OrderStatus, PaymentMethod } from "../lib/types";
import { Button, Checkbox, Confirm, EmptyState, PageHeader, Pagination, Ref, SearchInput, Select, SelectionBar, StageTape, StatusBadge, Tabs, Thumb, td, th, tr } from "../components/ui";

type Tab = "all" | OrderStatus;
const PAGE = 15;
const METHODS: PaymentMethod[] = ["Card", "Apple Pay", "PayPal", "Bank transfer", "Cash on delivery"];

export function Orders() {
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const fresh = useStore((s) => s.freshIds);
  const setOrderStatus = useStore((s) => s.setOrderStatus);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("status") as Tab) || "all";
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("any");
  const [method, setMethod] = useState<"any" | PaymentMethod>("any");
  const [country, setCountry] = useState("any");
  const [when, setWhen] = useState("any");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmCancel, setConfirmCancel] = useState(false);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const countries = useMemo(() => [...new Set(orders.map((o) => o.address.country))].sort(), [orders]);

  const base = useMemo(() => {
    const t = q.trim().toLowerCase();
    const since = when === "any" ? 0 : Date.now() - Number(when) * 86_400_000;
    return orders.filter((o) => {
      if (pay !== "any" && o.paymentStatus !== pay) return false;
      if (method !== "any" && o.paymentMethod !== method) return false;
      if (country !== "any" && o.address.country !== country) return false;
      if (o.createdAt < since) return false;
      if (!t) return true;
      const c = custMap.get(o.customerId);
      return o.number.toLowerCase().includes(t) || c?.name.toLowerCase().includes(t) || c?.email.includes(t) || c?.phone.replace(/\s/g, "").includes(t.replace(/\s/g, "")) || o.tracking?.toLowerCase().includes(t) || o.items.some((i) => i.name.toLowerCase().includes(t));
    });
  }, [orders, q, pay, method, country, when, custMap]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: base.length };
    for (const o of base) m[o.status] = (m[o.status] ?? 0) + 1;
    return m;
  }, [base]);

  const rows = tab === "all" ? base : base.filter((o) => o.status === tab);
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);
  const allSel = visible.length > 0 && visible.every((o) => sel.has(o.id));

  const setTab = (t: Tab) => {
    setPage(1);
    setSel(new Set());
    setParams(t === "all" ? {} : { status: t });
  };
  const hasFilters = q || pay !== "any" || method !== "any" || when !== "any" || country !== "any";

  const bulk = (status: OrderStatus, label: string) => {
    const ids = [...sel];
    setOrderStatus(ids, status);
    toast(`${ids.length} order${ids.length > 1 ? "s" : ""} ${label}`);
    setSel(new Set());
  };

  const exportCsv = () => {
    const list = sel.size ? rows.filter((o) => sel.has(o.id)) : rows;
    downloadCsv(`rinaz-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order", "Date", "Client", "Email", "Country", "Items", "Total", "Status", "Payment", "Method", "Carrier", "Tracking"],
      ...list.map((o) => {
        const c = custMap.get(o.customerId);
        return [o.number, new Date(o.createdAt).toISOString(), c?.name ?? "", c?.email ?? "", o.address.country, o.items.map((i) => `${i.name} (${i.variant})`).join("; "), o.total, o.status, o.paymentStatus, o.paymentMethod, o.carrier ?? "", o.tracking ?? ""];
      }),
    ]);
    toast(`Exported ${list.length} orders`, "info");
  };

  return (
    <>
      <PageHeader title="Orders" actions={<Button icon={DownloadSimple} onClick={exportCsv}>Export CSV</Button>} />

      <div className="rounded-[6px] border border-line bg-surface">
        <div className="px-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "All orders", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending ?? 0 },
              { value: "processing", label: "Processing", count: counts.processing ?? 0 },
              { value: "shipped", label: "Shipped", count: counts.shipped ?? 0 },
              { value: "delivered", label: "Delivered", count: counts.delivered ?? 0 },
              { value: "cancelled", label: "Cancelled", count: counts.cancelled ?? 0 },
              { value: "refunded", label: "Refunds", count: counts.refunded ?? 0 },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order no., client, product or tracking" className="w-full sm:w-72" />
          <Select aria-label="Payment status" value={pay} onChange={(e) => { setPay(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any payment status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partly refunded</option>
          </Select>
          <Select aria-label="Payment method" value={method} onChange={(e) => { setMethod(e.target.value as PaymentMethod); setPage(1); }} className="w-auto">
            <option value="any">Any method</option>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select aria-label="Destination" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any destination</option>
            {countries.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Date range" value={when} onChange={(e) => { setWhen(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any date</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </Select>
          {hasFilters && <Button variant="ghost" size="sm" icon={X} onClick={() => { setQ(""); setPay("any"); setMethod("any"); setWhen("any"); setCountry("any"); }}>Clear filters</Button>}
        </div>

        {sel.size > 0 && (
          <SelectionBar count={sel.size} onClear={() => setSel(new Set())}>
            <Button size="sm" icon={PackageIcon} onClick={() => bulk("processing", "confirmed and sent to packing")}>Confirm</Button>
            <Button size="sm" icon={Truck} onClick={() => bulk("shipped", "marked as shipped")}>Mark shipped</Button>
            <Button size="sm" icon={Printer} onClick={() => toast(`${sel.size} invoices and packing slips ready to print`, "info")}>Print invoices</Button>
            <Button size="sm" icon={DownloadSimple} onClick={exportCsv}>Export</Button>
            <Button size="sm" onClick={() => setConfirmCancel(true)}>Cancel orders</Button>
          </SelectionBar>
        )}

        {rows.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState icon={Receipt} title="No orders here" body={hasFilters ? "Nothing matches these filters. Widen the date range or clear the search." : "Orders in this state will show up here."} />
          </div>
        ) : (
          <>
            {/* Phone: one row per order, tap to open */}
            <ul className="sm:hidden">
              {visible.map((o) => {
                const c = custMap.get(o.customerId);
                const st = stageOf(o);
                return (
                  <li key={o.id} className={cx("border-t border-line", fresh.includes(o.id) && "row-new")}>
                    <button type="button" onClick={() => navigate(`/orders/${o.id}`)} className="flex w-full gap-3 px-4 py-3 text-left">
                      <Thumb src={o.items[0]?.image} alt="" size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2"><Ref>{o.number}</Ref><span className="num text-[13px] font-medium">{money(o.total)}</span></div>
                        <div className="truncate text-[12.5px] text-muted">{c?.name}, {o.address.city}</div>
                        <div className="mt-2 flex items-center gap-3"><StageTape stages={STAGES} at={st.at} broken={st.broken} compact /><span className={cx("text-[12px]", st.broken ? "text-bad" : "text-muted")}>{st.broken ? (o.status === "refunded" ? "Refunded" : "Cancelled") : STAGES[st.at]}</span><span className="ml-auto"><StatusBadge status={o.paymentStatus} /></span></div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-t border-line bg-surface-2">
                    <th className={th + " w-8"}><Checkbox label="Select all on this page" checked={allSel} indeterminate={visible.some((o) => sel.has(o.id))} onChange={(v) => setSel((s) => { const n = new Set(s); visible.forEach((o) => (v ? n.add(o.id) : n.delete(o.id))); return n; })} /></th>
                    <th className={th}>Order</th>
                    <th className={th}>Placed</th>
                    <th className={th}>Client</th>
                    <th className={th}>Pieces</th>
                    <th className={th}>Payment</th>
                    <th className={th}>Fulfilment</th>
                    <th className={th + " text-right"}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const c = custMap.get(o.customerId);
                    const st = stageOf(o);
                    return (
                      <tr key={o.id} className={cx(tr, "cursor-pointer", fresh.includes(o.id) && "row-new")} onClick={() => navigate(`/orders/${o.id}`)}>
                        <td className={td} onClick={(e) => e.stopPropagation()}>
                          <Checkbox label={`Select ${o.number}`} checked={sel.has(o.id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(o.id) : n.delete(o.id); return n; })} />
                        </td>
                        <td className={td}><Ref to={`/orders/${o.id}`}>{o.number}</Ref></td>
                        <td className={td + " whitespace-nowrap text-muted"} title={date(o.createdAt, true)}>{Date.now() - o.createdAt < 86_400_000 ? ago(o.createdAt) : date(o.createdAt)}</td>
                        <td className={td}>
                          <div className="max-w-44 truncate text-ink">{c?.name}</div>
                          <div className="text-[12px] text-muted">{o.address.city}, {o.address.country}</div>
                        </td>
                        <td className={td}>
                          <div className="flex -space-x-2">{o.items.slice(0, 3).map((i) => <span key={i.productId} className="rounded-[3px] ring-2 ring-surface"><Thumb src={i.image} alt={i.name} size={34} /></span>)}</div>
                        </td>
                        <td className={td}>
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={o.paymentStatus} />
                            <span className="text-[11.5px] text-muted">{o.paymentMethod}</span>
                          </div>
                        </td>
                        <td className={td}>
                          <div className="flex flex-col gap-1.5">
                            <StageTape stages={STAGES} at={st.at} broken={st.broken} compact />
                            <span className={cx("text-[11.5px]", st.broken ? "text-bad" : "text-muted")}>{st.broken ? (o.status === "refunded" ? "Refunded" : "Cancelled") : STAGES[st.at]}</span>
                          </div>
                        </td>
                        <td className={td + " num text-right font-medium"}>{money(o.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </div>

      <Confirm
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => bulk("cancelled", "cancelled")}
        title={`Cancel ${sel.size} order${sel.size > 1 ? "s" : ""}?`}
        body="Clients are notified and stock goes back to inventory. Paid orders still need a refund from Payments."
        confirmLabel="Cancel orders"
        danger
      />
    </>
  );
}
