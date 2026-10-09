import { useState } from "react";
import { FileText, Plus } from "@phosphor-icons/react";
import { useStore } from "../../lib/store";
import { ago, cx } from "../../lib/format";
import type { CmsPage } from "../../lib/types";
import { Button, Drawer, EmptyState, Field, Input, PageHeader, Segmented, StatusBadge, Textarea, td, th, tr } from "../../components/ui";

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Pages() {
  const pages = useStore((s) => s.pages);
  const upsert = useStore((s) => s.upsertPage);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<CmsPage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isNew = edit && !pages.some((p) => p.id === edit.id);

  const save = (status: CmsPage["status"]) => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.title.trim()) e.title = "Title is required.";
    if (!edit.slug) e.slug = "URL handle is required.";
    else if (pages.some((p) => p.slug === edit.slug && p.id !== edit.id)) e.slug = "Another page uses this handle.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert({ ...edit, status });
    toast(status === "published" ? `“${edit.title}” published` : `“${edit.title}” saved as draft`);
    setEdit(null);
  };

  return (
    <>
      <PageHeader title="Pages" description="About the Studio, bridal services, policies and other content pages." actions={<Button variant="primary" icon={Plus} onClick={() => { setErrors({}); setEdit({ id: `pg${Date.now()}`, title: "", slug: "", status: "draft", updatedAt: Date.now(), body: "", seoTitle: "", seoDescription: "" }); }}>New page</Button>} />
      <div className="overflow-hidden rounded-[6px] border border-line bg-surface">
        {pages.length === 0 ? <EmptyState icon={FileText} title="No pages yet" body="Create an About or Shipping policy page." /> : (
          <table className="w-full">
            <thead><tr className="bg-surface-2"><th className={th}>Title</th><th className={th}>URL</th><th className={th}>Status</th><th className={th}>Updated</th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className={tr + " cursor-pointer"} onClick={() => { setErrors({}); setEdit(p); }}>
                  <td className={td + " font-medium"}>{p.title}</td>
                  <td className={td + " num text-[12.5px] text-muted"}>/pages/{p.slug}</td>
                  <td className={td}><StatusBadge status={p.status} /></td>
                  <td className={td + " text-muted"}>{ago(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? "New page" : "Edit page"} width={680} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => save("draft")}>Save draft</Button><Button variant="primary" onClick={() => save("published")}>Publish</Button></>}>
        {edit && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={edit.status} />
              <Segmented value={edit.status} onChange={(v) => setEdit({ ...edit, status: v })} items={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} />
            </div>
            <Field label="Title" htmlFor="pg-title" error={errors.title}>
              <Input id="pg-title" value={edit.title} aria-invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value, slug: isNew ? slugify(e.target.value) : edit.slug })} />
            </Field>
            <Field label="Content" htmlFor="pg-body" hint="Supports Markdown: **bold**, ## headings, - lists, [links](url)">
              <Textarea id="pg-body" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="min-h-64 font-mono text-[13px]" />
            </Field>
            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-[13px] font-semibold">Search engine listing</h3>
              <div className="flex flex-col gap-4">
                <Field label="URL handle" htmlFor="pg-slug" error={errors.slug}>
                  <Input id="pg-slug" prefix="/pages/" value={edit.slug} aria-invalid={!!errors.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} />
                </Field>
                <Field label="Page title" htmlFor="pg-seot" aside={<span className={cx("num", edit.seoTitle.length > 60 && "text-warn")}>{edit.seoTitle.length}/60</span>}>
                  <Input id="pg-seot" value={edit.seoTitle} placeholder={edit.title} onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })} />
                </Field>
                <Field label="Meta description" htmlFor="pg-seod" aside={<span className={cx("num", edit.seoDescription.length > 160 && "text-warn")}>{edit.seoDescription.length}/160</span>}>
                  <Textarea id="pg-seod" value={edit.seoDescription} onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })} className="min-h-16" />
                </Field>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
