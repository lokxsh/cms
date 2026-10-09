import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { useStore } from "../../lib/store";
import { cx } from "../../lib/format";
import { Button, Field, Input, PageHeader, Panel, Select, Textarea } from "../../components/ui";
import { MediaPicker } from "../ProductEditor";

export function Seo() {
  const seo = useStore((s) => s.settings.seo);
  const update = useStore((s) => s.updateSettings);
  const products = useStore((s) => s.products);
  const media = useStore((s) => s.media);
  const pages = useStore((s) => s.pages);
  const categories = useStore((s) => s.categories);
  const toast = useStore((s) => s.toast);
  const [form, setForm] = useState(seo);
  const [picker, setPicker] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(seo);

  const live = products.filter((p) => p.status === "active");
  const checks = [
    { label: "Products with a meta description", ok: live.filter((p) => p.seoDescription.length >= 50).length, total: live.length, to: "/catalog/products" },
    { label: "Product titles under 60 characters", ok: live.filter((p) => p.seoTitle.length <= 60).length, total: live.length, to: "/catalog/products" },
    { label: "Images with alt text", ok: media.filter((m) => m.alt.trim()).length, total: media.length, to: "/catalog/media" },
    { label: "Published pages with a meta description", ok: pages.filter((p) => p.status === "published" && p.seoDescription).length, total: pages.filter((p) => p.status === "published").length, to: "/cms/pages" },
    { label: "Visible categories with a description", ok: categories.filter((c) => c.visible && c.description).length, total: categories.filter((c) => c.visible).length, to: "/catalog/categories" },
  ];

  return (
    <>
      <PageHeader title="SEO" description="Defaults for search engines and social sharing." actions={<Button variant="primary" disabled={!dirty} onClick={() => { update({ seo: form }); toast("SEO settings saved"); }}>Save</Button>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Panel title="Homepage listing">
            <div className="mb-4 rounded-[4px] border border-line bg-surface-2 p-3">
              <div className="text-[12px] text-ok">rinaz-boutique.vercel.app</div>
              <div className="truncate text-[15px] text-info">{form.title || "Page title"}</div>
              <div className="line-clamp-2 text-[12.5px] text-muted">{form.description}</div>
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Title tag" htmlFor="s-t" aside={<span className={cx("num", form.title.length > 60 && "text-warn")}>{form.title.length}/60</span>}>
                <Input id="s-t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Meta description" htmlFor="s-d" aside={<span className={cx("num", form.description.length > 160 && "text-warn")}>{form.description.length}/160</span>}>
                <Textarea id="s-d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Robots" htmlFor="s-r" hint="Use noindex only for staging or a store that isn't launched yet.">
                <Select id="s-r" value={form.robots} onChange={(e) => setForm({ ...form, robots: e.target.value })}>
                  <option value="index, follow">Allow search engines (index, follow)</option>
                  <option value="noindex, nofollow">Hide from search engines (noindex, nofollow)</option>
                </Select>
              </Field>
            </div>
          </Panel>
          <Panel title="Social sharing image" description="Shown when the store link is shared on WhatsApp, Facebook or X. 1200 × 630 px.">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full max-w-sm overflow-hidden rounded-[4px] border border-line">
                <img src={form.ogImage} alt="" className="aspect-[1200/630] w-full bg-sunken object-cover" />
                <div className="border-t border-line bg-surface-2 px-3 py-2">
                  <div className="text-[11px] text-muted">rinaz-boutique.vercel.app</div>
                  <div className="truncate text-[13px] font-medium">{form.title}</div>
                </div>
              </div>
              <Button onClick={() => setPicker(true)}>Change image</Button>
            </div>
          </Panel>
        </div>
        <Panel title="Health check" bodyClass="py-1">
          <ul>
            {checks.map((c) => {
              const good = c.ok === c.total;
              return (
                <li key={c.label} className="border-t border-line first:border-0">
                  <Link to={c.to} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
                    {good ? <CheckCircle size={17} weight="fill" className="mt-px shrink-0 text-ok" /> : <Warning size={17} weight="fill" className="mt-px shrink-0 text-warn" />}
                    <span className="flex-1 text-[13px]">{c.label}</span>
                    <span className="num text-[12.5px] text-muted">{c.ok}/{c.total}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-4 py-3 text-[12.5px] text-muted">
            Sitemap: <span className="num text-ink-2">/sitemap.xml</span>, regenerated on every publish.
          </div>
        </Panel>
      </div>
      <MediaPicker open={picker} multiple={false} onClose={() => setPicker(false)} onPick={([url]) => setForm({ ...form, ogImage: url })} />
    </>
  );
}
