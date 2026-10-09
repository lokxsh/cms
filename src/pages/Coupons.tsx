import { useState } from "react";
import { Copy, PencilSimple, Plus, Shuffle, Tag, Trash } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { count, currencySymbol, cx, date, money } from "../lib/format";
import type { Coupon } from "../lib/types";
import { Badge, Button, Confirm, Drawer, EmptyState, Field, IconButton, Input, PageHeader, Select, Tabs, Tape, Toggle, td, th, tr, type Tone } from "../components/ui";

const DAY = 86_400_000;
const toInput = (ts: number | null) => (ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");
const fromInput = (s: string) => (s ? new Date(s + "T00:00:00").getTime() : null);

function couponState(c: Coupon): [string, Tone] {
  const now = Date.now();
  if (!c.active) return ["Disabled", "neutral"];
  if (c.startsAt > now) return ["Scheduled", "info"];
  if (c.expiresAt && c.expiresAt < now) return ["Expired", "neutral"];
  if (c.usageLimit && c.used >= c.usageLimit) return ["Used up", "warn"];
  return ["Active", "ok"];
}

const describe = (c: Coupon) => (c.type === "percent" ? `${c.value}% off` : c.type === "fixed" ? `${money(c.value)} off` : "Free shipping");

export function Coupons() {
  const coupons = useStore((s) => s.coupons);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertCoupon);
  const remove = useStore((s) => s.deleteCoupon);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<"all" | "Active" | "Scheduled" | "Expired">("all");
  const [edit, setEdit] = useState<Coupon | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Coupon | null>(null);

  const rows = coupons.filter((c) => tab === "all" || couponState(c)[0] === tab || (tab === "Expired" && ["Used up", "Disabled"].includes(couponState(c)[0])));
  const isNew = edit && !coupons.some((c) => c.id === edit.id);

  const save = () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!/^[A-Z0-9]{4,20}$/.test(edit.code)) e.code = "4 to 20 letters or digits, no spaces.";
    else if (coupons.some((c) => c.code === edit.code && c.id !== edit.id)) e.code = "This code already exists.";
    if (edit.type === "percent" && (edit.value <= 0 || edit.value > 90)) e.value = "Between 1 and 90 percent.";
    if (edit.type === "fixed" && edit.value <= 0) e.value = "Enter an amount above zero.";
    if (edit.type === "fixed" && edit.minOrder && edit.value >= edit.minOrder) e.value = "Discount should be less than the minimum order.";
    if (edit.expiresAt && edit.expiresAt <= edit.startsAt) e.expiresAt = "End date must be after the start date.";
    if (edit.appliesTo !== "all" && edit.targetIds.length === 0) e.targetIds = "Pick at least one.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert(edit);
    toast(isNew ? `Coupon ${edit.code} created` : `Coupon ${edit.code} saved`);
    setEdit(null);
  };

  const randomCode = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Codes clients enter at checkout. Automatic offers live under Discounts."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setEdit({ id: `cpn_${Date.now()}`, code: "", type: "percent", value: 10, minOrder: 0, usageLimit: null, perCustomer: 1, used: 0, startsAt: Date.now(), expiresAt: Date.now() + 30 * DAY, active: true, appliesTo: "all", targetIds: [] }); }}>Create coupon</Button>}
      />
      <div className="rounded-[10px] border border-line bg-surface">
        <div className="px-4">
          <Tabs value={tab} onChange={setTab} items={[
            { value: "all", label: "All", count: coupons.length },
            { value: "Active", label: "Active", count: coupons.filter((c) => couponState(c)[0] === "Active").length },
            { value: "Scheduled", label: "Scheduled", count: coupons.filter((c) => couponState(c)[0] === "Scheduled").length },
            { value: "Expired", label: "Ended", count: coupons.filter((c) => ["Expired", "Used up", "Disabled"].includes(couponState(c)[0])).length },
          ]} />
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-line"><EmptyState icon={Tag} title="No coupons" body="Create a code for a sale, a first-order offer or free shipping." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr className="border-t border-line bg-surface-2"><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Conditions</th><th className={th}>Usage</th><th className={th}>Valid</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const [label, tone] = couponState(c);
                  const limitHit = c.usageLimit ? c.used / c.usageLimit : 0;
                  return (
                    <tr key={c.id} className={tr}>
                      <td className={td}>
                        <button onClick={() => { navigator.clipboard?.writeText(c.code); toast(`${c.code} copied`, "info"); }} className="num group inline-flex items-center gap-1.5 rounded-[3px] border border-dashed border-line-strong px-2 py-0.5 text-[12.5px] font-medium hover:border-ink">
                          {c.code}<Copy size={12} className="text-faint group-hover:text-ink" />
                        </button>
                      </td>
                      <td className={td + " font-medium"}>{describe(c)}</td>
                      <td className={td + " text-[12.5px] text-muted"}>
                        {c.minOrder ? <>Min. <span className="num">{money(c.minOrder)}</span></> : "No minimum"}
                        {c.appliesTo !== "all" && <div>{c.targetIds.length} {c.appliesTo === "categories" ? (c.targetIds.length === 1 ? categories.find((x) => x.id === c.targetIds[0])?.name : "categories") : "products"} only</div>}
                      </td>
                      <td className={td}>
                        <div className="flex min-w-28 flex-col gap-1.5"><span><span className={cx("num", limitHit >= 0.9 && "text-warn")}>{count(c.used)}</span><span className="num text-muted"> / {c.usageLimit ? count(c.usageLimit) : "no limit"}</span></span>{c.usageLimit ? <Tape value={limitHit} major={4} height={6} animate={false} label="Uses against limit" className="max-w-28" /> : null}</div>
                      </td>
                      <td className={td + " whitespace-nowrap text-[12.5px] text-muted"}>{date(c.startsAt)} to {c.expiresAt ? date(c.expiresAt) : "no end"}</td>
                      <td className={td}><Badge tone={tone}>{label}</Badge></td>
                      <td className={td}>
                        <div className="flex items-center justify-end gap-1">
                          <Toggle label={`Enable ${c.code}`} checked={c.active} onChange={(v) => { upsert({ ...c, active: v }); toast(`${c.code} ${v ? "enabled" : "disabled"}`); }} />
                          <IconButton icon={PencilSimple} label="Edit" size={14} onClick={() => { setErrors({}); setEdit(c); }} />
                          <IconButton icon={Trash} label="Delete" size={14} className="hover:text-bad" onClick={() => setDel(c)} />
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

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "Create coupon" : `Edit ${edit?.code}`} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>{isNew ? "Create" : "Save"}</Button></>}>
        {edit && (
          <div className="flex flex-col gap-5">
            <Field label="Code" htmlFor="cp-code" error={errors.code} hint="Customers type this at checkout">
              <div className="flex gap-2">
                <Input id="cp-code" className="num uppercase" value={edit.code} aria-invalid={!!errors.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
                <Button icon={Shuffle} onClick={() => setEdit({ ...edit, code: randomCode() })}>Generate</Button>
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="cp-type">
                <Select id="cp-type" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Coupon["type"], value: e.target.value === "free_shipping" ? 0 : edit.value })}>
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_shipping">Free shipping</option>
                </Select>
              </Field>
              {edit.type !== "free_shipping" && (
                <Field label="Value" htmlFor="cp-val" error={errors.value}>
                  <Input id="cp-val" inputMode="numeric" className="num" prefix={edit.type === "fixed" ? currencySymbol() : undefined} suffix={edit.type === "percent" ? "%" : undefined} value={edit.value || ""} aria-invalid={!!errors.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value.replace(/\D/g, "")) })} />
                </Field>
              )}
            </div>
            <Field label="Minimum order value" htmlFor="cp-min" hint="0 for no minimum">
              <Input id="cp-min" inputMode="numeric" className="num" prefix={currencySymbol()} value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total usage limit" htmlFor="cp-lim" hint="Empty for unlimited">
                <Input id="cp-lim" inputMode="numeric" className="num" value={edit.usageLimit ?? ""} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} />
              </Field>
              <Field label="Uses per customer" htmlFor="cp-per">
                <Input id="cp-per" inputMode="numeric" className="num" value={edit.perCustomer} onChange={(e) => setEdit({ ...edit, perCustomer: Math.max(1, Number(e.target.value.replace(/\D/g, ""))) })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="cp-start">
                <Input id="cp-start" type="date" value={toInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromInput(e.target.value) ?? Date.now() })} />
              </Field>
              <Field label="Ends" htmlFor="cp-end" error={errors.expiresAt} hint="Empty for no end date">
                <Input id="cp-end" type="date" value={toInput(edit.expiresAt)} aria-invalid={!!errors.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: fromInput(e.target.value) })} />
              </Field>
            </div>
            <Field label="Applies to" htmlFor="cp-to" error={errors.targetIds}>
              <Select id="cp-to" value={edit.appliesTo} onChange={(e) => setEdit({ ...edit, appliesTo: e.target.value as Coupon["appliesTo"], targetIds: [] })}>
                <option value="all">Entire order</option>
                <option value="categories">Specific categories</option>
                <option value="products">Specific products</option>
              </Select>
            </Field>
            {edit.appliesTo !== "all" && (
              <div className="max-h-56 overflow-y-auto rounded-[4px] border border-line">
                {(edit.appliesTo === "categories" ? categories.map((c) => ({ id: c.id, label: c.parentId ? `  ${c.name}` : c.name })) : products.filter((p) => p.status === "active").map((p) => ({ id: p.id, label: p.name }))).map((o) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-[13px] last:border-0 hover:bg-surface-2">
                    <input type="checkbox" checked={edit.targetIds.includes(o.id)} onChange={(e) => setEdit({ ...edit, targetIds: e.target.checked ? [...edit.targetIds, o.id] : edit.targetIds.filter((x) => x !== o.id) })} />
                    <span className="whitespace-pre">{o.label}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="rounded-[4px] bg-surface-2 p-3 text-[12.5px] text-ink-2">
              <span className="font-medium text-ink">Summary: </span>
              {describe(edit)}{edit.appliesTo === "all" ? " on the entire order" : ` on ${edit.targetIds.length} selected ${edit.appliesTo}`}
              {edit.minOrder ? `, minimum order ${money(edit.minOrder)}` : ""}
              {`, ${edit.perCustomer} use${edit.perCustomer > 1 ? "s" : ""} per customer`}
              {edit.usageLimit ? `, ${count(edit.usageLimit)} uses total` : ""}.
            </div>
          </div>
        )}
      </Drawer>

      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { remove(del.id); toast(`${del.code} deleted`); } }} title={`Delete ${del?.code}?`} body="Customers who try this code will see it as invalid. Orders that already used it are not affected." confirmLabel="Delete" danger />
    </>
  );
}
