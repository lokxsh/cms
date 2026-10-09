import { useState } from "react";
import { Megaphone, PaperPlaneTilt, PencilSimple, Plus } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { count, cx, date, money } from "../lib/format";
import type { Promotion } from "../lib/types";
import { Badge, Button, Confirm, Drawer, EmptyState, Field, Input, PageHeader, Select, StatusBadge, Tape, Textarea, Thumb } from "../components/ui";
import { describeDiscount } from "./Discounts";

const DAY = 86_400_000;
const CHANNELS: { id: Promotion["channels"][number]; label: string }[] = [
  { id: "storefront", label: "Storefront banner" }, { id: "email", label: "Email to private clients" }, { id: "whatsapp", label: "WhatsApp broadcast" }, { id: "sms", label: "SMS" },
];
const toInput = (ts: number) => new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const statusOf = (p: Promotion): Promotion["status"] => {
  if (p.status === "draft") return "draft";
  const now = Date.now();
  return now < p.startsAt ? "scheduled" : now > p.endsAt ? "ended" : "live";
};

export function Promotions() {
  const promotions = useStore((s) => s.promotions);
  const banners = useStore((s) => s.banners);
  const coupons = useStore((s) => s.coupons);
  const discounts = useStore((s) => s.discounts);
  const collections = useStore((s) => s.collections);
  const customers = useStore((s) => s.customers);
  const upsert = useStore((s) => s.upsertPromotion);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<Promotion | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [send, setSend] = useState<Promotion | null>(null);
  const isNew = edit && !promotions.some((p) => p.id === edit.id);
  const audience = customers.filter((c) => c.marketing).length;

  const offerText = (p: Promotion) => {
    if (p.offer.kind === "coupon") { const c = coupons.find((x) => x.id === p.offer.id); return c ? `Code ${c.code}` : "Coupon removed"; }
    if (p.offer.kind === "discount") { const d = discounts.find((x) => x.id === p.offer.id); return d ? describeDiscount(d) : "Discount removed"; }
    return "No offer, announcement only";
  };

  const save = (asDraft: boolean) => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.name.trim()) e.name = "Name the campaign.";
    if (edit.endsAt <= edit.startsAt) e.dates = "The end date must be after the start.";
    if (edit.offer.kind !== "none" && !edit.offer.id) e.offer = "Choose which offer runs.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert({ ...edit, status: asDraft ? "draft" : statusOf({ ...edit, status: "scheduled" }) });
    toast(isNew ? `“${edit.name}” created` : `“${edit.name}” saved`);
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Campaigns that tie a period, a banner, an offer and the channels it goes out on."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setEdit({ id: `prm_${Date.now()}`, name: "", summary: "", startsAt: Date.now() + DAY, endsAt: Date.now() + 8 * DAY, collectionId: null, bannerId: null, offer: { kind: "none", id: null }, channels: ["storefront"], status: "draft", revenue: 0, orders: 0 }); }}>New promotion</Button>}
      />
      {promotions.length === 0 ? (
        <div className="rounded-[6px] border border-line bg-surface"><EmptyState icon={Megaphone} title="No promotions yet" body="Plan a capsule launch, a seasonal edit or a gifting period." /></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {promotions.map((p) => {
            const st = statusOf(p);
            const banner = banners.find((b) => b.id === p.bannerId);
            const elapsed = (Date.now() - p.startsAt) / (p.endsAt - p.startsAt);
            return (
              <li key={p.id} className="grid gap-4 rounded-[6px] border border-line bg-surface p-4 md:grid-cols-[96px_1fr_auto]">
                <div className="hidden md:block">{banner?.image ? <Thumb src={banner.image} alt="" size={110} /> : <div className="grid h-[110px] w-[88px] place-items-center rounded-[3px] border border-dashed border-line-strong text-[11px] text-faint">No banner</div>}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-semibold">{p.name}</h2><StatusBadge status={st} /></div>
                  <p className="mt-1 max-w-[70ch] text-[13px] text-muted">{p.summary}</p>
                  <div className="mt-3 max-w-md">
                    <Tape value={st === "draft" ? 0 : elapsed} major={4} height={8} animate={false} label="Campaign elapsed" />
                    <div className="mt-1.5 flex justify-between text-[12px] text-muted"><span>{date(p.startsAt)}</span><span>{st === "live" ? `${Math.ceil((p.endsAt - Date.now()) / DAY)} days left` : st === "scheduled" ? `starts in ${Math.ceil((p.startsAt - Date.now()) / DAY)} days` : ""}</span><span>{date(p.endsAt)}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="ink" mark={false}>{offerText(p)}</Badge>
                    {p.collectionId && <Badge mark={false}>{collections.find((c) => c.id === p.collectionId)?.name}</Badge>}
                    {p.channels.map((c) => <Badge key={c} mark={false}>{CHANNELS.find((x) => x.id === c)?.label}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-row items-end justify-between gap-4 md:flex-col">
                  <div className="text-right">
                    <div className="num text-[18px] font-medium">{money(p.revenue)}</div>
                    <div className="text-[12px] text-muted"><span className="num">{count(p.orders)}</span> orders during the campaign</div>
                  </div>
                  <div className="flex gap-2">
                    {(p.channels.includes("email") || p.channels.includes("whatsapp")) && st !== "ended" && <Button size="sm" icon={PaperPlaneTilt} onClick={() => setSend(p)}>Send</Button>}
                    <Button size="sm" icon={PencilSimple} onClick={() => { setErrors({}); setEdit(p); }}>Edit</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "New promotion" : `Edit ${edit?.name}`} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button>{edit?.status === "draft" && <Button onClick={() => save(true)}>Save draft</Button>}<Button variant="primary" onClick={() => save(false)}>{edit?.status === "draft" ? "Schedule" : "Save"}</Button></>}>
        {edit && (
          <div className="flex flex-col gap-5">
            <Field label="Campaign name" htmlFor="pm-name" error={errors.name}><Input id="pm-name" value={edit.name} aria-invalid={!!errors.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Summary" htmlFor="pm-sum" hint="For the team, and the starting point for the email copy."><Textarea id="pm-sum" value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} className="min-h-16" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts" htmlFor="pm-s" error={errors.dates}><Input id="pm-s" type="date" value={toInput(edit.startsAt)} onChange={(e) => e.target.value && setEdit({ ...edit, startsAt: new Date(e.target.value + "T00:00:00").getTime() })} /></Field>
              <Field label="Ends" htmlFor="pm-e"><Input id="pm-e" type="date" value={toInput(edit.endsAt)} onChange={(e) => e.target.value && setEdit({ ...edit, endsAt: new Date(e.target.value + "T23:59:00").getTime() })} /></Field>
            </div>
            <Field label="Offer" htmlFor="pm-offer" error={errors.offer}>
              <Select id="pm-offer" value={edit.offer.kind === "none" ? "none" : `${edit.offer.kind}:${edit.offer.id ?? ""}`} onChange={(e) => {
                const [kind, id] = e.target.value.split(":");
                setEdit({ ...edit, offer: kind === "none" ? { kind: "none", id: null } : { kind: kind as "coupon" | "discount", id: id || null } });
              }}>
                <option value="none">No offer, announcement only</option>
                <optgroup label="Coupon codes">{coupons.map((c) => <option key={c.id} value={`coupon:${c.id}`}>{c.code}</option>)}</optgroup>
                <optgroup label="Automatic discounts">{discounts.map((d) => <option key={d.id} value={`discount:${d.id}`}>{d.name}</option>)}</optgroup>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Collection" htmlFor="pm-col"><Select id="pm-col" value={edit.collectionId ?? ""} onChange={(e) => setEdit({ ...edit, collectionId: e.target.value || null })}><option value="">None</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Banner" htmlFor="pm-ban" hint="Manage banners in CMS, Headers & banners"><Select id="pm-ban" value={edit.bannerId ?? ""} onChange={(e) => setEdit({ ...edit, bannerId: e.target.value || null })}><option value="">None</option>{banners.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</Select></Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium text-ink-2">Channels</legend>
              <div className="flex flex-col gap-2">
                {CHANNELS.map((c) => (
                  <label key={c.id} className={cx("flex items-center gap-2.5 text-[13px]")}>
                    <input type="checkbox" checked={edit.channels.includes(c.id)} onChange={(e) => setEdit({ ...edit, channels: e.target.checked ? [...edit.channels, c.id] : edit.channels.filter((x) => x !== c.id) })} />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Drawer>

      <Confirm
        open={!!send}
        onClose={() => setSend(null)}
        onConfirm={() => send && toast(`“${send.name}” queued for ${audience} clients who opted in`)}
        title={`Send “${send?.name}”?`}
        body={<>Goes to <span className="num font-medium text-ink">{audience}</span> clients who agreed to marketing, by {send?.channels.filter((c) => c !== "storefront").join(" and ")}. This cannot be unsent.</>}
        confirmLabel="Send now"
      />
    </>
  );
}
