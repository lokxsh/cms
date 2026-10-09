import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowClockwise, ArrowCounterClockwise, Copy, CreditCard, DownloadSimple } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, count, currencySymbol, date, downloadCsv, money, pct } from "../lib/format";
import type { Transaction, TxnStatus } from "../lib/types";
import { Button, Drawer, EmptyState, Field, Input, KeyValue, Modal, PageHeader, Pagination, SearchInput, Select, StatusBadge, Tabs, Textarea, td, th, tr } from "../components/ui";

type Tab = "all" | "captured" | "failed" | "pending" | "refunds";
const PAGE = 15;

export function RefundModal({ txn, open, onClose }: { txn: Transaction; open: boolean; onClose: () => void }) {
  const refund = useStore((s) => s.refund);
  const toast = useStore((s) => s.toast);
  const remaining = txn.amount - txn.refunded;
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("Customer return");
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setMode("full"); setAmount(String(remaining)); setErr(""); } }, [open, remaining]);

  const submit = () => {
    const n = mode === "full" ? remaining : Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter an amount above zero.");
    if (n > remaining) return setErr(`You can refund at most ${money(remaining)}.`);
    refund(txn.id, Math.round(n));
    toast(`Refund of ${money(Math.round(n))} sent to the gateway`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Refund ${txn.orderNumber}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Issue refund</Button></>}>
      <div className="flex flex-col gap-4">
        <p className="text-muted">Captured <span className="num text-ink">{money(txn.amount)}</span>{txn.refunded > 0 && <>, already refunded <span className="num text-ink">{money(txn.refunded)}</span></>}. Refunds go back to the original {txn.method} payment in 5 to 7 working days.</p>
        <div className="flex gap-2">
          {(["full", "partial"] as const).map((m) => (
            <label key={m} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-[4px] border px-3 py-2.5 text-[13px] ${mode === m ? "border-ink bg-sunken" : "border-line-strong"}`}>
              <input type="radio" name="refund-mode" checked={mode === m} onChange={() => setMode(m)} className="" />
              {m === "full" ? <>Full refund <span className="num ml-auto text-muted">{money(remaining)}</span></> : "Partial refund"}
            </label>
          ))}
        </div>
        {mode === "partial" && (
          <Field label="Amount" htmlFor="refund-amt" error={err}>
            <Input id="refund-amt" prefix={currencySymbol()} inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, "")); setErr(""); }} className="num" />
          </Field>
        )}
        <Field label="Reason" htmlFor="refund-reason" hint="Saved on the order timeline. Not shown to the customer.">
          <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-14" />
        </Field>
      </div>
    </Modal>
  );
}

export function Payments() {
  const txns = useStore((s) => s.transactions);
  const customers = useStore((s) => s.customers);
  const retry = useStore((s) => s.retryCapture);
  const toast = useStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const tab: Tab = statusParam === "failed" ? "failed" : statusParam === "pending" ? "pending" : statusParam === "refunds" ? "refunds" : statusParam === "captured" ? "captured" : "all";
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("any");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(params.get("txn"));
  const [refundOpen, setRefundOpen] = useState(false);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const open = txns.find((t) => t.id === openId);

  const base = useMemo(() => {
    const t = q.trim().toLowerCase();
    return txns.filter((x) => (method === "any" || x.method === method) && (!t || x.orderNumber.toLowerCase().includes(t) || x.gatewayRef.toLowerCase().includes(t) || custMap.get(x.customerId)?.name.toLowerCase().includes(t)));
  }, [txns, q, method, custMap]);

  const match = (x: Transaction, t: Tab) => t === "all" || (t === "refunds" ? x.refunded > 0 : x.status === (t as TxnStatus));
  const rows = base.filter((x) => match(x, tab));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);

  const last30 = txns.filter((t) => t.createdAt > Date.now() - 30 * 86_400_000);
  const captured = last30.filter((t) => t.status !== "failed" && t.status !== "pending");
  const stats = [
    { label: "Captured, 30 days", value: money(captured.reduce((s, t) => s + t.amount, 0)), sub: `${count(captured.length)} payments` },
    { label: "Failure rate", value: pct((last30.filter((t) => t.status === "failed").length / Math.max(1, last30.length)) * 100), sub: `${last30.filter((t) => t.status === "failed").length} failed` },
    { label: "Refunded, 30 days", value: money(last30.reduce((s, t) => s + t.refunded, 0)), sub: `${last30.filter((t) => t.refunded > 0).length} refunds` },
    { label: "Pending", value: count(txns.filter((t) => t.status === "pending").length), sub: "awaiting gateway" },
  ];

  const setTab = (t: Tab) => { setPage(1); setParams(t === "all" ? {} : { status: t }); };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every transaction from the payment gateway, plus cash on delivery collections."
        actions={<Button icon={DownloadSimple} onClick={() => { downloadCsv("payments.csv", [["Payment ID", "Order", "Date", "Method", "Amount", "Refunded", "Status", "Failure"], ...rows.map((t) => [t.gatewayRef, t.orderNumber, new Date(t.createdAt).toISOString(), t.method, t.amount, t.refunded, t.status, t.failureReason ?? ""])]); toast(`Exported ${rows.length} payments`, "info"); }}>Export</Button>}
      />

      <section className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-4">
            <div className="text-[12px] text-muted">{s.label}</div>
            <div className="num mt-1 text-[20px] font-medium tracking-tight">{s.value}</div>
            <div className="text-[12px] text-faint">{s.sub}</div>
          </div>
        ))}
      </section>

      <div className="rounded-[6px] border border-line bg-surface">
        <div className="px-4">
          <Tabs value={tab} onChange={setTab} items={[
            { value: "all", label: "Transactions", count: base.length },
            { value: "captured", label: "Successful", count: base.filter((x) => match(x, "captured")).length },
            { value: "failed", label: "Failed", count: base.filter((x) => match(x, "failed")).length },
            { value: "pending", label: "Pending", count: base.filter((x) => match(x, "pending")).length },
            { value: "refunds", label: "Refunds", count: base.filter((x) => match(x, "refunds")).length },
          ]} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Payment ID, order no. or customer" className="w-full sm:w-80" />
          <Select aria-label="Method" value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any method</option>
            {["Card", "Apple Pay", "PayPal", "Bank transfer", "Cash on delivery"].map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-line"><EmptyState icon={CreditCard} title="No payments" body="No transactions match this view." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-t border-line bg-surface-2">
                  <th className={th}>Payment ID</th><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Method</th><th className={th}>Date</th><th className={th}>Status</th><th className={th + " text-right"}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className={tr + " cursor-pointer"} onClick={() => setOpenId(t.id)}>
                    <td className={td + " num text-[12.5px] text-ink-2"}>{t.gatewayRef}</td>
                    <td className={td}><Link to={`/orders/${t.orderId}`} onClick={(e) => e.stopPropagation()} className="num hover:underline">{t.orderNumber}</Link></td>
                    <td className={td}><span className="block max-w-44 truncate">{custMap.get(t.customerId)?.name}</span></td>
                    <td className={td + " text-muted"}>{t.method}</td>
                    <td className={td + " whitespace-nowrap text-muted"}>{ago(t.createdAt)}</td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        {t.failureReason && <span className="max-w-48 truncate text-[12px] text-muted" title={t.failureReason}>{t.failureReason}</span>}
                      </div>
                    </td>
                    <td className={td + " num text-right font-medium"}>
                      {money(t.amount)}
                      {t.refunded > 0 && <div className="text-[11.5px] font-normal text-bad">−{money(t.refunded)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title="Payment details"
        footer={open && (
          <>
            {open.status === "failed" && <Button icon={ArrowClockwise} onClick={() => { retry(open.id); toast("Payment re-checked with the gateway and captured"); }}>Re-check status</Button>}
            {(open.status === "captured" || open.status === "partial_refund") && <Button variant="primary" icon={ArrowCounterClockwise} onClick={() => setRefundOpen(true)}>Refund</Button>}
          </>
        )}
      >
        {open && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="num text-[24px] font-medium tracking-tight">{money(open.amount)}</div>
              <div className="mt-1 flex items-center gap-2"><StatusBadge status={open.status} /><span className="text-[12.5px] text-muted">{date(open.createdAt, true)}</span></div>
            </div>
            <KeyValue items={[
              ["Payment ID", <span className="inline-flex items-center gap-1.5"><span className="num break-all">{open.gatewayRef}</span><button aria-label="Copy payment ID" className="text-muted hover:text-ink" onClick={() => { navigator.clipboard?.writeText(open.gatewayRef); toast("Copied", "info"); }}><Copy size={13} /></button></span>],
              ["Order", <Link to={`/orders/${open.orderId}`} className="num text-ink underline decoration-line-strong underline-offset-2 hover:underline">{open.orderNumber}</Link>],
              ["Customer", custMap.get(open.customerId)?.name],
              ["Method", open.method],
              ["Gateway", open.gateway],
              ["Refunded", open.refunded ? <span className="num text-bad">{money(open.refunded)}</span> : "None"],
              ...(open.failureReason ? [["Failure reason", <span className="text-bad">{open.failureReason}</span>] as [string, React.ReactNode]] : []),
            ]} />
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Gateway response</div>
              <pre className="num overflow-x-auto rounded-[4px] border border-line bg-sunken p-3 text-[11.5px] leading-relaxed text-ink-2">{JSON.stringify(open.gatewayResponse, null, 2)}</pre>
            </div>
          </div>
        )}
      </Drawer>
      {open && <RefundModal txn={open} open={refundOpen} onClose={() => setRefundOpen(false)} />}
    </>
  );
}
