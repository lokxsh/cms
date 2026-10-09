import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package as PackageIcon } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, count, cx, money } from "../lib/format";
import { isMto } from "../lib/seed";
import type { Product, StockMove, Variant } from "../lib/types";
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Pagination, Ref, SearchInput, Select, Tabs, Tape, Thumb, td, th, tr } from "../components/ui";

type Tab = "all" | "low" | "out" | "history";
const PAGE = 25;
const reasonTone: Record<StockMove["reason"], "ok" | "bad" | "info" | "neutral" | "warn"> = { sale: "neutral", restock: "ok", return: "info", correction: "warn", damaged: "bad" };
interface Line { p: Product; v: Variant }

export function Inventory() {
  const products = useStore((s) => s.products);
  const moves = useStore((s) => s.stockMoves);
  const adjust = useStore((s) => s.adjustStock);
  const toast = useStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const f = params.get("filter");
  const tab: Tab = f === "low" || f === "out" || f === "history" ? f : "all";
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Line | null>(null);
  const [delta, setDelta] = useState("");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [reason, setReason] = useState<StockMove["reason"]>("restock");
  const [err, setErr] = useState("");

  const lines: Line[] = useMemo(() => products.filter((p) => p.status !== "archived").flatMap((p) => p.variants.filter((v) => !isMto(v.options)).map((v) => ({ p, v }))), [products]);
  const low = lines.filter((l) => l.v.stock > 0 && l.v.stock <= l.p.lowStockAt);
  const out = lines.filter((l) => l.v.stock === 0);
  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const src = tab === "low" ? low : tab === "out" ? out : lines;
    return src.filter((l) => !t || l.p.name.toLowerCase().includes(t) || l.v.sku.toLowerCase().includes(t)).sort((a, b) => a.v.stock - b.v.stock || a.p.name.localeCompare(b.p.name));
  }, [tab, q, lines, low, out]);
  const history = useMemo(() => {
    const t = q.trim().toLowerCase();
    return moves.filter((m) => !t || prodMap.get(m.productId)?.name.toLowerCase().includes(t));
  }, [moves, q, prodMap]);
  const total = tab === "history" ? history.length : list.length;

  const openAdjust = (l: Line) => { setTarget(l); setDelta(""); setMode("add"); setReason("restock"); setErr(""); };
  const apply = () => {
    if (!target) return;
    const n = Number(delta);
    if (!delta || !Number.isInteger(n) || n < 0) return setErr("Enter a whole number.");
    const change = mode === "add" ? n : mode === "remove" ? -n : n - target.v.stock;
    if (change === 0) return setErr("That would not change the stock.");
    if (target.v.stock + change < 0) return setErr(`Only ${target.v.stock} on hand.`);
    adjust(target.p.id, target.v.id, change, mode === "set" ? "correction" : reason);
    toast(`${target.p.name}, ${target.v.options.join(" / ")}: now ${target.v.stock + change}`);
    setTarget(null);
  };

  return (
    <>
      <PageHeader title="Inventory" description="Stock is tracked per size and option. Every change is logged with a reason. Made-to-measure pieces are not counted." />

      <section className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line lg:grid-cols-4">
        {[
          ["Pieces on hand", count(lines.reduce((s, l) => s + l.v.stock, 0)), ""],
          ["Stock value at cost", money(lines.reduce((s, l) => s + l.v.stock * l.p.cost, 0)), ""],
          ["Options running low", String(low.length), low.length ? "text-warn" : ""],
          ["Options sold out", String(out.length), out.length ? "text-bad" : ""],
        ].map(([k, v, c]) => (
          <div key={k} className="bg-surface p-4">
            <div className="text-[12px] text-muted">{k}</div>
            <div className={cx("num mt-1 text-[21px] font-medium tracking-[-0.02em]", c)}>{v}</div>
          </div>
        ))}
      </section>

      <div className="rounded-[6px] border border-line bg-surface">
        <div className="px-4">
          <Tabs value={tab} onChange={(t) => { setPage(1); setParams(t === "all" ? {} : { filter: t }); }} items={[
            { value: "all", label: "All stock", count: lines.length },
            { value: "low", label: "Low stock", count: low.length },
            { value: "out", label: "Sold out", count: out.length },
            { value: "history", label: "History" },
          ]} />
        </div>
        <div className="border-t border-line px-4 py-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Product or SKU" className="w-full sm:w-72" />
        </div>

        {tab === "history" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-t border-line bg-surface-2"><th className={th}>Piece</th><th className={th}>Reason</th><th className={th + " text-right"}>Change</th><th className={th + " text-right"}>After</th><th className={th}>By</th><th className={th}>When</th></tr></thead>
              <tbody>
                {history.slice((page - 1) * PAGE, page * PAGE).map((m) => {
                  const p = prodMap.get(m.productId);
                  const v = p?.variants.find((x) => x.id === m.variantId);
                  return (
                    <tr key={m.id} className={tr}>
                      <td className={td}><Link to={`/catalog/products/${m.productId}`} className="hover:underline">{p?.name ?? "Deleted product"}</Link><div className="text-[12px] text-muted">{v?.options.join(" / ")}</div></td>
                      <td className={td}><Badge tone={reasonTone[m.reason]}>{m.reason[0].toUpperCase() + m.reason.slice(1)}</Badge></td>
                      <td className={cx(td, "num text-right font-medium", m.delta > 0 ? "text-ok" : "text-ink")}>{m.delta > 0 ? "+" : "−"}{Math.abs(m.delta)}</td>
                      <td className={td + " num text-right text-muted"}>{m.after}</td>
                      <td className={td + " text-muted"}>{m.by}</td>
                      <td className={td + " whitespace-nowrap text-muted"}>{ago(m.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : list.length === 0 ? (
          <div className="border-t border-line"><EmptyState icon={PackageIcon} title={tab === "out" ? "Nothing is sold out" : tab === "low" ? "Nothing is running low" : "No stock found"} body="Sizes and options appear here when they drop to or below their alert level." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead><tr className="border-t border-line bg-surface-2"><th className={th}>Piece</th><th className={th}>SKU</th><th className={th + " w-[220px]"}>On hand</th><th className={th + " text-right"}>Alert at</th><th className={th}></th></tr></thead>
              <tbody>
                {list.slice((page - 1) * PAGE, page * PAGE).map((l) => (
                  <tr key={l.v.id} className={tr}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Thumb src={l.p.image} alt="" size={40} />
                        <div className="min-w-0"><Link to={`/catalog/products/${l.p.id}`} className="block max-w-72 truncate hover:underline">{l.p.name}</Link><div className="text-[12px] text-muted">{l.v.options.join(" / ") || "Default"}</div></div>
                      </div>
                    </td>
                    <td className={td}><Ref>{l.v.sku}</Ref></td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className={cx("num w-6 text-right font-medium", l.v.stock === 0 ? "text-bad" : l.v.stock <= l.p.lowStockAt ? "text-warn" : "text-ink")}>{l.v.stock}</span>
                        {/* Halfway tick is the alert level; gold measures stock up to twice that. */}
                        <Tape value={l.v.stock / (l.p.lowStockAt * 2)} major={2} height={8} animate={false} label={`${l.v.stock} on hand, alert at ${l.p.lowStockAt}`} className="max-w-32" />
                      </div>
                    </td>
                    <td className={td + " num text-right text-muted"}>{l.p.lowStockAt}</td>
                    <td className={td + " text-right"}><Button size="sm" onClick={() => openAdjust(l)}>Adjust</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE} total={total} onPage={setPage} />
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Adjust stock" footer={<><Button onClick={() => setTarget(null)}>Cancel</Button><Button variant="primary" onClick={apply}>Save adjustment</Button></>}>
        {target && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Thumb src={target.p.image} alt="" size={48} />
              <div>
                <div className="font-medium text-ink">{target.p.name}</div>
                <div className="text-[12.5px] text-muted">{target.v.options.join(" / ")} · <span className="num">{target.v.stock}</span> on hand</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-[4px] border border-line-strong p-0.5">
              {(["add", "remove", "set"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setReason(m === "add" ? "restock" : m === "remove" ? "damaged" : "correction"); }} className={cx("h-8 rounded-[3px] text-[12.5px]", mode === m ? "bg-ink font-medium text-surface" : "text-muted")}>
                  {m === "add" ? "Add" : m === "remove" ? "Remove" : "Set exact"}
                </button>
              ))}
            </div>
            <Field label={mode === "set" ? "New stock level" : "Pieces"} htmlFor="adj-q" error={err} hint={!err && delta && Number.isInteger(Number(delta)) ? `New stock: ${mode === "add" ? target.v.stock + Number(delta) : mode === "remove" ? target.v.stock - Number(delta) : Number(delta)}` : undefined}>
              <Input id="adj-q" autoFocus inputMode="numeric" className="num" value={delta} aria-invalid={!!err} onChange={(e) => { setDelta(e.target.value.replace(/\D/g, "")); setErr(""); }} />
            </Field>
            {mode !== "set" && (
              <Field label="Reason" htmlFor="adj-r">
                <Select id="adj-r" value={reason} onChange={(e) => setReason(e.target.value as StockMove["reason"])}>
                  {mode === "add" ? <><option value="restock">Received from atelier</option><option value="return">Client return</option><option value="correction">Count correction</option></> : <><option value="damaged">Damaged or flawed</option><option value="correction">Count correction</option></>}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
