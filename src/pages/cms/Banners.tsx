import { useState } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useStore } from "../../lib/store";
import { cx, date } from "../../lib/format";
import type { Banner, NavLink } from "../../lib/types";
import { Badge, Button, Confirm, Drawer, Field, IconButton, Input, PageHeader, Panel, Select, Tabs, Textarea, Toggle } from "../../components/ui";
import { MediaPicker } from "../ProductEditor";

const PLACEMENT: Record<Banner["placement"], string> = { hero: "Hero slide", announcement: "Announcement bar", collection: "Collection banner", popup: "Pop-up" };
const toInput = (ts: number | null) => (ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");
const fromInput = (s: string) => (s ? new Date(s + "T00:00:00").getTime() : null);

function scheduleState(b: Banner): [string, "ok" | "info" | "neutral"] {
  const now = Date.now();
  if (!b.active) return ["Off", "neutral"];
  if (b.startsAt && b.startsAt > now) return [`From ${date(b.startsAt)}`, "info"];
  if (b.endsAt && b.endsAt < now) return ["Ended", "neutral"];
  return [b.endsAt ? `Live until ${date(b.endsAt)}` : "Live", "ok"];
}

export function Banners() {
  const banners = useStore((s) => s.banners);
  const settings = useStore((s) => s.settings);
  const links = useStore((s) => s.navLinks);
  const upsert = useStore((s) => s.upsertBanner);
  const remove = useStore((s) => s.deleteBanner);
  const setLinks = useStore((s) => s.setNavLinks);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<"banners" | "header">("banners");
  const [edit, setEdit] = useState<Banner | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [del, setDel] = useState<Banner | null>(null);

  const [identity, setIdentity] = useState({ name: settings.name, tagline: settings.tagline, footerText: settings.footerText });
  const [menu, setMenu] = useState<NavLink[]>(links);
  const [menuErr, setMenuErr] = useState<Record<string, string>>({});
  const headerDirty = JSON.stringify(identity) !== JSON.stringify({ name: settings.name, tagline: settings.tagline, footerText: settings.footerText }) || JSON.stringify(menu) !== JSON.stringify(links);

  const announcement = banners.find((b) => b.placement === "announcement");
  const others = banners.filter((b) => b.placement !== "announcement").sort((a, b) => (a.placement === b.placement ? a.order - b.order : a.placement.localeCompare(b.placement)));

  const moveBanner = (b: Banner, dir: -1 | 1) => {
    const same = others.filter((x) => x.placement === b.placement);
    const swap = same[same.indexOf(b) + dir];
    if (!swap) return;
    upsert({ ...b, order: swap.order });
    upsert({ ...swap, order: b.order });
  };

  const save = () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.title.trim()) e.title = "A banner needs a headline.";
    if (edit.placement !== "announcement" && !edit.image) e.image = "Choose an image.";
    if (edit.ctaLabel && !/^(\/|https?:\/\/)/.test(edit.ctaLink)) e.ctaLink = "Links start with / or https://";
    if (edit.startsAt && edit.endsAt && edit.endsAt <= edit.startsAt) e.endsAt = "End must be after start.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert(edit);
    toast("Banner saved");
    setEdit(null);
  };

  const saveHeader = () => {
    const e: Record<string, string> = {};
    if (!identity.name.trim()) e.name = "The site needs a name.";
    menu.forEach((l) => {
      if (!l.label.trim()) e[`l-${l.id}`] = "Label required";
      else if (!/^(\/|https?:\/\/)/.test(l.href)) e[`h-${l.id}`] = "Start with / or https://";
    });
    setMenuErr(e);
    if (Object.keys(e).length) return;
    update(identity);
    setLinks(menu);
    toast("Header and menu saved");
  };
  const moveLink = (i: number, dir: -1 | 1) => setMenu((m) => { const n = [...m]; const j = i + dir; if (j < 0 || j >= n.length) return m; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return (
    <>
      <PageHeader
        title="Headers & banners"
        description="The announcement bar, hero slides, collection banners, and the header menu."
        actions={tab === "banners"
          ? <Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setEdit({ id: `bn_${Date.now()}`, placement: "hero", title: "", subtitle: "", ctaLabel: "", ctaLink: "/", secondaryLabel: "", secondaryLink: "", image: "", startsAt: null, endsAt: null, active: true, order: banners.length }); }}>Add banner</Button>
          : <><Button disabled={!headerDirty} onClick={() => { setIdentity({ name: settings.name, tagline: settings.tagline, footerText: settings.footerText }); setMenu(links); setMenuErr({}); }}>Discard</Button><Button variant="primary" disabled={!headerDirty} onClick={saveHeader}>Save</Button></>}
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: "banners", label: "Banners", count: banners.length }, { value: "header", label: "Header & menu" }]} />

      {tab === "banners" ? (
        <div className="flex flex-col gap-4">
          {announcement && (
            <Panel title="Announcement bar" description="The thin strip above the header on every page." actions={<Toggle label="Show the announcement bar" checked={announcement.active} onChange={(v) => { upsert({ ...announcement, active: v }); toast(v ? "Announcement bar shown" : "Announcement bar hidden"); }} />}>
              <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
                <Field label="Message" htmlFor="ann-t" aside={<span className={cx("num", announcement.title.length > 70 && "text-warn")}>{announcement.title.length}/70</span>}><Input id="ann-t" defaultValue={announcement.title} onBlur={(e) => e.target.value !== announcement.title && (upsert({ ...announcement, title: e.target.value }), toast("Announcement updated"))} /></Field>
                <Field label="Link" htmlFor="ann-l"><Input id="ann-l" defaultValue={announcement.ctaLink} onBlur={(e) => e.target.value !== announcement.ctaLink && upsert({ ...announcement, ctaLink: e.target.value })} /></Field>
                <Badge tone={scheduleState(announcement)[1]}>{scheduleState(announcement)[0]}</Badge>
              </div>
              <div className="mt-3 rounded-[3px] bg-gold px-3 py-1.5 text-center text-[12px] text-gold-ink">{announcement.title}</div>
            </Panel>
          )}
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {others.map((b) => {
              const [label, tone] = scheduleState(b);
              const same = others.filter((x) => x.placement === b.placement);
              return (
                <li key={b.id} className={cx("flex flex-col overflow-hidden rounded-[6px] border border-line bg-surface", !b.active && "opacity-70")}>
                  <div className="relative aspect-[16/9] bg-sunken">
                    {b.image && <img src={b.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="text-[12px] text-muted">{PLACEMENT[b.placement]}{b.placement === "hero" && `, slide ${same.indexOf(b) + 1} of ${same.length}`}</span><Badge tone={tone}>{label}</Badge></div>
                    <div className="display text-[16px] leading-snug">{b.title}</div>
                    {b.subtitle && <p className="line-clamp-2 text-[12.5px] text-muted">{b.subtitle}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="flex">
                        <IconButton icon={ArrowUp} label="Move earlier" size={14} disabled={same.indexOf(b) === 0} onClick={() => moveBanner(b, -1)} />
                        <IconButton icon={ArrowDown} label="Move later" size={14} disabled={same.indexOf(b) === same.length - 1} onClick={() => moveBanner(b, 1)} />
                        <IconButton icon={Trash} label="Delete banner" size={14} className="hover:text-bad" onClick={() => setDel(b)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle label={`Show ${b.title}`} checked={b.active} onChange={(v) => { upsert({ ...b, active: v }); toast(`“${b.title}” ${v ? "turned on" : "turned off"}`); }} />
                        <Button size="sm" icon={PencilSimple} onClick={() => { setErrors({}); setEdit(b); }}>Edit</Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Site identity">
            <div className="flex flex-col gap-4">
              <Field label="Site title" htmlFor="n-name" error={menuErr.name} hint="Shown in the header and browser tab"><Input id="n-name" value={identity.name} aria-invalid={!!menuErr.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} /></Field>
              <Field label="Tagline" htmlFor="n-tag"><Input id="n-tag" value={identity.tagline} onChange={(e) => setIdentity({ ...identity, tagline: e.target.value })} /></Field>
              <Field label="Footer text" htmlFor="n-foot"><Textarea id="n-foot" value={identity.footerText} onChange={(e) => setIdentity({ ...identity, footerText: e.target.value })} className="min-h-16" /></Field>
            </div>
          </Panel>
          <Panel title="Header menu" description="Left to right, as on the storefront." actions={<Button size="sm" icon={Plus} onClick={() => setMenu([...menu, { id: `n${Date.now()}`, label: "", href: "/" }])}>Add link</Button>}>
            <ul className="flex flex-col gap-2">
              {menu.map((l, i) => (
                <li key={l.id} className="grid grid-cols-[1fr_1.2fr_auto] items-start gap-2">
                  <div><Input aria-label="Label" placeholder="Label" value={l.label} aria-invalid={!!menuErr[`l-${l.id}`]} onChange={(e) => setMenu(menu.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))} />{menuErr[`l-${l.id}`] && <p className="mt-1 text-[12px] text-bad">{menuErr[`l-${l.id}`]}</p>}</div>
                  <div><Input aria-label="Link" className="num text-[12.5px]" value={l.href} aria-invalid={!!menuErr[`h-${l.id}`]} onChange={(e) => setMenu(menu.map((x) => (x.id === l.id ? { ...x, href: e.target.value } : x)))} />{menuErr[`h-${l.id}`] && <p className="mt-1 text-[12px] text-bad">{menuErr[`h-${l.id}`]}</p>}</div>
                  <div className="flex">
                    <IconButton icon={ArrowUp} label="Move left" size={13} onClick={() => moveLink(i, -1)} />
                    <IconButton icon={ArrowDown} label="Move right" size={13} onClick={() => moveLink(i, 1)} />
                    <IconButton icon={Trash} label="Remove link" size={13} className="hover:text-bad" onClick={() => setMenu(menu.filter((x) => x.id !== l.id))} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between gap-4 overflow-hidden rounded-[3px] bg-[#0b0a09] px-4 py-3">
              <span className="display text-[14px] font-semibold tracking-[0.22em] text-[#e2b13c]">{identity.name.split(" ")[0] || "RINAZ"}</span>
              <span className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10.5px] tracking-[0.1em] text-[#fff8e7]/80">{menu.map((l) => <span key={l.id}>{(l.label || "Untitled").toUpperCase()}</span>)}</span>
            </div>
          </Panel>
        </div>
      )}

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit && banners.some((b) => b.id === edit.id) ? "Edit banner" : "New banner"} width={560} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save banner</Button></>}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Placement" htmlFor="b-pl">
              <Select id="b-pl" value={edit.placement} onChange={(e) => setEdit({ ...edit, placement: e.target.value as Banner["placement"] })}>
                <option value="hero">Hero slide, top of the homepage</option>
                <option value="collection">Collection banner, top of a collection page</option>
                <option value="popup">Pop-up, shown once per visit</option>
              </Select>
            </Field>
            <Field label="Image" error={errors.image} hint="Landscape, at least 2400 px wide">
              {edit.image ? (
                <div className="relative overflow-hidden rounded-[4px] border border-line">
                  <img src={edit.image} alt="" className="aspect-[16/9] w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5"><Button size="sm" onClick={() => setPicker(true)}>Replace</Button></div>
                </div>
              ) : (
                <button type="button" onClick={() => setPicker(true)} className={cx("flex aspect-[16/9] items-center justify-center gap-2 rounded-[4px] border border-dashed text-[13px] text-muted hover:bg-surface-2", errors.image ? "border-bad" : "border-line-strong")}><ImageIcon size={18} /> Choose image</button>
              )}
            </Field>
            <Field label="Headline" htmlFor="b-t" error={errors.title} aside={<span className={cx("num", edit.title.length > 40 && "text-warn")}>{edit.title.length}/40</span>}><Input id="b-t" value={edit.title} aria-invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Text" htmlFor="b-s"><Textarea id="b-s" value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} className="min-h-16" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Main button" htmlFor="b-cl"><Input id="b-cl" value={edit.ctaLabel} placeholder="e.g. Shop new in" onChange={(e) => setEdit({ ...edit, ctaLabel: e.target.value })} /></Field>
              <Field label="Links to" htmlFor="b-ck" error={errors.ctaLink}><Input id="b-ck" value={edit.ctaLink} onChange={(e) => setEdit({ ...edit, ctaLink: e.target.value })} /></Field>
              <Field label="Second button" htmlFor="b-sl"><Input id="b-sl" value={edit.secondaryLabel} placeholder="Optional" onChange={(e) => setEdit({ ...edit, secondaryLabel: e.target.value })} /></Field>
              <Field label="Links to" htmlFor="b-sk"><Input id="b-sk" value={edit.secondaryLink} onChange={(e) => setEdit({ ...edit, secondaryLink: e.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Show from" htmlFor="b-from" hint="Empty to show now"><Input id="b-from" type="date" value={toInput(edit.startsAt)} onChange={(e) => setEdit({ ...edit, startsAt: fromInput(e.target.value) })} /></Field>
              <Field label="Show until" htmlFor="b-to" error={errors.endsAt} hint="Empty for no end"><Input id="b-to" type="date" value={toInput(edit.endsAt)} onChange={(e) => setEdit({ ...edit, endsAt: fromInput(e.target.value) })} /></Field>
            </div>
          </div>
        )}
      </Drawer>
      <MediaPicker open={picker} multiple={false} onClose={() => setPicker(false)} onPick={([url]) => edit && setEdit({ ...edit, image: url })} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { remove(del.id); toast("Banner deleted"); } }} title={`Delete “${del?.title}”?`} body="It is removed from the storefront straight away. Promotions linked to it lose their banner." confirmLabel="Delete" danger />
    </>
  );
}
