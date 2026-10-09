import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarBlank, CaretLeft, CaretRight, ChatCircleText, Check, EnvelopeSimple, Plus, X } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { cx, date, localDayKey, localHour, time, zonedParts, zonedToUtc } from "../lib/format";
import type { Appointment, AppointmentStatus, AppointmentType, Atelier } from "../lib/types";
import { Badge, Button, Drawer, EmptyState, Field, Input, KeyValue, PageHeader, Panel, Ref, SearchInput, Segmented, Select, StatusBadge, Tabs, Textarea, td, th, tr } from "../components/ui";
import { SalonDay } from "../components/SalonDay";

const TYPES: AppointmentType[] = ["Bridal consultation", "Fine jewelry viewing", "Custom measurements", "Fitting", "Styling session"];
const DURATION: Record<AppointmentType, number> = { "Bridal consultation": 90, "Fine jewelry viewing": 60, "Custom measurements": 45, Fitting: 60, "Styling session": 60 };
const MEASURES = ["Bust", "Waist", "Hips", "Height", "Shoulder to hem", "Sleeve"];
type Tab = "upcoming" | AppointmentStatus | "all";

export function Appointments() {
  const appointments = useStore((s) => s.appointments);
  const ateliers = useStore((s) => s.ateliers);
  const customers = useStore((s) => s.customers);
  const upsert = useStore((s) => s.upsertAppointment);
  const setStatus = useStore((s) => s.setAppointmentStatus);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const toast = useStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const tab = (params.get("status") as Tab) || "upcoming";
  const openId = params.get("a");
  const [view, setView] = useState<"day" | "list">("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [atelier, setAtelier] = useState<"all" | Atelier>("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Appointment | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setParam = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n);
  };
  const open = appointments.find((a) => a.id === openId) ?? null;
  const atelierOf = (n: Atelier) => ateliers.find((a) => a.name === n)!;

  const now = Date.now();
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return appointments
      .filter((a) => (atelier === "all" || a.atelier === atelier))
      .filter((a) => (tab === "all" ? true : tab === "upcoming" ? a.start >= now - 3_600_000 && (a.status === "confirmed" || a.status === "requested") : a.status === tab))
      .filter((a) => !t || a.clientName.toLowerCase().includes(t) || a.ref.toLowerCase().includes(t) || a.stylist.toLowerCase().includes(t))
      .sort((a, b) => (tab === "upcoming" || tab === "requested" ? a.start - b.start : b.start - a.start));
  }, [appointments, atelier, tab, q, now]);
  const counts = {
    upcoming: appointments.filter((a) => a.start >= now - 3_600_000 && (a.status === "confirmed" || a.status === "requested")).length,
    requested: appointments.filter((a) => a.status === "requested").length,
  };

  const groups = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of rows) {
      const k = date(a.start);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [rows]);

  const newDraft = (): Appointment => {
    const a = ateliers[0];
    const start = zonedToUtc(zonedParts(now + 86_400_000, a.timezone).date, `${String(a.opens + 1).padStart(2, "0")}:00`, a.timezone);
    return { id: `apt_${Date.now()}`, ref: `APT-${Math.max(...appointments.map((x) => Number(x.ref.slice(4)))) + 1}`, customerId: null, clientName: "", email: "", phone: "", atelier: a.name, type: "Bridal consultation", start, durationMin: 90, stylist: a.stylists[0], status: "confirmed", eventDate: null, notes: "", measurements: {}, createdAt: Date.now(), source: "phone" };
  };

  const saveDraft = () => {
    if (!draft) return;
    const a = atelierOf(draft.atelier);
    const e: Record<string, string> = {};
    if (!draft.clientName.trim()) e.client = "Add the client's name.";
    if (!draft.phone.trim() && !draft.email.trim()) e.contact = "Add a phone number or email so we can confirm.";
    const h = localHour(draft.start, a.timezone);
    if (h < a.opens || h + draft.durationMin / 60 > a.closes) e.time = `${a.name} is open ${a.opens}:00 to ${a.closes}:00 local time.`;
    const clash = appointments.find((x) => x.id !== draft.id && x.stylist === draft.stylist && !["cancelled", "no_show"].includes(x.status) && x.start < draft.start + draft.durationMin * 60_000 && draft.start < x.start + x.durationMin * 60_000);
    if (clash) e.time = `${draft.stylist} already has ${clash.clientName} at ${time(clash.start, a.timezone)}.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const isNew = !appointments.some((x) => x.id === draft.id);
    upsert(draft);
    toast(isNew ? `${draft.ref} booked for ${draft.clientName}` : `${draft.ref} updated`);
    setDraft(null);
  };

  const act = (a: Appointment, s: AppointmentStatus, msg: string) => { setStatus(a.id, s); toast(`${a.ref} ${msg}`); };

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Private salon bookings across London, Dubai, Doha and Lahore. Times show in each atelier's local time."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setDraft(newDraft()); }}>New appointment</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented label="View" value={view} onChange={setView} items={[{ value: "day", label: "Day" }, { value: "list", label: "List" }]} />
        <Select aria-label="Atelier" value={atelier} onChange={(e) => setAtelier(e.target.value as Atelier)} className="w-auto">
          <option value="all">All ateliers</option>
          {ateliers.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </Select>
        {view === "list" && <SearchInput value={q} onChange={setQ} placeholder="Client, reference or stylist" className="w-full sm:ml-auto sm:w-64" />}
      </div>

      {view === "day" ? (
        <Panel
          title={dayOffset === 0 ? "Today" : new Date(now + dayOffset * 86_400_000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          actions={
            <>
              <Button size="sm" icon={CaretLeft} aria-label="Previous day" onClick={() => setDayOffset((d) => d - 1)} />
              <Button size="sm" onClick={() => setDayOffset(0)} disabled={dayOffset === 0}>Today</Button>
              <Button size="sm" icon={CaretRight} aria-label="Next day" onClick={() => setDayOffset((d) => d + 1)} />
            </>
          }
          bodyClass=""
        >
          <SalonDay dayOffset={dayOffset} only={atelier === "all" ? undefined : atelier} onSelect={(a) => setParam("a", a.id)} />
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-[2px] bg-ink" />Confirmed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-[2px] border border-dashed border-ink" />Requested</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-[2px] border border-line-strong bg-sunken" />Completed</span>
          </div>
        </Panel>
      ) : (
        <div className="rounded-[6px] border border-line bg-surface">
          <div className="px-4">
            <Tabs value={tab} onChange={(v) => setParam("status", v === "upcoming" ? null : v)} items={[
              { value: "upcoming", label: "Upcoming", count: counts.upcoming },
              { value: "requested", label: "To confirm", count: counts.requested },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "no_show", label: "No shows" },
              { value: "all", label: "All" },
            ]} />
          </div>
          {rows.length === 0 ? (
            <div className="border-t border-line"><EmptyState icon={CalendarBlank} title="No appointments here" body="Bookings from the website, WhatsApp and phone appear in this list." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead><tr className="border-t border-line bg-surface-2"><th className={th}>Time</th><th className={th}>Reference</th><th className={th}>Client</th><th className={th}>Appointment</th><th className={th}>Stylist</th><th className={th}>Status</th><th className={th}></th></tr></thead>
                {groups.slice(0, 20).map(([day, list]) => (
                  <tbody key={day}>
                    <tr className="border-t border-line"><td colSpan={7} className="bg-surface-2 px-4 py-1.5 text-[12px] font-semibold text-ink-2">{day}</td></tr>
                    {list.map((a) => {
                      const at = atelierOf(a.atelier);
                      return (
                        <tr key={a.id} className={tr + " cursor-pointer"} onClick={() => setParam("a", a.id)}>
                          <td className={td + " whitespace-nowrap"}><span className="num font-medium">{time(a.start, at.timezone)}</span> <span className="text-[12px] text-muted">{a.atelier}</span></td>
                          <td className={td}><Ref>{a.ref}</Ref></td>
                          <td className={td}><div className="max-w-48 truncate font-medium">{a.clientName}</div><div className="text-[12px] text-muted">via {a.source}</div></td>
                          <td className={td}><div>{a.type}</div><div className="num text-[12px] text-muted">{a.durationMin} min</div></td>
                          <td className={td + " text-muted"}>{a.stylist}</td>
                          <td className={td}><StatusBadge status={a.status} /></td>
                          <td className={td + " text-right"} onClick={(e) => e.stopPropagation()}>
                            {a.status === "requested" && <Button size="sm" icon={Check} onClick={() => act(a, "confirmed", "confirmed, client notified")}>Confirm</Button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail */}
      <Drawer
        open={!!open}
        onClose={() => setParam("a", null)}
        title={open ? <span className="flex items-center gap-2.5"><Ref>{open.ref}</Ref><StatusBadge status={open.status} /></span> : ""}
        width={560}
        footer={open && (
          <>
            {open.status === "requested" && <Button variant="primary" icon={Check} onClick={() => act(open, "confirmed", "confirmed, client notified")}>Confirm</Button>}
            {open.status === "confirmed" && open.start < now + 3_600_000 && <Button variant="primary" icon={Check} onClick={() => act(open, "completed", "marked completed")}>Mark completed</Button>}
            {open.status === "confirmed" && open.start < now && <Button onClick={() => act(open, "no_show", "marked as no show")}>No show</Button>}
            {["requested", "confirmed"].includes(open.status) && <Button variant="ghost" icon={X} className="text-bad" onClick={() => act(open, "cancelled", "cancelled")}>Cancel</Button>}
            <Button className="mr-auto order-first" onClick={() => { setErrors({}); setDraft({ ...open }); setParam("a", null); }}>Edit or reschedule</Button>
          </>
        )}
      >
        {open && (() => {
          const at = atelierOf(open.atelier);
          const cust = customers.find((c) => c.id === open.customerId);
          return (
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-[18px] font-semibold">{open.clientName}</div>
                <div className="mt-1 text-[13px] text-muted">{open.type} at {open.atelier}, {at.label}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {open.email && <a href={`mailto:${open.email}`}><Button size="sm" icon={EnvelopeSimple}>Email</Button></a>}
                  {open.phone && <a href={`https://wa.me/${open.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Button size="sm" icon={ChatCircleText}>WhatsApp</Button></a>}
                  {cust && <Link to={`/customers?c=${cust.id}`}><Button size="sm">Client profile</Button></Link>}
                </div>
              </div>
              <KeyValue items={[
                ["When", <span><span className="num">{date(open.start, true, at.timezone)}</span> {open.atelier} time</span>],
                ["Your time", <span className="num text-muted">{date(open.start, true)}</span>],
                ["Duration", <span className="num">{open.durationMin} min</span>],
                ["Stylist", open.stylist],
                ["Booked via", `${open.source[0].toUpperCase()}${open.source.slice(1)}, ${date(open.createdAt)}`],
                ...(open.eventDate ? [["Event date", date(open.eventDate)] as [string, React.ReactNode]] : []),
                ["Contact", <span className="num">{[open.phone, open.email].filter(Boolean).join(" · ")}</span>],
              ]} />
              {open.notes && <div className="rounded-[4px] border border-line bg-surface-2 p-3 text-[13px] text-ink-2">{open.notes}</div>}
              <MeasurementsForm
                key={open.id}
                initial={Object.keys(open.measurements).length ? open.measurements : cust?.measurements ?? {}}
                onSave={(m) => {
                  upsert({ ...open, measurements: m });
                  if (cust) updateCustomer({ ...cust, measurements: m });
                  toast(cust ? "Measurements saved to the appointment and client profile" : "Measurements saved");
                }}
              />
            </div>
          );
        })()}
      </Drawer>

      {/* Create / edit */}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft && appointments.some((x) => x.id === draft.id) ? `Edit ${draft.ref}` : "New appointment"}
        footer={<><Button onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveDraft}>{draft && appointments.some((x) => x.id === draft.id) ? "Save changes" : "Book appointment"}</Button></>}
      >
        {draft && (() => {
          const at = atelierOf(draft.atelier);
          const parts = zonedParts(draft.start, at.timezone);
          return (
            <div className="flex flex-col gap-4">
              <Field label="Existing client" htmlFor="ap-cust" hint="Or leave empty and type a new client's details below.">
                <Select id="ap-cust" value={draft.customerId ?? ""} onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  setDraft({ ...draft, customerId: c?.id ?? null, clientName: c?.name ?? draft.clientName, email: c?.email ?? draft.email, phone: c?.phone ?? draft.phone });
                }}>
                  <option value="">New client</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.city}</option>)}
                </Select>
              </Field>
              <Field label="Client name" htmlFor="ap-name" error={errors.client}><Input id="ap-name" value={draft.clientName} aria-invalid={!!errors.client} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone or WhatsApp" htmlFor="ap-phone" error={errors.contact}><Input id="ap-phone" type="tel" value={draft.phone} aria-invalid={!!errors.contact} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
                <Field label="Email" htmlFor="ap-email"><Input id="ap-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Atelier" htmlFor="ap-at">
                  <Select id="ap-at" value={draft.atelier} onChange={(e) => {
                    const na = atelierOf(e.target.value as Atelier);
                    setDraft({ ...draft, atelier: na.name, stylist: na.stylists[0], start: zonedToUtc(parts.date, parts.time, na.timezone) });
                  }}>
                    {ateliers.map((a) => <option key={a.name} value={a.name}>{a.name}, {a.label}</option>)}
                  </Select>
                </Field>
                <Field label="Appointment" htmlFor="ap-type">
                  <Select id="ap-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as AppointmentType, durationMin: DURATION[e.target.value as AppointmentType] })}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Date" htmlFor="ap-date"><Input id="ap-date" type="date" value={parts.date} onChange={(e) => e.target.value && setDraft({ ...draft, start: zonedToUtc(e.target.value, parts.time, at.timezone) })} /></Field>
                <Field label={`Time (${draft.atelier})`} htmlFor="ap-time" error={errors.time}><Input id="ap-time" type="time" step={900} value={parts.time} aria-invalid={!!errors.time} onChange={(e) => e.target.value && setDraft({ ...draft, start: zonedToUtc(parts.date, e.target.value, at.timezone) })} /></Field>
                <Field label="Length" htmlFor="ap-dur"><Select id="ap-dur" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Field>
              </div>
              <p className="-mt-2 text-[12px] text-muted">Open {at.opens}:00 to {at.closes}:00 local time. That is <span className="num">{time(draft.start)}</span> for you.</p>
              <Field label="Stylist" htmlFor="ap-sty"><Select id="ap-sty" value={draft.stylist} onChange={(e) => setDraft({ ...draft, stylist: e.target.value })}>{at.stylists.map((s) => <option key={s}>{s}</option>)}</Select></Field>
              {(draft.type === "Bridal consultation" || draft.type === "Fitting") && (
                <Field label="Wedding or event date" htmlFor="ap-ev" hint="Helps plan the making time for couture.">
                  <Input id="ap-ev" type="date" value={draft.eventDate ? localDayKey(draft.eventDate, at.timezone) : ""} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value ? Date.parse(e.target.value) : null })} />
                </Field>
              )}
              <Field label="Notes" htmlFor="ap-notes"><Textarea id="ap-notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Occasion, preferences, pieces to prepare" /></Field>
              <Field label="Status" htmlFor="ap-st"><Select id="ap-st" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AppointmentStatus })}><option value="confirmed">Confirmed</option><option value="requested">Requested, not yet confirmed</option></Select></Field>
            </div>
          );
        })()}
      </Drawer>
    </>
  );
}

function MeasurementsForm({ initial, onSave }: { initial: Record<string, string>; onSave: (m: Record<string, string>) => void }) {
  const [m, setM] = useState<Record<string, string>>(initial);
  const dirty = JSON.stringify(m) !== JSON.stringify(initial);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold">Measurements</h3>
        {Object.keys(initial).length > 0 && <Badge tone="ok">On file</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MEASURES.map((k) => (
          <Field key={k} label={k} htmlFor={`m-${k}`}>
            <Input id={`m-${k}`} className={cx("num")} placeholder="in" value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex justify-end"><Button size="sm" disabled={!dirty} onClick={() => onSave(Object.fromEntries(Object.entries(m).filter(([, v]) => v.trim())))}>Save measurements</Button></div>
    </div>
  );
}
