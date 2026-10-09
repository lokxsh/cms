import { useState, type ReactNode } from "react";
import { NavLink, useParams, Navigate } from "react-router-dom";
import { Plus, Trash, ShieldCheck, EnvelopeSimple, PencilSimple, Warning } from "@phosphor-icons/react";
import { useStore, type StoreSettings } from "../lib/store";
import { ago, currencySymbol, cx, money } from "../lib/format";
import type { Admin, AtelierInfo, Permission, Role } from "../lib/types";
import { Avatar, Badge, Button, Confirm, Drawer, Field, IconButton, Input, PageHeader, Panel, Select, StatusBadge, Textarea, Toggle, td, th, tr } from "../components/ui";

const tabs = [
  ["store", "Store"],
  ["shipping", "Shipping"],
  ["tax", "Tax"],
  ["payments", "Payment gateway"],
  ["notifications", "Notifications"],
  ["team", "Admin users & permissions"],
  ["activity", "Activity log"],
] as const;
type TabKey = (typeof tabs)[number][0];
const CURRENCIES = ["USD", "GBP", "AED", "QAR", "SAR", "PKR", "EUR"];

function useDraft<K extends keyof StoreSettings>(key: K) {
  const value = useStore((s) => s.settings[key]);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const [draft, setDraft] = useState(value);
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  const save = (msg = "Settings saved") => { update({ [key]: draft } as Partial<StoreSettings>); toast(msg); };
  return { draft, setDraft, dirty, save, reset: () => setDraft(value) };
}

function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button disabled={!dirty} onClick={onReset}>Discard</Button>
      <Button variant="primary" disabled={!dirty} onClick={onSave}>Save changes</Button>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-line py-3 first:border-0 first:pt-0 last:pb-0">
      <div><div className="text-[13px] text-ink">{label}</div>{hint && <div className="text-[12px] text-muted">{hint}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Undecided({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex gap-2.5 rounded-[4px] border border-warn/40 bg-warn-soft px-3.5 py-3 text-[13px] text-ink-2">
      <Warning size={17} weight="fill" className="mt-px shrink-0 text-warn" />
      <div>{children}</div>
    </div>
  );
}

function StoreTab() {
  const s = useStore((x) => x.settings);
  const ateliers = useStore((x) => x.ateliers);
  const updateAtelier = useStore((x) => x.updateAtelier);
  const update = useStore((x) => x.updateSettings);
  const toast = useStore((x) => x.toast);
  const pick = () => ({ name: s.name, legalName: s.legalName, email: s.email, phone: s.phone, address: s.address, baseCurrency: s.baseCurrency, displayCurrencies: s.displayCurrencies, timezone: s.timezone, dailyRevenueTarget: s.dailyRevenueTarget, monthlyRevenueTarget: s.monthlyRevenueTarget, kpiTargets: s.kpiTargets, social: s.social });
  const [f, setF] = useState(pick);
  const [err, setErr] = useState<Record<string, string>>({});
  const [editAt, setEditAt] = useState<AtelierInfo | null>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(pick());
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Store name is required.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email.";
    setErr(e);
    if (Object.keys(e).length) return;
    update(f);
    toast("Store settings saved");
  };
  return (
    <>
      <Panel title="Store details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" htmlFor="st-name" error={err.name}><Input id="st-name" value={f.name} aria-invalid={!!err.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Legal business name" htmlFor="st-legal" hint="Printed on invoices"><Input id="st-legal" value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></Field>
          <Field label="Concierge email" htmlFor="st-email" error={err.email}><Input id="st-email" type="email" value={f.email} aria-invalid={!!err.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Concierge phone" htmlFor="st-phone"><Input id="st-phone" className="num" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Registered address" htmlFor="st-addr" className="sm:col-span-2"><Input id="st-addr" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        </div>
      </Panel>

      <Panel title="Currency" className="mt-4">
        <Undecided>The base currency is not confirmed yet. Prices, reports and refunds use it. Changing it later does not convert existing prices.</Undecided>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base currency" htmlFor="st-cur" hint="Prices are entered and reported in this"><Select id="st-cur" value={f.baseCurrency} onChange={(e) => setF({ ...f, baseCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Time zone for reports" htmlFor="st-tz"><Select id="st-tz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>{["Europe/London", "Asia/Dubai", "Asia/Qatar", "Asia/Karachi"].map((z) => <option key={z}>{z}</option>)}</Select></Field>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-[12.5px] font-medium text-ink-2">Currencies clients can switch to on the storefront</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CURRENCIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={f.displayCurrencies.includes(c)} disabled={c === f.baseCurrency} onChange={(e) => setF({ ...f, displayCurrencies: e.target.checked ? [...f.displayCurrencies, c] : f.displayCurrencies.filter((x) => x !== c) })} />
                <span className="num">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <Panel title="Dashboard targets" description="Each is drawn as a gold tape on the dashboard. Monthly figures scale the daily targets." className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Daily target" htmlFor="st-dt"><Input id="st-dt" prefix={currencySymbol()} inputMode="numeric" className="num" value={f.dailyRevenueTarget} onChange={(e) => setF({ ...f, dailyRevenueTarget: Number(e.target.value.replace(/\D/g, "")) })} /></Field>
          <Field label="Monthly target" htmlFor="st-mt"><Input id="st-mt" prefix={currencySymbol()} inputMode="numeric" className="num" value={f.monthlyRevenueTarget} onChange={(e) => setF({ ...f, monthlyRevenueTarget: Number(e.target.value.replace(/\D/g, "")) })} /></Field>
          <Field label="Orders per day" htmlFor="st-ko"><Input id="st-ko" inputMode="numeric" className="num" value={f.kpiTargets.orders} onChange={(e) => setF({ ...f, kpiTargets: { ...f.kpiTargets, orders: Number(e.target.value.replace(/\D/g, "")) } })} /></Field>
          <Field label="Average order value" htmlFor="st-ka"><Input id="st-ka" prefix={currencySymbol()} inputMode="numeric" className="num" value={f.kpiTargets.aov} onChange={(e) => setF({ ...f, kpiTargets: { ...f.kpiTargets, aov: Number(e.target.value.replace(/\D/g, "")) } })} /></Field>
          <Field label="Conversion rate" htmlFor="st-kc"><Input id="st-kc" suffix="%" inputMode="decimal" className="num" value={f.kpiTargets.conversion} onChange={(e) => setF({ ...f, kpiTargets: { ...f.kpiTargets, conversion: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } })} /></Field>
          <Field label="Successful payments per day" htmlFor="st-kp"><Input id="st-kp" inputMode="numeric" className="num" value={f.kpiTargets.paid} onChange={(e) => setF({ ...f, kpiTargets: { ...f.kpiTargets, paid: Number(e.target.value.replace(/\D/g, "")) } })} /></Field>
          <Field label="New clients per day" htmlFor="st-kn"><Input id="st-kn" inputMode="numeric" className="num" value={f.kpiTargets.newClients} onChange={(e) => setF({ ...f, kpiTargets: { ...f.kpiTargets, newClients: Number(e.target.value.replace(/\D/g, "")) } })} /></Field>
        </div>
      </Panel>

      <Panel title="Studio sanctuaries" description="Opening hours and stylists drive the appointment calendar." className="mt-4" bodyClass="">
        <ul>
          {ateliers.map((a) => (
            <li key={a.name} className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{a.name} <span className="font-normal text-muted">{a.label}</span></div>
                <div className="truncate text-[12.5px] text-muted"><span className="num">{a.opens}:00 to {a.closes}:00</span> local · {a.stylists.join(", ")}</div>
              </div>
              <IconButton icon={PencilSimple} label={`Edit ${a.name}`} size={14} onClick={() => setEditAt(a)} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Social links" className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["instagram", "tiktok", "pinterest", "youtube"] as const).map((k) => (
            <Field key={k} label={k === "tiktok" ? "TikTok" : k === "youtube" ? "YouTube" : k[0].toUpperCase() + k.slice(1)} htmlFor={`so-${k}`}><Input id={`so-${k}`} prefix="@" value={f.social[k]} onChange={(e) => setF({ ...f, social: { ...f.social, [k]: e.target.value } })} /></Field>
          ))}
          <Field label="WhatsApp concierge" htmlFor="so-wa"><Input id="so-wa" className="num" value={f.social.whatsapp} onChange={(e) => setF({ ...f, social: { ...f.social, whatsapp: e.target.value } })} /></Field>
        </div>
      </Panel>
      <SaveBar dirty={dirty} onSave={save} onReset={() => setF(pick())} />

      <Drawer open={!!editAt} onClose={() => setEditAt(null)} title={`${editAt?.name} atelier`} footer={<><Button onClick={() => setEditAt(null)}>Cancel</Button><Button variant="primary" onClick={() => { if (editAt) { updateAtelier(editAt); toast(`${editAt.name} atelier saved`); setEditAt(null); } }}>Save</Button></>}>
        {editAt && (
          <div className="flex flex-col gap-4">
            <Field label="Name shown to clients" htmlFor="at-l"><Input id="at-l" value={editAt.label} onChange={(e) => setEditAt({ ...editAt, label: e.target.value })} /></Field>
            <Field label="Address" htmlFor="at-a"><Input id="at-a" value={editAt.address} onChange={(e) => setEditAt({ ...editAt, address: e.target.value })} /></Field>
            <Field label="Phone" htmlFor="at-p"><Input id="at-p" className="num" value={editAt.phone} onChange={(e) => setEditAt({ ...editAt, phone: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Opens" htmlFor="at-o"><Select id="at-o" value={editAt.opens} onChange={(e) => setEditAt({ ...editAt, opens: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => i + 7).map((h) => <option key={h} value={h}>{h}:00</option>)}</Select></Field>
              <Field label="Closes" htmlFor="at-c"><Select id="at-c" value={editAt.closes} onChange={(e) => setEditAt({ ...editAt, closes: Number(e.target.value) })}>{Array.from({ length: 10 }, (_, i) => i + 15).map((h) => <option key={h} value={h}>{h}:00</option>)}</Select></Field>
            </div>
            <Field label="Stylists" htmlFor="at-s" hint="One per line"><Textarea id="at-s" value={editAt.stylists.join("\n")} onChange={(e) => setEditAt({ ...editAt, stylists: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></Field>
          </div>
        )}
      </Drawer>
    </>
  );
}

type Zone = StoreSettings["zones"][number];

function ShippingTab() {
  const zones = useStore((s) => s.settings.zones);
  const carriers = useStore((s) => s.settings.carriers);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<Zone | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Zone | null>(null);
  const sym = currencySymbol();
  const isNew = edit && !zones.some((z) => z.id === edit.id);
  const enabled = carriers.filter((c) => c.enabled);
  const num = (v: string) => Number(v.replace(/\D/g, ""));
  const numOrNull = (v: string) => (v.trim() === "" ? null : num(v));

  const save = () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.name.trim()) e.name = "Name the zone, e.g. Gulf (GCC).";
    if (!edit.regions.trim()) e.regions = "List the countries or regions it covers.";
    if (!/^\d+(-\d+)?$/.test(edit.days.trim())) e.days = "Use a number or a range, e.g. 2-3.";
    setErr(e);
    if (Object.keys(e).length) return;
    update({ zones: isNew ? [...zones, edit] : zones.map((z) => (z.id === edit.id ? edit : z)) });
    toast(isNew ? `${edit.name} zone added` : `${edit.name} zone saved`);
    setEdit(null);
  };

  return (
    <>
      <Panel
        title="Shipping zones"
        description="Every shipment goes out insured. Free shipping applies once the order total reaches the threshold."
        actions={<Button size="sm" icon={Plus} onClick={() => { setErr({}); setEdit({ id: `z${Date.now()}`, name: "", regions: "", standard: 35, express: 55, freeAbove: 400, days: "3-5", carrier: enabled[0]?.name ?? "DHL Express" }); }}>Add zone</Button>}
        bodyClass=""
      >
        <ul>
          {zones.map((z) => (
            <li key={z.id} className="grid gap-3 border-t border-line px-4 py-4 first:border-0 xl:grid-cols-[minmax(0,1fr)_340px_auto] xl:items-center">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{z.name}</div>
                <div className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{z.regions}</div>
                <div className="mt-1.5 text-[12.5px] text-ink-2">{z.carrier} · <span className="num">{z.days}</span> days</div>
              </div>
              <dl className="grid max-w-md grid-cols-3 gap-x-6 gap-y-1 text-[12.5px] [&_dt]:whitespace-nowrap">
                <div><dt className="text-muted">Standard</dt><dd className="num mt-0.5 text-[14px] font-medium">{z.standard ? money(z.standard) : "Free"}</dd></div>
                <div><dt className="text-muted">Express</dt><dd className="num mt-0.5 text-[14px] font-medium">{z.express === null ? <span className="text-faint">Off</span> : money(z.express)}</dd></div>
                <div><dt className="text-muted">Free over</dt><dd className="num mt-0.5 text-[14px] font-medium">{z.freeAbove === null ? <span className="text-faint">Never</span> : money(z.freeAbove)}</dd></div>
              </dl>
              <div className="flex gap-1 xl:justify-end">
                <Button size="sm" icon={PencilSimple} onClick={() => { setErr({}); setEdit({ ...z }); }}>Edit</Button>
                <IconButton icon={Trash} label={`Delete ${z.name}`} size={14} className="hover:text-bad" onClick={() => setDel(z)} />
              </div>
            </li>
          ))}
          {zones.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted">No zones yet. Add one so clients can check out.</li>}
        </ul>
      </Panel>

      <Panel title="Couriers" description="Only switched-on couriers can be picked for a zone or when shipping an order." className="mt-4">
        {carriers.map((c) => (
          <Row key={c.name} label={c.name} hint={`${zones.filter((z) => z.carrier === c.name).length} zones use it`}>
            <Toggle label={c.name} checked={c.enabled} onChange={(v) => { update({ carriers: carriers.map((x) => (x.name === c.name ? { ...x, enabled: v } : x)) }); toast(`${c.name} ${v ? "switched on" : "switched off"}`); }} />
          </Row>
        ))}
      </Panel>

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "Add shipping zone" : `Edit ${edit?.name}`} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>{isNew ? "Add zone" : "Save zone"}</Button></>}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Zone name" htmlFor="z-name" error={err.name}><Input id="z-name" value={edit.name} aria-invalid={!!err.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Countries or regions" htmlFor="z-reg" error={err.regions} hint="Separate with commas"><Textarea id="z-reg" value={edit.regions} aria-invalid={!!err.regions} onChange={(e) => setEdit({ ...edit, regions: e.target.value })} className="min-h-16" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Courier" htmlFor="z-car"><Select id="z-car" value={edit.carrier} onChange={(e) => setEdit({ ...edit, carrier: e.target.value })}>{carriers.map((c) => <option key={c.name} value={c.name} disabled={!c.enabled}>{c.name}{c.enabled ? "" : " (off)"}</option>)}</Select></Field>
              <Field label="Delivery time" htmlFor="z-days" error={err.days}><Input id="z-days" className="num" suffix="days" value={edit.days} aria-invalid={!!err.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Standard rate" htmlFor="z-std" hint="0 for always free"><Input id="z-std" prefix={sym} inputMode="numeric" className="num" value={edit.standard} onChange={(e) => setEdit({ ...edit, standard: num(e.target.value) })} /></Field>
              <Field label="Express rate" htmlFor="z-exp" hint="Empty to turn express off"><Input id="z-exp" prefix={sym} inputMode="numeric" className="num" value={edit.express ?? ""} onChange={(e) => setEdit({ ...edit, express: numOrNull(e.target.value) })} /></Field>
            </div>
            <Field label="Free shipping when the order is over" htmlFor="z-free" hint="Empty for never"><Input id="z-free" prefix={sym} inputMode="numeric" className="num" value={edit.freeAbove ?? ""} onChange={(e) => setEdit({ ...edit, freeAbove: numOrNull(e.target.value) })} /></Field>
            <div className="rounded-[4px] border border-line bg-surface-2 p-3 text-[12.5px] text-ink-2">
              Clients in {edit.name || "this zone"} pay {edit.standard ? money(edit.standard) : "nothing"} for standard delivery{edit.express !== null ? ` or ${money(edit.express)} for express` : ""}{edit.freeAbove !== null ? `, free over ${money(edit.freeAbove)}` : ""}. Arrives in {edit.days || "?"} days with {edit.carrier}.
            </div>
          </div>
        )}
      </Drawer>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { update({ zones: zones.filter((z) => z.id !== del.id) }); toast(`${del.name} zone deleted`); } }} title={`Delete ${del?.name}?`} body="Clients in these regions will not be able to check out until another zone covers them." confirmLabel="Delete zone" danger />
    </>
  );
}

function TaxTab() {
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const toast = useStore((x) => x.toast);
  const pick = () => ({ taxInclusive: s.taxInclusive, taxConfirmed: s.taxConfirmed, taxRegions: s.taxRegions });
  const [f, setF] = useState(pick);
  const dirty = JSON.stringify(f) !== JSON.stringify(pick());
  const setRegion = (id: string, p: Partial<StoreSettings["taxRegions"][number]>) => setF({ ...f, taxRegions: f.taxRegions.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  return (
    <>
      {!f.taxConfirmed && <Undecided>These rates are placeholders. Confirm them with your accountant for each country you sell to, then switch on <span className="font-medium">Rates confirmed</span> below.</Undecided>}
      <Panel title="Tax by destination" actions={<Button size="sm" icon={Plus} onClick={() => setF({ ...f, taxRegions: [...f.taxRegions, { id: `tx${Date.now()}`, region: "", rate: 0, label: "VAT" }] })}>Add region</Button>} bodyClass="">
        <table className="w-full">
          <thead><tr className="bg-surface-2"><th className={th}>Destination</th><th className={th}>Name on invoice</th><th className={th + " w-32"}>Rate</th><th className={th}></th></tr></thead>
          <tbody>
            {f.taxRegions.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-2.5 first:pl-4"><Input aria-label="Destination" value={r.region} onChange={(e) => setRegion(r.id, { region: e.target.value })} /></td>
                <td className="px-3 py-2.5"><Input aria-label="Tax name" value={r.label} onChange={(e) => setRegion(r.id, { label: e.target.value })} /></td>
                <td className="px-3 py-2.5"><Input aria-label="Rate" suffix="%" inputMode="decimal" className="num" value={r.rate} onChange={(e) => setRegion(r.id, { rate: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} /></td>
                <td className="px-3 py-2.5 pr-4"><IconButton icon={Trash} label="Remove region" size={14} className="hover:text-bad" onClick={() => setF({ ...f, taxRegions: f.taxRegions.filter((x) => x.id !== r.id) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel className="mt-4">
        <Row label="Prices include tax" hint="Clients see the final price; tax is worked out from it."><Toggle label="Prices include tax" checked={f.taxInclusive} onChange={(v) => setF({ ...f, taxInclusive: v })} /></Row>
        <Row label="Rates confirmed" hint="Removes the placeholder warning from invoices."><Toggle label="Rates confirmed" checked={f.taxConfirmed} onChange={(v) => setF({ ...f, taxConfirmed: v })} /></Row>
      </Panel>
      <p className="mt-3 text-[12.5px] text-muted">Example: a {money(1450)} pendant shipped to the UK at 20% {f.taxInclusive ? "includes" : "adds"} {money(Math.round(f.taxInclusive ? 1450 - 1450 / 1.2 : 1450 * 0.2))} VAT.</p>
      <SaveBar dirty={dirty} onSave={() => { update(f); toast("Tax settings saved"); }} onReset={() => setF(pick())} />
    </>
  );
}

function PaymentsTab() {
  const g = useDraft("gateway");
  const d = g.draft;
  const set = (p: Partial<typeof d>) => g.setDraft({ ...d, ...p });
  return (
    <>
      {!d.provider && <Undecided>No payment gateway is connected yet, so checkout runs on demo data. Choose a provider once it is decided; keys are stored on the server, never in this admin.</Undecided>}
      <Panel title="Gateway" actions={d.provider ? <Badge tone={d.mode === "live" ? "ok" : "warn"}>{d.mode === "live" ? "Live" : "Test mode"}</Badge> : <Badge>Not connected</Badge>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Provider" htmlFor="pg-prov">
            <Select id="pg-prov" value={d.provider} onChange={(e) => set({ provider: e.target.value })}>
              <option value="">Not chosen yet</option>
              {["Stripe", "Checkout.com", "PayPal Commerce", "Tap Payments", "Network International", "Other"].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Mode" htmlFor="pg-mode"><Select id="pg-mode" value={d.mode} disabled={!d.provider} onChange={(e) => set({ mode: e.target.value as "live" | "test" })}><option value="test">Test, no money moves</option><option value="live">Live, real payments</option></Select></Field>
        </div>
        {d.provider && <p className="mt-3 text-[12.5px] text-muted">Webhook to configure with {d.provider}: <span className="num text-ink-2">/api/webhooks/payments</span></p>}
      </Panel>
      <Panel title="Payment methods at checkout" className="mt-4">
        <Row label="Credit and debit cards"><Toggle label="Cards" checked={d.cards} onChange={(v) => set({ cards: v })} /></Row>
        <Row label="Apple Pay and Google Pay"><Toggle label="Wallets" checked={d.applePay} onChange={(v) => set({ applePay: v })} /></Row>
        <Row label="PayPal"><Toggle label="PayPal" checked={d.paypal} onChange={(v) => set({ paypal: v })} /></Row>
        <Row label="Bank transfer" hint="For bridal and bespoke orders; confirm receipt manually"><Toggle label="Bank transfer" checked={d.bankTransfer} onChange={(v) => set({ bankTransfer: v })} /></Row>
        <Row label="Cash on delivery" hint={d.cod ? `Only for: ${d.codCountries}` : "Off"}><Toggle label="Cash on delivery" checked={d.cod} onChange={(v) => set({ cod: v })} /></Row>
        {d.cod && <div className="mt-3 max-w-sm"><Field label="Cash on delivery countries" htmlFor="pg-cod"><Input id="pg-cod" value={d.codCountries} onChange={(e) => set({ codCountries: e.target.value })} /></Field></div>}
      </Panel>
      <SaveBar dirty={g.dirty} onSave={() => g.save("Payment settings saved")} onReset={g.reset} />
    </>
  );
}

function NotificationsTab() {
  const n = useDraft("notify");
  const sender = useDraft("sender");
  const channels = ["email", "sms", "whatsapp"] as const;
  return (
    <>
      <Panel title="Sender details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From name" htmlFor="sd-n"><Input id="sd-n" value={sender.draft.fromName} onChange={(e) => sender.setDraft({ ...sender.draft, fromName: e.target.value })} /></Field>
          <Field label="From email" htmlFor="sd-e" hint="Must be verified with your email provider"><Input id="sd-e" type="email" value={sender.draft.fromEmail} onChange={(e) => sender.setDraft({ ...sender.draft, fromEmail: e.target.value })} /></Field>
          <Field label="Reply-to" htmlFor="sd-r"><Input id="sd-r" type="email" value={sender.draft.replyTo} onChange={(e) => sender.setDraft({ ...sender.draft, replyTo: e.target.value })} /></Field>
          <Field label="WhatsApp Business number" htmlFor="sd-w"><Input id="sd-w" className="num" value={sender.draft.whatsappNumber} onChange={(e) => sender.setDraft({ ...sender.draft, whatsappNumber: e.target.value })} /></Field>
        </div>
      </Panel>
      <Panel title="Messages" description="WhatsApp uses approved templates from your WhatsApp Business account." className="mt-4" bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead><tr className="bg-surface-2"><th className={th}>Event</th>{channels.map((c) => <th key={c} className={th + " w-24 text-center"}>{c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email"}</th>)}</tr></thead>
            <tbody>
              {Object.entries(n.draft).map(([event, ch]) => (
                <tr key={event} className={tr}>
                  <td className={td}>{event}</td>
                  {channels.map((c) => <td key={c} className={td + " text-center"}><span className="inline-flex"><Toggle label={`${event} by ${c}`} checked={ch[c]} onChange={(v) => n.setDraft({ ...n.draft, [event]: { ...ch, [c]: v } })} /></span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <SaveBar dirty={n.dirty || sender.dirty} onSave={() => { n.save("Notification settings saved"); sender.save("Notification settings saved"); }} onReset={() => { n.reset(); sender.reset(); }} />
    </>
  );
}

const AREAS: [string, string][] = [["dashboard", "Dashboard"], ["catalog", "Catalog"], ["orders", "Orders"], ["payments", "Payments"], ["customers", "Customers"], ["appointments", "Appointments"], ["marketing", "Marketing"], ["cms", "CMS"], ["reviews", "Reviews"], ["analytics", "Analytics"], ["settings", "Settings"]];
const PERMS: Permission[] = ["view", "edit", "delete"];

function TeamTab() {
  const admins = useStore((s) => s.admins);
  const roles = useStore((s) => s.roles);
  const upsertAdmin = useStore((s) => s.upsertAdmin);
  const upsertRole = useStore((s) => s.upsertRole);
  const deleteRole = useStore((s) => s.deleteRole);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<Admin | null>(null);
  const [err, setErr] = useState("");
  const [roleEdit, setRoleEdit] = useState<Role | null>(null);
  const [delRole, setDelRole] = useState<Role | null>(null);
  const isNew = edit && !admins.some((a) => a.id === edit.id);
  const isNewRole = roleEdit && !roles.some((r) => r.id === roleEdit.id);

  const togglePerm = (area: string, p: Permission, on: boolean) => {
    if (!roleEdit) return;
    let cur = roleEdit.permissions[area] ?? [];
    if (on) cur = p === "view" ? [...new Set([...cur, "view" as Permission])] : [...new Set([...cur, "view" as Permission, p])];
    else cur = p === "view" ? [] : cur.filter((x) => x !== p);
    setRoleEdit({ ...roleEdit, permissions: { ...roleEdit.permissions, [area]: cur } });
  };

  return (
    <>
      <Panel title="Admin users" actions={<Button size="sm" icon={Plus} onClick={() => { setErr(""); setEdit({ id: `adm_${Date.now()}`, name: "", email: "", role: "role_ops", atelier: "All", lastActive: 0, status: "invited", twoFactor: false }); }}>Invite</Button>} bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr className="bg-surface-2"><th className={th}>User</th><th className={th}>Role</th><th className={th}>Atelier</th><th className={th}>Two-step login</th><th className={th}>Last active</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className={tr}>
                  <td className={td}><div className="flex items-center gap-2.5"><Avatar name={a.name || a.email} /><div className="min-w-0"><div className="truncate font-medium">{a.name || "Invite pending"}</div><div className="truncate text-[12px] text-muted">{a.email}</div></div></div></td>
                  <td className={td}>{roles.find((r) => r.id === a.role)?.name}</td>
                  <td className={td + " text-muted"}>{a.atelier}</td>
                  <td className={td}>{a.twoFactor ? <span className="inline-flex items-center gap-1 text-ok"><ShieldCheck size={15} weight="fill" />On</span> : <span className="text-[12.5px] text-warn">Off</span>}</td>
                  <td className={td + " text-muted"}>{a.lastActive ? ago(a.lastActive) : "Never"}</td>
                  <td className={td}><StatusBadge status={a.status} /></td>
                  <td className={td + " text-right"}>{a.role !== "role_owner" && <IconButton icon={PencilSimple} label="Edit" size={14} onClick={() => { setErr(""); setEdit(a); }} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Roles and permissions" className="mt-4" actions={<Button size="sm" icon={Plus} onClick={() => setRoleEdit({ id: `role_${Date.now()}`, name: "", description: "", locked: false, permissions: Object.fromEntries(AREAS.map(([k]) => [k, []])) })}>New role</Button>} bodyClass="">
        <ul>
          {roles.map((r) => {
            const users = admins.filter((a) => a.role === r.id).length;
            const areas = AREAS.filter(([k]) => r.permissions[k]?.length).map(([, l]) => l);
            return (
              <li key={r.id} className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{r.name} <span className="num ml-1 text-[12px] font-normal text-muted">{users} user{users === 1 ? "" : "s"}</span></div>
                  <div className="truncate text-[12.5px] text-muted">{r.locked ? "Everything" : areas.join(", ") || "No access"}</div>
                </div>
                {r.locked ? <Badge mark={false}>Fixed</Badge> : <Button size="sm" icon={PencilSimple} onClick={() => setRoleEdit(structuredClone(r))}>Edit</Button>}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "Invite admin" : "Edit admin"} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" icon={isNew ? EnvelopeSimple : undefined} onClick={() => {
        if (!edit) return;
        if (!/^\S+@\S+\.\S+$/.test(edit.email)) return setErr("Enter a valid email address.");
        upsertAdmin(edit);
        toast(isNew ? `Invite sent to ${edit.email}` : "Admin updated");
        setEdit(null);
      }}>{isNew ? "Send invite" : "Save"}</Button></>}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="ad-name"><Input id="ad-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="ad-email" error={err}><Input id="ad-email" type="email" value={edit.email} aria-invalid={!!err} disabled={!isNew} onChange={(e) => { setErr(""); setEdit({ ...edit, email: e.target.value }); }} /></Field>
            <Field label="Role" htmlFor="ad-role" hint={roles.find((r) => r.id === edit.role)?.description}>
              <Select id="ad-role" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{roles.filter((r) => !r.locked).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
            </Field>
            <Field label="Atelier" htmlFor="ad-at" hint="Concierge staff only see appointments for their atelier"><Select id="ad-at" value={edit.atelier} onChange={(e) => setEdit({ ...edit, atelier: e.target.value as Admin["atelier"] })}>{["All", "London", "Dubai", "Doha", "Lahore"].map((a) => <option key={a}>{a}</option>)}</Select></Field>
            {!isNew && <label className="flex items-center justify-between rounded-[4px] border border-line px-3 py-2.5 text-[13px]">Account active<Toggle label="Account active" checked={edit.status !== "suspended"} onChange={(v) => setEdit({ ...edit, status: v ? "active" : "suspended" })} /></label>}
          </div>
        )}
      </Drawer>

      <Drawer open={!!roleEdit} onClose={() => setRoleEdit(null)} title={isNewRole ? "New role" : `Edit ${roleEdit?.name}`} width={600} footer={<>{!isNewRole && roleEdit && <Button variant="ghost" icon={Trash} className="mr-auto text-bad" onClick={() => setDelRole(roleEdit)}>Delete role</Button>}<Button onClick={() => setRoleEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { if (!roleEdit?.name.trim()) return toast("Give the role a name", "bad"); upsertRole(roleEdit); toast(`${roleEdit.name} saved`); setRoleEdit(null); }}>Save role</Button></>}>
        {roleEdit && (
          <div className="flex flex-col gap-4">
            <Field label="Role name" htmlFor="rl-n"><Input id="rl-n" value={roleEdit.name} onChange={(e) => setRoleEdit({ ...roleEdit, name: e.target.value })} /></Field>
            <Field label="Description" htmlFor="rl-d"><Input id="rl-d" value={roleEdit.description} onChange={(e) => setRoleEdit({ ...roleEdit, description: e.target.value })} /></Field>
            <div className="overflow-hidden rounded-[4px] border border-line">
              <table className="w-full">
                <thead><tr className="bg-surface-2"><th className={th}>Area</th>{PERMS.map((p) => <th key={p} className={th + " w-20 text-center capitalize"}>{p}</th>)}</tr></thead>
                <tbody>
                  {AREAS.map(([k, label]) => (
                    <tr key={k} className="border-t border-line">
                      <td className="h-10 px-3 pl-4 text-[13px]">{label}</td>
                      {PERMS.map((p) => (
                        <td key={p} className="h-10 text-center">
                          <input type="checkbox" aria-label={`${label}: ${p}`} checked={roleEdit.permissions[k]?.includes(p) ?? false} onChange={(e) => togglePerm(k, p, e.target.checked)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12.5px] text-muted">Edit and Delete include View. Payments, refunds and settings changes are recorded in the activity log.</p>
          </div>
        )}
      </Drawer>
      <Confirm open={!!delRole} onClose={() => setDelRole(null)} onConfirm={() => { if (delRole) { deleteRole(delRole.id); toast(`${delRole.name} deleted; its users moved to Operations`); setRoleEdit(null); } }} title={`Delete ${delRole?.name}?`} body="Anyone with this role moves to Operations until you assign another." confirmLabel="Delete role" danger />
    </>
  );
}

function ActivityTab() {
  const audit = useStore((s) => s.audit);
  const admins = useStore((s) => s.admins);
  const [who, setWho] = useState("any");
  const rows = audit.filter((a) => who === "any" || a.adminId === who);
  return (
    <Panel title="Activity log" description="Every change made in the admin, kept for 180 days." actions={<Select aria-label="Filter by person" value={who} onChange={(e) => setWho(e.target.value)} className="h-8 w-auto text-[12.5px]"><option value="any">Everyone</option>{admins.filter((a) => a.lastActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>} bodyClass="">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead><tr className="bg-surface-2"><th className={th}>Who</th><th className={th}>Action</th><th className={th}>On</th><th className={th}>When</th><th className={th}>IP address</th></tr></thead>
          <tbody>
            {rows.map((a) => {
              const u = admins.find((x) => x.id === a.adminId);
              return (
                <tr key={a.id} className={tr}>
                  <td className={td}><div className="flex items-center gap-2"><Avatar name={u?.name ?? "?"} size={24} /><span>{u?.name}</span></div></td>
                  <td className={td}>{a.action}</td>
                  <td className={td + " text-muted"}>{a.target}</td>
                  <td className={td + " whitespace-nowrap text-muted"}>{ago(a.at)}</td>
                  <td className={td + " num text-[12px] text-faint"}>{a.ip}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Settings() {
  const { tab } = useParams();
  if (!tabs.some(([k]) => k === tab)) return <Navigate to="/settings/store" replace />;
  const key = tab as TabKey;
  const view: Record<TabKey, ReactNode> = { store: <StoreTab />, shipping: <ShippingTab />, tax: <TaxTab />, payments: <PaymentsTab />, notifications: <NotificationsTab />, team: <TeamTab />, activity: <ActivityTab /> };

  return (
    <>
      <div className="mx-auto w-full max-w-5xl">
      <PageHeader title={tabs.find(([k]) => k === key)![1]} />
      <div className="grid gap-5">
        <nav aria-label="Settings sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:hidden">
          {tabs.map(([k, label]) => (
            <NavLink key={k} to={`/settings/${k}`} className={({ isActive }) => cx("relative shrink-0 rounded-[4px] px-3 py-2 text-[13px] transition-colors", isActive ? "bg-surface font-semibold text-ink ring-1 ring-line" : "text-muted hover:text-ink")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div key={key} className="min-w-0">{view[key]}</div>
      </div>
      </div>
    </>
  );
}
