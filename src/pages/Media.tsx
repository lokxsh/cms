import { useMemo, useRef, useState, type DragEvent } from "react";
import { Copy, Images, Trash, UploadSimple, CheckCircle } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { cx, date } from "../lib/format";
import type { MediaAsset } from "../lib/types";
import { Button, Confirm, Drawer, EmptyState, Field, Input, KeyValue, PageHeader, SearchInput, Segmented } from "../components/ui";

type Folder = "all" | MediaAsset["folder"];

export function Media() {
  const media = useStore((s) => s.media);
  const add = useStore((s) => s.addMedia);
  const del = useStore((s) => s.deleteMedia);
  const update = useStore((s) => s.updateMedia);
  const toast = useStore((s) => s.toast);
  const [folder, setFolder] = useState<Folder>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<MediaAsset | null>(null);
  const [drag, setDrag] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => media.filter((m) => (folder === "all" || m.folder === folder) && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase()))), [media, folder, q]);
  const totalMb = (media.reduce((s, m) => s + m.sizeKb, 0) / 1024).toFixed(1);

  const upload = (files: FileList | null) => {
    const imgs = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return toast("Only image files can be uploaded here", "bad");
    const big = imgs.filter((f) => f.size > 8 * 1024 * 1024);
    if (big.length) toast(`${big.length} file(s) over 8 MB were skipped`, "bad");
    const ok = imgs.filter((f) => f.size <= 8 * 1024 * 1024);
    setUploading(ok.length);
    // Simulated upload latency; swap for the storage API (S3, Cloudinary, etc.).
    setTimeout(() => {
      add(ok.map((f, i) => ({ id: `med_up_${Date.now()}_${i}`, url: URL.createObjectURL(f), name: f.name, sizeKb: Math.round(f.size / 1024), width: 0, height: 0, folder: folder === "all" ? "misc" : folder, usedIn: 0, uploadedAt: Date.now(), alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") })));
      setUploading(0);
      toast(`${ok.length} image${ok.length > 1 ? "s" : ""} uploaded`);
    }, 900);
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); };
  const usedCount = (ids: string[]) => media.filter((m) => ids.includes(m.id) && m.usedIn > 0).length;

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop} className="relative">
      <PageHeader
        title="Media library"
        description={`${media.length} files, ${totalMb} MB. Drop images anywhere on this page to upload.`}
        actions={<><Button variant="primary" icon={UploadSimple} onClick={() => fileRef.current?.click()}>Upload</Button><input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented value={folder} onChange={setFolder} items={[{ value: "all", label: "All" }, { value: "products", label: "Products" }, { value: "banners", label: "Banners" }, { value: "homepage", label: "Homepage" }, { value: "categories", label: "Categories" }, { value: "promotions", label: "Promotions" }, { value: "misc", label: "Other" }]} />
        <SearchInput value={q} onChange={setQ} placeholder="File name or alt text" className="w-full sm:ml-auto sm:w-64" />
      </div>

      {sel.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-[4px] bg-sunken px-3 py-2">
          <span className="mr-2 text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-2">{sel.size} selected</span>
          <Button size="sm" variant="ghost" icon={Trash} className="text-bad" onClick={() => setConfirm([...sel])}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}

      {rows.length === 0 && !uploading ? (
        <div className="rounded-[6px] border border-dashed border-line-strong bg-surface">
          <EmptyState icon={Images} title="No files here" body="Upload banners, product photos or graphics. JPG, PNG and WebP up to 8 MB." action={<Button icon={UploadSimple} onClick={() => fileRef.current?.click()}>Upload files</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: uploading }, (_, i) => (
            <div key={`up${i}`} className="overflow-hidden rounded-[6px] border border-line bg-surface">
              <div className="skeleton aspect-square rounded-none" />
              <div className="p-2"><div className="skeleton h-3 w-3/4" /></div>
            </div>
          ))}
          {rows.map((m) => {
            const on = sel.has(m.id);
            return (
              <div key={m.id} className={cx("group relative overflow-hidden rounded-[6px] border bg-surface transition-colors", on ? "border-ink ring-2 ring-ink/20" : "border-line hover:border-line-strong")}>
                <button onClick={() => setOpen(m)} className="block w-full text-left">
                  <div className="aspect-square bg-sunken">
                    <img src={m.url} alt={m.alt} loading="lazy" className="size-full object-cover" />
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="truncate text-[12.5px] text-ink">{m.name}</div>
                    <div className="num text-[11.5px] text-muted">{m.sizeKb > 1024 ? `${(m.sizeKb / 1024).toFixed(1)} MB` : `${m.sizeKb} KB`}{m.usedIn === 0 && <span className="font-sans"> · unused</span>}</div>
                  </div>
                </button>
                <button
                  aria-label={on ? `Deselect ${m.name}` : `Select ${m.name}`}
                  onClick={() => setSel((s) => { const n = new Set(s); on ? n.delete(m.id) : n.add(m.id); return n; })}
                  className={cx("absolute left-2 top-2 grid size-6 place-items-center rounded-full transition-opacity", on ? "bg-ink text-surface opacity-100" : "bg-surface/90 text-muted opacity-0 shadow-sm group-hover:opacity-100 focus:opacity-100")}
                >
                  <CheckCircle size={16} weight={on ? "fill" : "regular"} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {drag && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-gold-soft/60 p-8">
          <div className="grid h-full w-full place-items-center rounded-2xl border-2 border-dashed border-ink text-[15px] font-medium text-ink underline decoration-line-strong underline-offset-2">Drop images to upload</div>
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title="File details" footer={open && <><Button variant="ghost" icon={Trash} className="mr-auto text-bad" onClick={() => setConfirm([open.id])}>Delete</Button><Button onClick={() => setOpen(null)}>Close</Button><Button variant="primary" onClick={() => { update(open); toast("Alt text saved"); setOpen(null); }}>Save</Button></>}>
        {open && (
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-[6px] border border-line bg-sunken"><img src={open.url} alt={open.alt} className="max-h-80 w-full object-contain" /></div>
            <Field label="Alt text" htmlFor="m-alt" hint="Describes the image for screen readers and search engines.">
              <Input id="m-alt" value={open.alt} onChange={(e) => setOpen({ ...open, alt: e.target.value })} />
            </Field>
            <Field label="File URL" htmlFor="m-url">
              <div className="flex gap-2">
                <Input id="m-url" readOnly value={open.url} className="num text-[12px]" />
                <Button icon={Copy} onClick={() => { navigator.clipboard?.writeText(open.url); toast("URL copied", "info"); }}>Copy</Button>
              </div>
            </Field>
            <KeyValue items={[["Name", open.name], ["Folder", open.folder], ["Dimensions", open.width ? <span className="num">{open.width} × {open.height}</span> : "Processing"], ["Size", <span className="num">{open.sizeKb} KB</span>], ["Uploaded", date(open.uploadedAt)], ["Used in", open.usedIn ? `${open.usedIn} place${open.usedIn > 1 ? "s" : ""}` : "Not used"]]} />
          </div>
        )}
      </Drawer>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (confirm) { del(confirm); toast(`${confirm.length} file${confirm.length > 1 ? "s" : ""} deleted`); setSel(new Set()); setOpen(null); } }}
        title={`Delete ${confirm?.length ?? 0} file${(confirm?.length ?? 0) > 1 ? "s" : ""}?`}
        body={confirm && usedCount(confirm) > 0 ? `${usedCount(confirm)} of these are in use on products or the homepage. Those places will show an empty image.` : "This can't be undone."}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
