import { useState } from "react";
import { ArrowDown, ArrowUp, PencilSimple, Plus, Trash, Image as ImageIcon } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import type { Category, Collection } from "../lib/types";
import { Button, Confirm, Drawer, Field, IconButton, Input, PageHeader, Select, Tabs, Textarea, Thumb, Toggle } from "../components/ui";
import { MediaPicker } from "./ProductEditor";

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Categories() {
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertCategory);
  const upsertCol = useStore((s) => s.upsertCollection);
  const remove = useStore((s) => s.deleteCategory);
  const move = useStore((s) => s.moveCategory);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<"categories" | "collections">("categories");
  const [edit, setEdit] = useState<Category | null>(null);
  const [editCol, setEditCol] = useState<Collection | null>(null);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<Category | null>(null);
  const [picker, setPicker] = useState(false);

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.order - b.order);
  const kids = (id: string) => categories.filter((c) => c.parentId === id).sort((a, b) => a.order - b.order);
  const countFor = (c: Category) => {
    const ids = new Set([c.id, ...kids(c.id).map((k) => k.id)]);
    return products.filter((p) => ids.has(p.categoryId)).length;
  };

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) return setErr("Name is required.");
    upsert({ ...edit, slug: edit.slug || slugify(edit.name) });
    toast(categories.some((c) => c.id === edit.id) ? "Category saved" : "Category created");
    setEdit(null);
  };
  const saveCol = () => {
    if (!editCol) return;
    if (!editCol.name.trim()) return setErr("Name is required.");
    upsertCol({ ...editCol, slug: editCol.slug || slugify(editCol.name) });
    toast(collections.some((c) => c.id === editCol.id) ? "Collection saved" : "Collection created");
    setEditCol(null);
  };

  const Row = ({ c, depth }: { c: Category; depth: number }) => (
    <li className="flex items-center gap-3 border-t border-line px-4 py-2.5 first:border-0 hover:bg-surface-2">
      <div className="flex min-w-0 flex-1 items-center gap-3" style={{ paddingLeft: depth * 30 }}>
        {depth > 0 && <span className="-ml-4 h-5 w-3 shrink-0 border-b border-l border-line-strong" />}
        <Thumb src={c.image} alt="" size={depth ? 40 : 48} />
        <div className="min-w-0">
          <div className={depth ? "text-[13px]" : "text-[14px] font-semibold"}>{c.name}</div>
          <div className="truncate text-[12px] text-muted">/category/{c.slug} · <span className="num">{countFor(c)}</span> products</div>
        </div>
      </div>
      <label className="hidden items-center gap-2 text-[12.5px] text-muted sm:flex">
        {c.visible ? "Shown" : "Hidden"}
        <Toggle label={`Show ${c.name} on the store`} checked={c.visible} onChange={(v) => { upsert({ ...c, visible: v }); toast(`${c.name} ${v ? "shown on" : "hidden from"} the store`); }} />
      </label>
      <div className="flex items-center">
        <IconButton icon={ArrowUp} label="Move up" size={14} onClick={() => move(c.id, -1)} />
        <IconButton icon={ArrowDown} label="Move down" size={14} onClick={() => move(c.id, 1)} />
        <IconButton icon={PencilSimple} label="Edit" size={14} onClick={() => { setErr(""); setEdit(c); }} />
        <IconButton icon={Trash} label="Delete" size={14} className="hover:text-bad" onClick={() => setDel(c)} />
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Order here is the order of the storefront menu and filters. Collections group pieces across categories."
        actions={tab === "categories"
          ? <Button variant="primary" icon={Plus} onClick={() => { setErr(""); setEdit({ id: `cat_${Date.now()}`, name: "", slug: "", parentId: null, visible: true, order: categories.length, image: "", description: "" }); }}>Add category</Button>
          : <Button variant="primary" icon={Plus} onClick={() => { setErr(""); setEditCol({ id: `col_${Date.now()}`, name: "", slug: "", description: "", visible: true }); }}>Add collection</Button>}
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: "categories", label: "Categories", count: categories.length }, { value: "collections", label: "Collections", count: collections.length }]} />

      {tab === "categories" ? (
        <div className="flex flex-col gap-4">
          {roots.map((r) => (
            <ul key={r.id} className="overflow-hidden rounded-[6px] border border-line bg-surface">
              <Row c={r} depth={0} />
              {kids(r.id).map((k) => <Row key={k.id} c={k} depth={1} />)}
            </ul>
          ))}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[6px] border border-line bg-surface">
          {collections.map((c) => {
            const pieces = products.filter((p) => p.collections.includes(c.id));
            return (
              <li key={c.id} className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-0 hover:bg-surface-2">
                <div className="flex -space-x-3">{pieces.slice(0, 3).map((p) => <span key={p.id} className="rounded-[3px] ring-2 ring-surface"><Thumb src={p.image} alt="" size={44} /></span>)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <div className="truncate text-[12.5px] text-muted">/collection/{c.slug} · <span className="num">{pieces.length}</span> pieces · {c.description}</div>
                </div>
                <Toggle label={`Show ${c.name}`} checked={c.visible} onChange={(v) => { upsertCol({ ...c, visible: v }); toast(`${c.name} ${v ? "shown" : "hidden"}`); }} />
                <IconButton icon={PencilSimple} label="Edit" size={14} onClick={() => { setErr(""); setEditCol(c); }} />
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit && categories.some((c) => c.id === edit.id) ? "Edit category" : "New category"} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="c-name" error={err}>
              <Input id="c-name" value={edit.name} aria-invalid={!!err} onChange={(e) => { setErr(""); setEdit({ ...edit, name: e.target.value, slug: categories.some((c) => c.id === edit.id) ? edit.slug : slugify(e.target.value) }); }} />
            </Field>
            <Field label="URL handle" htmlFor="c-slug"><Input id="c-slug" prefix="/category/" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></Field>
            <Field label="Parent category" htmlFor="c-parent" hint="Leave empty for a top-level category">
              <Select id="c-parent" value={edit.parentId ?? ""} onChange={(e) => setEdit({ ...edit, parentId: e.target.value || null })}>
                <option value="">None, top level</option>
                {roots.filter((r) => r.id !== edit.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Description" htmlFor="c-desc" hint="Shown at the top of the category page"><Textarea id="c-desc" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Image" hint="Used on the homepage collection tiles">
              {edit.image ? (
                <div className="flex items-center gap-3">
                  <img src={edit.image} alt="" className="h-24 w-20 rounded-[3px] object-cover" />
                  <Button size="sm" onClick={() => setPicker(true)}>Replace</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, image: "" })}>Remove</Button>
                </div>
              ) : (
                <button type="button" onClick={() => setPicker(true)} className="flex h-20 items-center justify-center gap-2 rounded-[4px] border border-dashed border-line-strong text-[13px] text-muted hover:bg-surface-2"><ImageIcon size={18} /> Choose image</button>
              )}
            </Field>
            <label className="flex items-center justify-between rounded-[4px] border border-line px-3 py-2.5 text-[13px]">Shown on the storefront<Toggle label="Shown on the storefront" checked={edit.visible} onChange={(v) => setEdit({ ...edit, visible: v })} /></label>
          </div>
        )}
      </Drawer>

      <Drawer open={!!editCol} onClose={() => setEditCol(null)} title={editCol && collections.some((c) => c.id === editCol.id) ? "Edit collection" : "New collection"} footer={<><Button onClick={() => setEditCol(null)}>Cancel</Button><Button variant="primary" onClick={saveCol}>Save</Button></>}>
        {editCol && (
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="col-name" error={err}><Input id="col-name" value={editCol.name} aria-invalid={!!err} onChange={(e) => { setErr(""); setEditCol({ ...editCol, name: e.target.value, slug: collections.some((c) => c.id === editCol.id) ? editCol.slug : slugify(e.target.value) }); }} /></Field>
            <Field label="URL handle" htmlFor="col-slug"><Input id="col-slug" prefix="/collection/" value={editCol.slug} onChange={(e) => setEditCol({ ...editCol, slug: slugify(e.target.value) })} /></Field>
            <Field label="Description" htmlFor="col-desc"><Textarea id="col-desc" value={editCol.description} onChange={(e) => setEditCol({ ...editCol, description: e.target.value })} /></Field>
            <p className="text-[12.5px] text-muted">Add pieces to a collection from each product's Organisation panel.</p>
          </div>
        )}
      </Drawer>

      <MediaPicker open={picker} multiple={false} onClose={() => setPicker(false)} onPick={([url]) => edit && setEdit({ ...edit, image: url })} />
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => { if (del) { remove(del.id); toast(`${del.name} deleted`); } }}
        title={`Delete ${del?.name}?`}
        body={del && !del.parentId && kids(del.id).length ? `Its ${kids(del.id).length} subcategories go too. Products stay in the catalog without a category.` : "Products stay in the catalog without a category."}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}
