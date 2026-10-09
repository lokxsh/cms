import { useState } from "react";
import { Lightning, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { count, currencySymbol, date, money } from "../lib/format";
import type { Discount } from "../lib/types";
import { Badge, Button, Confirm, Drawer, EmptyState, Field, IconButton, Input, PageHeader, Select, Toggle, td, th, tr, type Tone } from "../components/ui";

const DAY = 86_400_000;
const toInput = (ts: number | null) => (ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");
const fromInput = (s: string) => (s ? new Date(s + "T00:00:00").getTime() : null);

export function discountState(d: { active: boolean; startsAt: number; endsAt: number | null }): [string, Tone] {
  const now = Date.now();
  if (!d.active) return ["Off", "neutral"];
  if (d.startsAt > now) return ["Scheduled", "info"];
  if (d.endsAt && d.endsAt < now) return ["Ended", "neutral"];
  return ["Running", "ok"];
}

export const describeDiscount = (d: Discount) =>
  d.kind === "percent_off" ? `${d.value}% off` : d.kind === "amount_off" ? `${money(d.value)} off` : d.kind === "buy_x_get_y" ? `Buy ${d.buyQty}, get ${d.getQty} free` : `Free ${d.gift || "gift"}`;

export function Discounts() {
  const discounts = useStore((s) => s.discounts);
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertDiscount);
  const remove = useStore((s) => s.deleteDiscount);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<Discount | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Discount | null>(null);
  const isNew = edit && !discounts.some((d) => d.id === edit.id);

  const targetName = (d: Discount) => {
    if (d.appliesTo === "all") return "Whole order";
    const src = d.appliesTo === "categories" ? categories : d.appliesTo === "collections" ? collections : products;
    const names = d.targetIds.map((id) => src.find((x) => x.id === id)?.name).filter(Boolean);
    return names.length === 1 ? names[0] : `${names.length} ${d.appliesTo}`;
  };

  const save = () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.name.trim()) e.name = "Name the offer so staff recognise it.";
    if (edit.kind === "percent_off" && (edit.value <= 0 || edit.value > 80)) e.value = "Between 1 and 80 percent.";
    if (edit.kind === "amount_off" && edit.value <= 0) e.value = "Enter an amount above zero.";
    if (edit.kind === "buy_x_get_y" && (edit.buyQty < 1 || edit.getQty < 1)) e.value = "Both quantities need to be at least 1.";
    if (edit.kind === "free_gift" && !edit.gift.trim()) e.value = "Say what the gift is.";
    if (edit.appliesTo !== "all" && edit.targetIds.length === 0) e.targetIds = "Pick at least one.";
    if (edit.endsAt && edit.endsAt <= edit.startsAt) e.endsAt = "End date must be after the start.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert(edit);
    toast(isNew ? `“${edit.name}” created` : `“${edit.name}” saved`);
    setEdit(null);
  };

  const sym = currencySymbol();
  const options = edit ? (edit.appliesTo === "categories" ? categories.map((c) => ({ id: c.id, label: c.parentId ? `  ${c.name}` : c.name })) : edit.appliesTo === "collections" ? collections.map((c) => ({ id: c.id, label: c.name })) : products.map((p) => ({ id: p.id, label: p.name }))) : [];

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Automatic offers that apply at checkout without a code."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setEdit({ id: `dsc_${Date.now()}`, name: "", kind: "percent_off", value: 10, buyQty: 2, getQty: 1, gift: "", minSpend: 0, appliesTo: "all", targetIds: [], startsAt: Date.now(), endsAt: Date.now() + 14 * DAY, active: true, timesApplied: 0 }); }}>Create discount</Button>}
      />
      <div className="rounded-[6px] border border-line bg-surface">
        {discounts.length === 0 ? (
          <EmptyState icon={Lightning} title="No automatic discounts" body="Create an offer like a free gift box over a spend, or 10% off jewelry bought with an abaya." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr className="bg-surface-2"><th className={th}>Offer</th><th className={th}>Applies to</th><th className={th}>Minimum spend</th><th className={th}>Runs</th><th className={th + " text-right"}>Used</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {discounts.map((d) => {
                  const [label, tone] = discountState(d);
                  return (
                    <tr key={d.id} className={tr}>
                      <td className={td}><div className="font-medium">{d.name}</div><div className="text-[12px] text-muted">{describeDiscount(d)}</div></td>
                      <td className={td + " text-muted"}>{targetName(d)}</td>
                      <td className={td + " num text-muted"}>{d.minSpend ? money(d.minSpend) : "None"}</td>
                      <td className={td + " whitespace-nowrap text-[12.5px] text-muted"}>{date(d.startsAt)} to {d.endsAt ? date(d.endsAt) : "no end"}</td>
                      <td className={td + " num text-right"}>{count(d.timesApplied)}</td>
                      <td className={td}><Badge tone={tone}>{label}</Badge></td>
                      <td className={td}>
                        <div className="flex items-center justify-end gap-1">
                          <Toggle label={`Turn ${d.name} on or off`} checked={d.active} onChange={(v) => { upsert({ ...d, active: v }); toast(`“${d.name}” turned ${v ? "on" : "off"}`); }} />
                          <IconButton icon={PencilSimple} label="Edit" size={14} onClick={() => { setErrors({}); setEdit(d); }} />
                          <IconButton icon={Trash} label="Delete" size={14} className="hover:text-bad" onClick={() => setDel(d)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "Create discount" : "Edit discount"} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>{isNew ? "Create" : "Save"}</Button></>}>
        {edit && (
          <div className="flex flex-col gap-5">
            <Field label="Name" htmlFor="d-name" error={errors.name} hint="Internal. Clients see the effect in their cart."><Input id="d-name" value={edit.name} aria-invalid={!!errors.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Offer" htmlFor="d-kind">
              <Select id="d-kind" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Discount["kind"] })}>
                <option value="percent_off">Percentage off</option>
                <option value="amount_off">Amount off</option>
                <option value="buy_x_get_y">Buy some, get some free</option>
                <option value="free_gift">Free gift with purchase</option>
              </Select>
            </Field>
            {edit.kind === "percent_off" && <Field label="Percentage" htmlFor="d-val" error={errors.value}><Input id="d-val" suffix="%" inputMode="numeric" className="num" value={edit.value || ""} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value.replace(/\D/g, "")) })} /></Field>}
            {edit.kind === "amount_off" && <Field label="Amount" htmlFor="d-val" error={errors.value}><Input id="d-val" prefix={sym} inputMode="numeric" className="num" value={edit.value || ""} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value.replace(/\D/g, "")) })} /></Field>}
            {edit.kind === "buy_x_get_y" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Client buys" htmlFor="d-buy" error={errors.value}><Input id="d-buy" inputMode="numeric" className="num" suffix="pieces" value={edit.buyQty} onChange={(e) => setEdit({ ...edit, buyQty: Number(e.target.value.replace(/\D/g, "")) })} /></Field>
                <Field label="Gets free" htmlFor="d-get"><Input id="d-get" inputMode="numeric" className="num" suffix="pieces" value={edit.getQty} onChange={(e) => setEdit({ ...edit, getQty: Number(e.target.value.replace(/\D/g, "")) })} /></Field>
              </div>
            )}
            {edit.kind === "free_gift" && <Field label="Gift" htmlFor="d-gift" error={errors.value}><Input id="d-gift" value={edit.gift} placeholder="e.g. RINAZ velvet keepsake box" onChange={(e) => setEdit({ ...edit, gift: e.target.value })} /></Field>}
            <Field label="Minimum spend" htmlFor="d-min" hint="0 for none"><Input id="d-min" prefix={sym} inputMode="numeric" className="num" value={edit.minSpend} onChange={(e) => setEdit({ ...edit, minSpend: Number(e.target.value.replace(/\D/g, "")) })} /></Field>
            <Field label="Applies to" htmlFor="d-to" error={errors.targetIds}>
              <Select id="d-to" value={edit.appliesTo} onChange={(e) => setEdit({ ...edit, appliesTo: e.target.value as Discount["appliesTo"], targetIds: [] })}>
                <option value="all">Whole order</option>
                <option value="categories">Specific categories</option>
                <option value="collections">Specific collections</option>
                <option value="products">Specific products</option>
              </Select>
            </Field>
            {edit.appliesTo !== "all" && (
              <div className="max-h-52 overflow-y-auto rounded-[4px] border border-line">
                {options.map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-[13px] last:border-0 hover:bg-surface-2">
                    <input type="checkbox" checked={edit.targetIds.includes(o.id)} onChange={(e) => setEdit({ ...edit, targetIds: e.target.checked ? [...edit.targetIds, o.id] : edit.targetIds.filter((x) => x !== o.id) })} />
                    <span className="whitespace-pre">{o.label}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts" htmlFor="d-start"><Input id="d-start" type="date" value={toInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromInput(e.target.value) ?? Date.now() })} /></Field>
              <Field label="Ends" htmlFor="d-end" error={errors.endsAt} hint="Empty for no end"><Input id="d-end" type="date" value={toInput(edit.endsAt)} onChange={(e) => setEdit({ ...edit, endsAt: fromInput(e.target.value) })} /></Field>
            </div>
            <div className="rounded-[4px] border border-line bg-surface-2 p-3 text-[12.5px] text-ink-2">
              <span className="font-medium text-ink">In the cart: </span>{describeDiscount(edit)} on {edit.appliesTo === "all" ? "the whole order" : `${edit.targetIds.length} selected ${edit.appliesTo}`}{edit.minSpend ? ` when the order is over ${money(edit.minSpend)}` : ""}.
            </div>
          </div>
        )}
      </Drawer>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { remove(del.id); toast(`“${del.name}” deleted`); } }} title={`Delete “${del?.name}”?`} body="It stops applying at checkout immediately. Past orders keep their discount." confirmLabel="Delete" danger />
    </>
  );
}
