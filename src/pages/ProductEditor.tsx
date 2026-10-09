import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon, Plus, Star, Trash, UploadSimple, X, Package as PackageIcon } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { currencySymbol, cx, date, money } from "../lib/format";
import { isMto, productStock } from "../lib/seed";
import type { MediaAsset, Product, ProductLine, Variant, VariantOption } from "../lib/types";
import { Button, EmptyState, Field, Input, Modal, PageHeader, Panel, Select, StatusBadge, Textarea, Toggle } from "../components/ui";
import { stockLabel } from "./Products";

const DETAIL_FIELDS: Record<ProductLine, string[]> = {
  abaya: ["Fabric", "Embroidery", "Includes", "Care"],
  jewelry: ["Metal", "Hallmark", "Stones", "Certificate"],
  couture: ["Fabric", "Work", "Includes", "Care"],
};
const LINE_LABEL: Record<ProductLine, string> = { abaya: "Haute Abaya", jewelry: "18K Fine Jewelry", couture: "Pakistani Couture" };

const blank = (): Product => ({
  id: `prd_${Date.now()}`, name: "", sku: "", line: "abaya", categoryId: "", collections: [], price: 0, salePrice: null, cost: 0, lowStockAt: 3,
  status: "draft", image: "", gallery: [], options: [{ name: "Size", values: ["S", "M", "L", "XL"] }], variants: [], description: "", details: {},
  tags: [], madeToOrder: false, leadTimeDays: 0, sold30d: 0, revenue30d: 0, rating: 0, reviewCount: 0, weightGrams: 0, seoTitle: "", seoDescription: "", slug: "", updatedAt: Date.now(),
});
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const code = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "X";

/** Rebuild the variant matrix from the options, keeping SKUs, prices and stock for combinations that still exist. */
function rebuildVariants(p: Product): Variant[] {
  const combos = p.options.filter((o) => o.values.length).reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
  if (combos.length === 1 && combos[0].length === 0) return p.variants.length ? p.variants : [{ id: `${p.id}-0`, options: [], sku: p.sku, price: null, stock: 0 }];
  return combos.map((opts, i) => {
    const key = opts.join("|");
    const prev = p.variants.find((v) => v.options.join("|") === key);
    return prev ?? { id: `${p.id}-${Date.now()}-${i}`, options: opts, sku: `${p.sku || "RZ"}-${opts.map(code).join("-")}`, price: null, stock: 0 };
  });
}

export function MediaPicker({ open, onClose, onPick, multiple = true }: { open: boolean; onClose: () => void; onPick: (urls: string[]) => void; multiple?: boolean }) {
  const media = useStore((s) => s.media);
  const addMedia = useStore((s) => s.addMedia);
  const [sel, setSel] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const assets: MediaAsset[] = [...files].filter((f) => f.type.startsWith("image/")).map((f, i) => ({ id: `med_up_${Date.now()}_${i}`, url: URL.createObjectURL(f), name: f.name, sizeKb: Math.round(f.size / 1024), width: 0, height: 0, folder: "products", usedIn: 0, uploadedAt: Date.now(), alt: "" }));
    addMedia(assets);
    setSel((s) => (multiple ? [...assets.map((a) => a.url), ...s] : [assets[0].url]));
  };
  return (
    <Modal open={open} onClose={onClose} title="Choose images" width={780} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!sel.length} onClick={() => { onPick(sel); setSel([]); onClose(); }}>Add {sel.length || ""} image{sel.length === 1 ? "" : "s"}</Button></>}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">Pick from the media library or upload new photography.</p>
        <Button size="sm" icon={UploadSimple} onClick={() => fileRef.current?.click()}>Upload</Button>
        <input ref={fileRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => upload(e.target.files)} />
      </div>
      <div className="grid max-h-[54vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
        {media.map((m) => {
          const on = sel.includes(m.url);
          return (
            <button key={m.id} type="button" onClick={() => setSel((s) => (on ? s.filter((x) => x !== m.url) : multiple ? [...s, m.url] : [m.url]))} className={cx("relative aspect-[4/5] overflow-hidden rounded-[3px] border-2 bg-sunken", on ? "border-ink" : "border-transparent hover:border-line-strong")}>
              <img src={m.url} alt={m.alt} loading="lazy" className="size-full object-cover" />
              {on && <span className="num absolute right-1 top-1 grid size-5 place-items-center rounded-[2px] bg-ink text-[11px] font-semibold text-surface">{sel.indexOf(m.url) + 1}</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function ValueChips({ id, values, onChange, placeholder }: { id: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="flex min-h-8.5 flex-wrap items-center gap-1.5 rounded-[4px] border border-line-strong bg-surface px-1.5 py-1 focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--gold-soft)]">
      {values.map((o) => (
        <span key={o} className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-line bg-surface-2 pl-2 pr-1 text-[12.5px]">
          {o}
          <button type="button" aria-label={`Remove ${o}`} onClick={() => onChange(values.filter((x) => x !== o))} className="text-muted hover:text-ink"><X size={11} /></button>
        </span>
      ))}
      <input
        id={id}
        placeholder={values.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-[13px] placeholder:text-faint focus:outline-none"
        onKeyDown={(e) => {
          const val = e.currentTarget.value.trim();
          if ((e.key === "Enter" || e.key === ",") && val) {
            e.preventDefault();
            if (!values.includes(val)) onChange([...values, val]);
            e.currentTarget.value = "";
          }
          if (e.key === "Backspace" && !e.currentTarget.value && values.length) onChange(values.slice(0, -1));
        }}
      />
    </div>
  );
}

export function ProductEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const existing = useStore((s) => s.products.find((p) => p.id === id));
  const taxInclusive = useStore((s) => s.settings.taxInclusive);
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const upsert = useStore((s) => s.upsertProduct);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();

  const [initial] = useState<Product>(() => (isNew ? blank() : existing ? structuredClone(existing) : blank()));
  const [p, setP] = useState<Product>(() => (isNew ? { ...initial, variants: rebuildVariants(initial) } : initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setOptions = (options: VariantOption[]) => setP((x) => ({ ...x, options, variants: rebuildVariants({ ...x, options }) }));
  const setVariant = (vid: string, patch: Partial<Variant>) => setP((x) => ({ ...x, variants: x.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)) }));

  const margin = useMemo(() => {
    const sell = p.salePrice ?? p.price;
    return sell > 0 && p.cost > 0 ? ((sell - p.cost) / sell) * 100 : null;
  }, [p.price, p.salePrice, p.cost]);

  if (!isNew && !existing) {
    return <EmptyState icon={PackageIcon} title="Product not found" body="It may have been deleted." action={<Button onClick={() => navigate("/catalog/products")}>Back to products</Button>} />;
  }

  const images = [p.image, ...p.gallery].filter(Boolean);
  const setImages = (list: string[]) => setP((x) => ({ ...x, image: list[0] ?? "", gallery: list.slice(1) }));
  const sym = currencySymbol();

  const save = () => {
    const e: Record<string, string> = {};
    if (!p.name.trim()) e.name = "Give the product a name.";
    if (!p.sku.trim()) e.sku = "A base SKU is needed for invoices and stock.";
    if (!p.categoryId) e.categoryId = "Choose a category.";
    if (p.price <= 0) e.price = "Price must be above zero.";
    if (p.salePrice !== null && p.salePrice >= p.price) e.salePrice = "Sale price must be lower than the regular price.";
    if (p.status === "active" && images.length === 0) e.image = "Active products need at least one photo.";
    const skus = p.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) e.variants = "Two variants share a SKU. Each needs its own.";
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Fix the highlighted fields before saving", "bad");
      return;
    }
    upsert({ ...p, slug: p.slug || slugify(p.name), seoTitle: p.seoTitle || `${p.name} | RINAZ STUDIO` });
    toast(isNew ? "Product created" : "Product saved");
    if (isNew) navigate(`/catalog/products/${p.id}`, { replace: true });
  };

  const roots = categories.filter((c) => !c.parentId);

  return (
    <>
      <PageHeader
        back={{ to: "/catalog/products", label: "Products" }}
        title={isNew ? "New product" : p.name || "Untitled product"}
        meta={!isNew && <StatusBadge status={p.status} />}
        description={!isNew ? `${LINE_LABEL[p.line]} · last updated ${date(existing!.updatedAt, true)}` : undefined}
        actions={<Button variant="primary" onClick={save} disabled={!dirty && !isNew}>{isNew ? "Create product" : "Save"}</Button>}
      />

      <div className="grid gap-4 pb-20 lg:grid-cols-[1fr_330px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="p-name" error={errors.name}>
                <Input id="p-name" value={p.name} aria-invalid={!!errors.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="Description" htmlFor="p-desc" aside={<span className="num">{p.description.length}</span>}>
                <Textarea id="p-desc" value={p.description} onChange={(e) => set("description", e.target.value)} className="min-h-28" />
              </Field>
            </div>
          </Panel>

          <Panel title="Photography" description="The first photo is the cover on the storefront." actions={<Button size="sm" icon={Plus} onClick={() => setPicker(true)}>Add photos</Button>}>
            {images.length === 0 ? (
              <button type="button" onClick={() => setPicker(true)} className={cx("flex w-full flex-col items-center gap-2 rounded-[4px] border border-dashed py-10 text-[13px] text-muted hover:bg-surface-2", errors.image ? "border-bad" : "border-line-strong")}>
                <ImageIcon size={22} />
                Add product photography, portrait 4:5, at least 1400 px wide
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((url, i) => (
                  <div key={url + i} className={cx("group relative aspect-[4/5] overflow-hidden rounded-[3px] border bg-sunken", i === 0 ? "col-span-2 row-span-2 border-line-strong" : "border-line")}>
                    <img src={url} alt="" className="size-full object-cover" />
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
                      {i > 0 && <button type="button" aria-label="Make cover photo" onClick={() => setImages([url, ...images.filter((_, j) => j !== i)])} className="grid size-7 place-items-center rounded-[3px] bg-surface text-ink"><Star size={13} /></button>}
                      <button type="button" aria-label="Remove photo" onClick={() => setImages(images.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded-[3px] bg-surface text-bad"><X size={13} /></button>
                    </div>
                    {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-[2px] bg-surface px-1.5 py-0.5 text-[11px] font-medium">Cover</span>}
                  </div>
                ))}
              </div>
            )}
            {errors.image && <p className="mt-2 text-[12px] text-bad">{errors.image}</p>}
          </Panel>

          <Panel title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price" htmlFor="p-price" error={errors.price} hint={taxInclusive ? "Tax included, set in Settings, Tax" : "Tax added at checkout"}>
                <Input id="p-price" prefix={sym} inputMode="numeric" className="num" value={p.price || ""} aria-invalid={!!errors.price} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")))} />
              </Field>
              <Field label="Sale price" htmlFor="p-sale" error={errors.salePrice} hint={p.salePrice && p.price ? `${Math.round((1 - p.salePrice / p.price) * 100)}% off` : "Leave empty for no sale"}>
                <Input id="p-sale" prefix={sym} inputMode="numeric" className="num" value={p.salePrice ?? ""} aria-invalid={!!errors.salePrice} onChange={(e) => set("salePrice", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} />
              </Field>
              <Field label="Cost per piece" htmlFor="p-cost" hint={margin !== null ? <>Margin <span className={cx("num", margin < 35 ? "text-warn" : "text-ok")}>{margin.toFixed(1)}%</span></> : "Never shown to clients"}>
                <Input id="p-cost" prefix={sym} inputMode="numeric" className="num" value={p.cost || ""} onChange={(e) => set("cost", Number(e.target.value.replace(/\D/g, "")))} />
              </Field>
            </div>
          </Panel>

          <Panel title="Options and variants" description="Sizes, lengths, chain lengths or metals. Every combination gets its own SKU, price and stock.">
            <div className="flex flex-col gap-4">
              {p.options.map((o, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[170px_1fr_auto]">
                  <Field label="Option" htmlFor={`o-${i}`}>
                    <Input id={`o-${i}`} value={o.name} placeholder="e.g. Size" onChange={(e) => setOptions(p.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  </Field>
                  <Field label="Values" htmlFor={`ov-${i}`} hint="Enter to add. Add “Made to measure” for bespoke orders.">
                    <ValueChips id={`ov-${i}`} values={o.values} placeholder="S, M, L" onChange={(values) => setOptions(p.options.map((x, j) => (j === i ? { ...x, values } : x)))} />
                  </Field>
                  <button type="button" aria-label="Remove option" onClick={() => setOptions(p.options.filter((_, j) => j !== i))} className="mt-6 grid size-8.5 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-bad"><Trash size={15} /></button>
                </div>
              ))}
              {p.options.length < 3 && <div><Button size="sm" icon={Plus} onClick={() => setOptions([...p.options, { name: "", values: [] }])}>Add option</Button></div>}
            </div>
            {p.variants.length > 0 && (
              <div className="-mx-4 -mb-4 mt-5 overflow-x-auto border-t border-line">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="bg-surface-2 text-left text-[12px] text-muted">
                      <th className="h-9 pl-4 pr-3 font-medium">Variant</th><th className="px-3 font-medium">SKU</th><th className="w-32 px-3 font-medium">Price</th><th className="w-24 px-3 pr-4 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v) => {
                      const mto = isMto(v.options);
                      return (
                        <tr key={v.id} className="border-t border-line">
                          <td className="py-2 pl-4 pr-3 text-[13px]">{v.options.join(" / ") || "Default"}{mto && <div className="text-[11.5px] text-muted">Made to order, {p.leadTimeDays || "?"} days</div>}</td>
                          <td className="px-3 py-2"><Input aria-label={`SKU for ${v.options.join(" / ")}`} className="num h-8 text-[12.5px] uppercase" value={v.sku} onChange={(e) => setVariant(v.id, { sku: e.target.value.toUpperCase() })} /></td>
                          <td className="px-3 py-2"><Input aria-label={`Price for ${v.options.join(" / ")}`} prefix={sym} inputMode="numeric" className="num h-8" placeholder={String(p.price || "")} value={v.price ?? ""} onChange={(e) => setVariant(v.id, { price: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></td>
                          <td className="px-3 py-2 pr-4">{mto ? <span className="text-[12px] text-muted">n/a</span> : <Input aria-label={`Stock for ${v.options.join(" / ")}`} inputMode="numeric" className={cx("num h-8", v.stock === 0 && "text-bad")} value={v.stock} onChange={(e) => setVariant(v.id, { stock: Number(e.target.value.replace(/\D/g, "")) })} />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-line bg-surface-2 px-4 py-2 text-[12.5px] text-muted">
                  <span><span className="num text-ink">{p.variants.length}</span> variants, empty price uses {money(p.price || 0)}</span>
                  <span><span className="num text-ink">{productStock(p)}</span> pieces in stock</span>
                </div>
                {errors.variants && <p className="px-4 pb-3 text-[12px] text-bad">{errors.variants}</p>}
              </div>
            )}
          </Panel>

          <Panel title={`${LINE_LABEL[p.line]} details`} description="Shown in the Details tab on the product page.">
            <div className="grid gap-4 sm:grid-cols-2">
              {DETAIL_FIELDS[p.line].map((k) => (
                <Field key={k} label={k} htmlFor={`d-${k}`}>
                  <Input id={`d-${k}`} value={p.details[k] ?? ""} onChange={(e) => set("details", { ...p.details, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
            <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span>Made to order<span className="block text-[12px] text-muted">Offer made-to-measure and show a lead time</span></span>
                <Toggle label="Made to order" checked={p.madeToOrder} onChange={(v) => set("madeToOrder", v)} />
              </label>
              {p.madeToOrder && <Field label="Lead time" htmlFor="p-lead"><Input id="p-lead" inputMode="numeric" suffix="days" className="num" value={p.leadTimeDays || ""} onChange={(e) => set("leadTimeDays", Number(e.target.value.replace(/\D/g, "")))} /></Field>}
            </div>
          </Panel>

          <Panel title="Inventory and shipping">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Base SKU" htmlFor="p-sku" error={errors.sku}>
                <Input id="p-sku" className="num uppercase" value={p.sku} aria-invalid={!!errors.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
              </Field>
              <Field label="Low stock alert at" htmlFor="p-low" hint="Per size or option">
                <Input id="p-low" inputMode="numeric" className="num" suffix="pieces" value={p.lowStockAt} onChange={(e) => set("lowStockAt", Number(e.target.value.replace(/\D/g, "")))} />
              </Field>
              <Field label="Shipping weight" htmlFor="p-wt">
                <Input id="p-wt" inputMode="numeric" className="num" suffix="g" value={p.weightGrams || ""} onChange={(e) => set("weightGrams", Number(e.target.value.replace(/\D/g, "")))} />
              </Field>
            </div>
          </Panel>

          <Panel title="Search engine listing">
            <div className="mb-4 rounded-[4px] border border-line bg-surface-2 p-3">
              <div className="truncate text-[12px] text-ok">rinaz-boutique.vercel.app › product › {p.slug || "product-url"}</div>
              <div className="truncate text-[15px] text-info">{p.seoTitle || `${p.name || "Product title"} | RINAZ STUDIO`}</div>
              <div className="line-clamp-2 text-[12.5px] text-muted">{p.seoDescription || p.description || "Add a description to show here."}</div>
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Page title" htmlFor="p-seot" aside={<span className={cx("num", p.seoTitle.length > 60 && "text-warn")}>{p.seoTitle.length}/60</span>}>
                <Input id="p-seot" value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
              </Field>
              <Field label="Meta description" htmlFor="p-seod" aside={<span className={cx("num", p.seoDescription.length > 160 && "text-warn")}>{p.seoDescription.length}/160</span>}>
                <Textarea id="p-seod" value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className="min-h-16" />
              </Field>
              <Field label="URL handle" htmlFor="p-slug">
                <Input id="p-slug" prefix="/product/" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Status">
            <Select aria-label="Status" value={p.status} onChange={(e) => set("status", e.target.value as Product["status"])}>
              <option value="active">Active, visible on the store</option>
              <option value="draft">Draft, hidden</option>
              <option value="archived">Archived</option>
            </Select>
          </Panel>

          <Panel title="Organisation">
            <div className="flex flex-col gap-4">
              <Field label="Line" htmlFor="p-line">
                <Select id="p-line" value={p.line} onChange={(e) => set("line", e.target.value as ProductLine)}>
                  {(Object.keys(LINE_LABEL) as ProductLine[]).map((l) => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
                </Select>
              </Field>
              <Field label="Category" htmlFor="p-cat" error={errors.categoryId}>
                <Select id="p-cat" value={p.categoryId} aria-invalid={!!errors.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">Choose a category</option>
                  {roots.map((root) => (
                    <optgroup key={root.id} label={root.name}>
                      {categories.filter((c) => c.parentId === root.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-[12.5px] font-medium text-ink-2">Collections</legend>
                <div className="flex flex-col gap-1.5">
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={p.collections.includes(c.id)} onChange={(e) => set("collections", e.target.checked ? [...p.collections, c.id] : p.collections.filter((x) => x !== c.id))} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Tags" htmlFor="p-tags" hint="Used in search and filters">
                <div className="flex min-h-8.5 flex-wrap items-center gap-1.5 rounded-[4px] border border-line-strong bg-surface px-1.5 py-1 focus-within:border-ink">
                  {p.tags.map((t) => (
                    <span key={t} className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-line bg-surface-2 pl-2 pr-1 text-[12.5px]">
                      {t}
                      <button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", p.tags.filter((x) => x !== t))} className="text-muted hover:text-ink"><X size={11} /></button>
                    </span>
                  ))}
                  <input id="p-tags" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagDraft.trim()) { e.preventDefault(); if (!p.tags.includes(tagDraft.trim().toLowerCase())) set("tags", [...p.tags, tagDraft.trim().toLowerCase()]); setTagDraft(""); } }} className="min-w-16 flex-1 bg-transparent px-1 text-[13px] focus:outline-none" />
                </div>
              </Field>
            </div>
          </Panel>

          {!isNew && existing && (
            <Panel title="Last 30 days">
              <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                <div><dt className="text-[12px] text-muted">Pieces sold</dt><dd className="num text-[17px] font-medium">{existing.sold30d}</dd></div>
                <div><dt className="text-[12px] text-muted">Revenue</dt><dd className="num text-[17px] font-medium">{money(existing.revenue30d)}</dd></div>
                <div><dt className="text-[12px] text-muted">Rating</dt><dd><span className="num text-[17px] font-medium">{existing.rating}</span> <span className="text-[12px] text-muted">({existing.reviewCount} reviews)</span></dd></div>
                <div><dt className="text-[12px] text-muted">Stock</dt><dd className="text-[13px]">{stockLabel(existing)}</dd></div>
              </dl>
            </Panel>
          )}
        </div>
      </div>

      {dirty && (
        <div className="anim-rise fixed inset-x-0 bottom-15 z-30 border-t border-line bg-surface lg:bottom-0 lg:left-[244px]">
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <span className="text-[13px] text-muted">Unsaved changes</span>
            <div className="flex gap-2">
              <Button onClick={() => { setP(initial); setErrors({}); }}>Discard</Button>
              <Button variant="primary" onClick={save}>{isNew ? "Create product" : "Save"}</Button>
            </div>
          </div>
        </div>
      )}

      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(urls) => setImages([...images, ...urls.filter((u) => !images.includes(u))])} />
    </>
  );
}
