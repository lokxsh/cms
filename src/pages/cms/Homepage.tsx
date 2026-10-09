import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, EyeSlash, Plus, Trash, Image as ImageIcon } from "@phosphor-icons/react";
import { useStore } from "../../lib/store";
import { cx, money } from "../../lib/format";
import type { HomeSection, SectionType } from "../../lib/types";
import { Button, Confirm, Field, IconButton, Input, PageHeader, Panel, Segmented, Select, Textarea } from "../../components/ui";
import { MediaPicker } from "../ProductEditor";

const typeLabels: Record<SectionType, string> = {
  hero_slider: "Hero slider",
  collection_tiles: "Collection tiles",
  capsule: "Capsule feature",
  service_promises: "Service promises",
  curated_look: "Curated look",
  brand_story: "Brand story",
  salon_cta: "Salon booking",
  locations: "Studio locations",
  newsletter: "Newsletter signup",
  product_row: "Product row",
};

const defaults: Record<SectionType, Record<string, string>> = {
  hero_slider: { source: "Hero banners", autoplay: "6" },
  collection_tiles: { heading: "", subheading: "", tiles: "" },
  capsule: { heading: "", body: "", ctaLabel: "Shop the capsule", ctaLink: "/", image: "" },
  service_promises: { items: "100% Certified Authentic | DHL Express Worldwide | 14-Day Global Returns | 24/7 Styling Concierge" },
  curated_look: { heading: "", body: "", products: "", image: "" },
  brand_story: { heading: "", body: "" },
  salon_cta: { heading: "", subheading: "", ctaLabel: "Book bridal appointment", ctaLink: "/#sanctuary" },
  locations: { ateliers: "London, Dubai, Doha, Lahore" },
  newsletter: { heading: "", subheading: "", ctaLabel: "Subscribe" },
  product_row: { heading: "", source: "newest", limit: "4" },
};

const list = (s: string, sep = ",") => s.split(sep).map((x) => x.trim()).filter(Boolean);
const IVORY = "#fff8e7";
const GOLD = "#e2b13c";

/** A small working render of the storefront from the draft sections, in the storefront's own black and gold. */
function Preview({ sections, mobile }: { sections: HomeSection[]; mobile: boolean }) {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const banners = useStore((s) => s.banners);
  const ateliers = useStore((s) => s.ateliers);
  const nav = useStore((s) => s.navLinks);
  const announcement = banners.find((b) => b.placement === "announcement" && b.active);
  const heroes = banners.filter((b) => b.placement === "hero" && b.active).sort((a, b) => a.order - b.order);

  return (
    <div className={cx("mx-auto overflow-hidden rounded-[4px] border border-line bg-[#12110e] shadow-float transition-[max-width] duration-300", mobile ? "max-w-[300px]" : "max-w-full")} style={{ fontSize: 10, color: IVORY }}>
      {announcement && <div className="px-3 py-1 text-center text-[8.5px] tracking-[0.08em]" style={{ background: GOLD, color: "#12110e" }}>{announcement.title}</div>}
      <div className="flex items-center justify-between border-b border-white/10 bg-black px-3 py-2">
        <span className="display text-[12px] font-semibold tracking-[0.22em]" style={{ color: GOLD }}>RINAZ</span>
        {!mobile && <span className="flex gap-2.5 text-[7.5px] tracking-[0.12em] text-white/70">{nav.slice(0, 5).map((n) => <span key={n.id}>{n.label.toUpperCase()}</span>)}</span>}
        <span className="text-[8px] text-white/60">USD $</span>
      </div>
      {sections.filter((s) => s.enabled).map((s) => {
        const c = s.config;
        switch (s.type) {
          case "hero_slider": {
            const h = heroes[0];
            return h ? (
              <div key={s.id} className="relative">
                <img src={h.image} alt="" className={cx("w-full object-cover", mobile ? "aspect-[3/4]" : "aspect-[16/8]")} />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/10 to-transparent p-4">
                  <div className="display text-[17px] leading-tight">{h.title}</div>
                  <p className="mt-1 max-w-[46ch] text-[8.5px] text-white/80">{h.subtitle}</p>
                  <div className="mt-2 flex gap-2">{h.ctaLabel && <span className="rounded-full bg-[#fff8e7] px-2.5 py-1 text-[7.5px] tracking-[0.1em] text-black">{h.ctaLabel.toUpperCase()}</span>}{h.secondaryLabel && <span className="border-b border-white/60 py-1 text-[7.5px] tracking-[0.1em]">{h.secondaryLabel.toUpperCase()}</span>}</div>
                  <div className="num mt-2 text-[7.5px] text-white/60">01 / {String(heroes.length).padStart(2, "0")}</div>
                </div>
              </div>
            ) : <div key={s.id} className="p-6 text-center text-[9px] text-white/50">No active hero banners</div>;
          }
          case "collection_tiles": {
            const names = list(c.tiles);
            const tiles = names.map((n) => categories.find((x) => x.name === n) ?? collections.find((x) => x.name === n)).filter(Boolean);
            return (
              <div key={s.id} className="px-3 py-4">
                <div className="display text-center text-[12px]">{c.heading}</div>
                <div className="text-center text-[8.5px] text-white/60">{c.subheading}</div>
                <div className={cx("mt-3 grid gap-1.5", mobile ? "grid-cols-2" : "grid-cols-4")}>
                  {tiles.map((t) => {
                    const img = "image" in t! ? (t as { image: string }).image : products.find((p) => p.collections.includes(t!.id))?.image;
                    return (
                      <div key={t!.id} className="relative overflow-hidden">
                        <img src={img} alt="" className="aspect-[3/4] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[7.5px] tracking-[0.08em]">{t!.name.toUpperCase()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          case "capsule":
            return (
              <div key={s.id} className={cx("grid items-center gap-3 px-3 py-4", !mobile && "grid-cols-2")}>
                {c.image && <img src={c.image} alt="" className="aspect-[4/5] w-full object-cover" />}
                <div>
                  <div className="display text-[14px]">{c.heading}</div>
                  <p className="mt-1 text-[8.5px] text-white/70">{c.body}</p>
                  {c.ctaLabel && <span className="mt-2 inline-block border px-2 py-1 text-[7.5px] tracking-[0.1em]" style={{ borderColor: GOLD, color: GOLD }}>{c.ctaLabel.toUpperCase()}</span>}
                </div>
              </div>
            );
          case "service_promises":
            return (
              <div key={s.id} className={cx("grid gap-px border-y border-white/10 bg-white/10", mobile ? "grid-cols-2" : "grid-cols-4")}>
                {list(c.items, "|").map((it) => <div key={it} className="bg-[#12110e] px-2 py-2.5 text-center text-[7.5px] tracking-[0.06em]" style={{ color: GOLD }}>{it.toUpperCase()}</div>)}
              </div>
            );
          case "curated_look": {
            const ps = list(c.products).map((id) => products.find((p) => p.id === id)).filter(Boolean);
            return (
              <div key={s.id} className="px-3 py-4">
                <div className="display text-[12px]">{c.heading}</div>
                <p className="mt-1 text-[8.5px] text-white/70">{c.body}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {ps.map((p, i) => <div key={p!.id} className="flex justify-between border-b border-white/10 py-1 text-[8.5px]"><span><span className="num text-white/50">{String(i + 1).padStart(2, "0")}</span> {p!.name}</span><span className="num">{money(p!.price)}</span></div>)}
                </div>
                <div className="num mt-1.5 text-right text-[8.5px]" style={{ color: GOLD }}>Complete look: {money(ps.reduce((sum, p) => sum + p!.price, 0))}</div>
              </div>
            );
          }
          case "brand_story":
            return <div key={s.id} className="px-6 py-5 text-center"><div className="display text-[13px]" style={{ color: GOLD }}>{c.heading}</div><p className="mx-auto mt-1.5 max-w-[50ch] text-[8.5px] text-white/70">{c.body}</p></div>;
          case "salon_cta":
            return <div key={s.id} className="mx-3 my-3 border border-white/15 px-4 py-4 text-center"><div className="display text-[12px]">{c.heading}</div><div className="text-[8.5px] text-white/60">{c.subheading}</div><span className="mt-2 inline-block px-2.5 py-1 text-[7.5px] tracking-[0.1em] text-black" style={{ background: GOLD }}>{c.ctaLabel.toUpperCase()}</span></div>;
          case "locations":
            return (
              <div key={s.id} className={cx("grid gap-px bg-white/10 px-0", mobile ? "grid-cols-2" : "grid-cols-4")}>
                {list(c.ateliers).map((n) => { const a = ateliers.find((x) => x.name === n); return <div key={n} className="bg-[#12110e] p-2"><div className="display text-[9.5px]" style={{ color: GOLD }}>{n.toUpperCase()}</div><div className="text-[7.5px] text-white/60">{a?.label}</div></div>; })}
              </div>
            );
          case "newsletter":
            return <div key={s.id} className="px-4 py-5 text-center"><div className="display text-[12px]">{c.heading}</div><div className="mx-auto mt-1 max-w-[46ch] text-[8px] text-white/60">{c.subheading}</div><div className="mx-auto mt-2 flex max-w-52 gap-1"><span className="flex-1 border-b border-white/30 py-1 text-left text-[8px] text-white/40">Email address</span><span className="px-2 py-1 text-[7.5px] text-black" style={{ background: GOLD }}>{c.ctaLabel.toUpperCase()}</span></div></div>;
          case "product_row": {
            const ps = [...products].filter((p) => p.status === "active").sort((a, b) => (c.source === "bestsellers" ? b.sold30d - a.sold30d : b.updatedAt - a.updatedAt)).slice(0, mobile ? 2 : 4);
            return (
              <div key={s.id} className="px-3 py-4">
                <div className="display text-[12px]">{c.heading || "Products"}</div>
                <div className={cx("mt-2 grid gap-1.5", mobile ? "grid-cols-2" : "grid-cols-4")}>{ps.map((p) => <div key={p.id}><img src={p.image} alt="" className="aspect-[3/4] w-full object-cover" /><div className="mt-1 truncate text-[8px]">{p.name}</div><div className="num text-[8px] text-white/60">{money(p.price)}</div></div>)}</div>
              </div>
            );
          }
        }
      })}
      <div className="border-t border-white/10 px-3 py-2 text-[7.5px] text-white/40">© RINAZ STUDIO</div>
    </div>
  );
}

export function Homepage() {
  const published = useStore((s) => s.homeSections);
  const setSections = useStore((s) => s.setHomeSections);
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const products = useStore((s) => s.products);
  const ateliers = useStore((s) => s.ateliers);
  const toast = useStore((s) => s.toast);
  const [draft, setDraft] = useState<HomeSection[]>(published);
  const [selId, setSelId] = useState(draft[2]?.id ?? draft[0]?.id);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [picker, setPicker] = useState(false);
  const [addType, setAddType] = useState<SectionType>("product_row");
  const [del, setDel] = useState<HomeSection | null>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(published), [draft, published]);
  const sel = draft.find((s) => s.id === selId);

  const patch = (cfg: Record<string, string>) => setDraft((d) => d.map((s) => (s.id === selId ? { ...s, config: { ...s.config, ...cfg } } : s)));
  const move = (i: number, dir: -1 | 1) => setDraft((d) => { const n = [...d]; const j = i + dir; if (j < 0 || j >= n.length) return d; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const add = () => {
    const s: HomeSection = { id: `sec_${Date.now()}`, type: addType, label: typeLabels[addType], enabled: true, config: { ...defaults[addType] } };
    setDraft((d) => [...d, s]);
    setSelId(s.id);
  };

  const text = (key: string, label: string, opts?: { area?: boolean; hint?: string; max?: number }) => (
    <Field label={label} htmlFor={`f-${key}`} hint={opts?.hint} aside={opts?.max ? <span className={cx("num", (sel?.config[key]?.length ?? 0) > opts.max && "text-warn")}>{sel?.config[key]?.length ?? 0}/{opts.max}</span> : undefined}>
      {opts?.area ? <Textarea id={`f-${key}`} value={sel?.config[key] ?? ""} onChange={(e) => patch({ [key]: e.target.value })} className="min-h-20" /> : <Input id={`f-${key}`} value={sel?.config[key] ?? ""} onChange={(e) => patch({ [key]: e.target.value })} />}
    </Field>
  );
  const checklist = (key: string, label: string, items: { id: string; label: string; value: string }[], hint?: string) => {
    const chosen = list(sel?.config[key] ?? "");
    return (
      <Field label={label} hint={hint}>
        <div className="max-h-64 overflow-y-auto rounded-[4px] border border-line">
          {items.map((it) => (
            <label key={it.id} className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-[13px] last:border-0 hover:bg-surface-2">
              <input type="checkbox" checked={chosen.includes(it.value)} onChange={(e) => patch({ [key]: (e.target.checked ? [...chosen, it.value] : chosen.filter((x) => x !== it.value)).join(", ") })} />
              {it.label}
            </label>
          ))}
        </div>
      </Field>
    );
  };
  const imageField = (
    <Field label="Image" hint="Portrait photography reads best here">
      {sel?.config.image ? (
        <div className="flex items-center gap-3">
          <img src={sel.config.image} alt="" className="h-24 w-20 rounded-[3px] object-cover" />
          <div className="flex flex-col gap-1.5"><Button size="sm" onClick={() => setPicker(true)}>Replace</Button><Button size="sm" variant="ghost" onClick={() => patch({ image: "" })}>Remove</Button></div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicker(true)} className="flex h-16 items-center justify-center gap-2 rounded-[4px] border border-dashed border-line-strong text-[13px] text-muted hover:bg-surface-2"><ImageIcon size={17} /> Choose image</button>
      )}
    </Field>
  );

  const editor = () => {
    if (!sel) return <p className="text-[13px] text-muted">Select a section to edit it.</p>;
    switch (sel.type) {
      case "hero_slider":
        return <><p className="text-[13px] text-muted">Slides come from the active hero banners, in their set order.</p><Link to="/cms/banners"><Button size="sm">Edit hero banners</Button></Link><Field label="Seconds per slide" htmlFor="f-auto"><Select id="f-auto" value={sel.config.autoplay} onChange={(e) => patch({ autoplay: e.target.value })}>{["4", "6", "8", "0"].map((n) => <option key={n} value={n}>{n === "0" ? "Do not auto-play" : `${n} seconds`}</option>)}</Select></Field></>;
      case "collection_tiles":
        return <>{text("heading", "Heading")}{text("subheading", "Subheading")}{checklist("tiles", "Tiles", [...categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, label: `${c.name} (category)`, value: c.name })), ...collections.map((c) => ({ id: c.id, label: `${c.name} (collection)`, value: c.name }))], "Shown in the order picked")}</>;
      case "capsule":
        return <>{text("heading", "Heading", { max: 40 })}{text("body", "Text", { area: true, max: 180 })}<div className="grid gap-4 sm:grid-cols-2">{text("ctaLabel", "Button label")}{text("ctaLink", "Button link")}</div>{imageField}</>;
      case "service_promises": {
        const items = list(sel.config.items, "|");
        while (items.length < 4) items.push("");
        return <>{items.slice(0, 4).map((it, i) => <Field key={i} label={`Promise ${i + 1}`} htmlFor={`sp-${i}`}><Input id={`sp-${i}`} value={it} onChange={(e) => { const n = [...items]; n[i] = e.target.value; patch({ items: n.join(" | ") }); }} /></Field>)}</>;
      }
      case "curated_look":
        return <>{text("heading", "Heading")}{text("body", "Text", { area: true })}{checklist("products", "Pieces in the look", products.map((p) => ({ id: p.id, label: `${p.name}, ${money(p.price)}`, value: p.id })), "The complete-look total is worked out for you")}{imageField}</>;
      case "brand_story":
        return <>{text("heading", "Heading")}{text("body", "Text", { area: true, max: 320 })}</>;
      case "salon_cta":
        return <>{text("heading", "Heading")}{text("subheading", "Subheading")}<div className="grid gap-4 sm:grid-cols-2">{text("ctaLabel", "Button label")}{text("ctaLink", "Button link")}</div></>;
      case "locations":
        return checklist("ateliers", "Ateliers shown", ateliers.map((a) => ({ id: a.name, label: `${a.name}, ${a.label}`, value: a.name })), "Addresses and hours are edited in Settings, Store");
      case "newsletter":
        return <>{text("heading", "Heading")}{text("subheading", "Text", { area: true })}{text("ctaLabel", "Button label")}</>;
      case "product_row":
        return <>{text("heading", "Heading")}<Field label="Pieces shown" htmlFor="f-src"><Select id="f-src" value={sel.config.source} onChange={(e) => patch({ source: e.target.value })}><option value="newest">Newest first</option><option value="bestsellers">Best sellers, 30 days</option></Select></Field></>;
    }
  };

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Arrange the storefront homepage and edit each section. Nothing changes on the live site until you publish."
        actions={<><Button disabled={!dirty} onClick={() => setDraft(published)}>Discard</Button><Button variant="primary" disabled={!dirty} onClick={() => { setSections(draft); toast("Homepage published"); }}>Publish</Button></>}
      />

      <div className="grid gap-4 xl:grid-cols-[264px_minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel title="Sections" bodyClass="p-1.5">
          <ul className="flex flex-col gap-px">
            {draft.map((s, i) => (
              <li key={s.id}>
                <div className={cx("group flex items-center gap-1 rounded-[4px] py-1 pl-2.5 pr-1", selId === s.id ? "bg-sunken" : "hover:bg-surface-2")}>
                  {selId === s.id && <span className="-ml-1.5 mr-0.5 h-5 w-[2px] bg-gold" />}
                  <button type="button" onClick={() => setSelId(s.id)} className="min-w-0 flex-1 py-1 text-left">
                    <div className={cx("truncate text-[13px]", s.enabled ? "text-ink" : "text-faint line-through")}>{s.label}</div>
                    <div className="text-[11.5px] text-muted">{typeLabels[s.type]}</div>
                  </button>
                  <div className={cx("flex items-center", selId === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-xl:opacity-100")}>
                    <IconButton icon={ArrowUp} label="Move up" size={13} className="size-7" onClick={() => move(i, -1)} />
                    <IconButton icon={ArrowDown} label="Move down" size={13} className="size-7" onClick={() => move(i, 1)} />
                  </div>
                  <IconButton icon={s.enabled ? Eye : EyeSlash} label={s.enabled ? "Hide section" : "Show section"} size={14} className="size-7" onClick={() => setDraft((d) => d.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 flex gap-1.5 border-t border-line p-1.5 pt-3">
            <Select aria-label="Section type to add" value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} className="h-8 text-[12.5px]">
              {(Object.keys(typeLabels) as SectionType[]).map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
            </Select>
            <Button icon={Plus} onClick={add}>Add</Button>
          </div>
        </Panel>

        <Panel
          title={sel ? <input aria-label="Section name" value={sel.label} onChange={(e) => setDraft((d) => d.map((x) => (x.id === sel.id ? { ...x, label: e.target.value } : x)))} className="w-full rounded-[3px] bg-transparent text-[14px] font-semibold focus:bg-sunken focus:px-1 focus:outline-none" /> : "Edit section"}
          actions={sel && <IconButton icon={Trash} label="Remove section" size={14} className="hover:text-bad" onClick={() => setDel(sel)} />}
        >
          <div className="flex flex-col gap-4">{editor()}</div>
        </Panel>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] text-muted">Preview{dirty && <span className="text-warn">, unpublished changes</span>}</span>
            <Segmented label="Preview size" value={device} onChange={setDevice} items={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Phone" }]} />
          </div>
          <div className="max-h-[78vh] overflow-y-auto rounded-[6px] border border-line bg-sunken p-4">
            <Preview sections={draft} mobile={device === "mobile"} />
          </div>
        </div>
      </div>

      <MediaPicker open={picker} multiple={false} onClose={() => setPicker(false)} onPick={([url]) => patch({ image: url })} />
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) { setDraft((d) => d.filter((x) => x.id !== del.id)); setSelId(draft[0]?.id); } }} title={`Remove “${del?.label}”?`} body="It is removed from the draft. The live site is unchanged until you publish." confirmLabel="Remove" danger />
    </>
  );
}
