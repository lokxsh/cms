import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, DownloadSimple, Package as PackageIcon, Plus, Trash, Eye, EyeSlash } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { cx, downloadCsv, money } from "../lib/format";
import { isMto, productStock } from "../lib/seed";
import type { Product } from "../lib/types";
import { Button, Checkbox, Confirm, EmptyState, PageHeader, Pagination, Ref, SearchInput, Select, SelectionBar, StatusBadge, Tabs, Thumb, td, th, tr } from "../components/ui";

const PAGE = 20;
type Sort = "updated" | "name" | "price" | "stock" | "sales";

/** Availability of the first option (usually size): struck through when sold out. */
export function SizeRun({ p }: { p: Product }) {
  const first = p.options[0];
  if (!first) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {first.values.map((v) => {
        const vs = p.variants.filter((x) => x.options[0] === v);
        const stock = vs.reduce((s, x) => s + x.stock, 0);
        const mto = vs.some((x) => isMto(x.options));
        return (
          <span key={v} title={mto ? `${v}: made to order` : `${v}: ${stock} in stock`} className={cx("num inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] border px-1 text-[10.5px]", mto ? "border-dashed border-line-strong text-muted" : stock === 0 ? "border-line text-faint line-through" : stock <= p.lowStockAt ? "border-warn/50 text-warn" : "border-line-strong text-ink-2")}>
            {mto ? "MTM" : v.replace('"', "″")}
          </span>
        );
      })}
    </span>
  );
}

export function stockLabel(p: Product) {
  const total = productStock(p);
  const sellable = p.variants.filter((v) => !isMto(v.options));
  const out = sellable.filter((v) => v.stock === 0).length;
  if (sellable.length && total === 0) return <span className="text-bad">Sold out</span>;
  return (
    <span className="text-ink-2">
      <span className="num">{total}</span> in stock
      {out > 0 && <span className="block text-[11.5px] text-warn">{out} of {sellable.length} options sold out</span>}
    </span>
  );
}

export function Products() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const collections = useStore((s) => s.collections);
  const setStatus = useStore((s) => s.setProductStatus);
  const del = useStore((s) => s.deleteProducts);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | Product["status"]>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("any");
  const [col, setCol] = useState("any");
  const [stock, setStock] = useState("any");
  const [sort, setSort] = useState<Sort>("updated");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const base = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "any" && p.categoryId !== cat && catMap.get(p.categoryId)?.parentId !== cat) return false;
      if (col !== "any" && !p.collections.includes(col)) return false;
      const sellable = p.variants.filter((v) => !isMto(v.options));
      if (stock === "out" && !sellable.some((v) => v.stock === 0)) return false;
      if (stock === "low" && !sellable.some((v) => v.stock > 0 && v.stock <= p.lowStockAt)) return false;
      if (stock === "mto" && !p.madeToOrder) return false;
      return !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t) || p.variants.some((v) => v.sku.toLowerCase().includes(t)) || p.tags.some((x) => x.includes(t));
    });
  }, [products, q, cat, col, stock, catMap]);

  const rows = useMemo(() => {
    const r = tab === "all" ? base : base.filter((p) => p.status === tab);
    const sorters: Record<Sort, (a: Product, b: Product) => number> = {
      updated: (a, b) => b.updatedAt - a.updatedAt,
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price),
      stock: (a, b) => productStock(a) - productStock(b),
      sales: (a, b) => b.sold30d - a.sold30d,
    };
    return [...r].sort(sorters[sort]);
  }, [base, tab, sort]);

  const visible = rows.slice((page - 1) * PAGE, page * PAGE);
  const ids = [...sel];

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Button icon={DownloadSimple} onClick={() => { downloadCsv("rinaz-products.csv", [["SKU", "Variant SKU", "Name", "Options", "Price", "Stock", "Status"], ...rows.flatMap((p) => p.variants.map((v) => [p.sku, v.sku, p.name, v.options.join(" / "), v.price ?? p.salePrice ?? p.price, v.stock, p.status]))]); toast(`Exported ${rows.length} products`, "info"); }}>Export CSV</Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate("/catalog/products/new")}>Add product</Button>
          </>
        }
      />

      <div className="rounded-[6px] border border-line bg-surface">
        <div className="px-4">
          <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); setSel(new Set()); }} items={[
            { value: "all", label: "All", count: base.length },
            { value: "active", label: "Active", count: base.filter((p) => p.status === "active").length },
            { value: "draft", label: "Draft", count: base.filter((p) => p.status === "draft").length },
            { value: "archived", label: "Archived", count: base.filter((p) => p.status === "archived").length },
          ]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, SKU or tag" className="w-full sm:w-64" />
          <Select aria-label="Category" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">All categories</option>
            {categories.filter((c) => !c.parentId).map((root) => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>All {root.name}</option>
                {categories.filter((c) => c.parentId === root.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </Select>
          <Select aria-label="Collection" value={col} onChange={(e) => { setCol(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any collection</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select aria-label="Stock" value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">Any stock</option>
            <option value="low">Some sizes low</option>
            <option value="out">Some sizes sold out</option>
            <option value="mto">Made to order</option>
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto sm:ml-auto">
            <option value="updated">Recently updated</option>
            <option value="sales">Best selling</option>
            <option value="name">Name A to Z</option>
            <option value="price">Price, high to low</option>
            <option value="stock">Stock, low to high</option>
          </Select>
        </div>

        {sel.size > 0 && (
          <SelectionBar count={sel.size} onClear={() => setSel(new Set())}>
            <Button size="sm" icon={Eye} onClick={() => { setStatus(ids, "active"); toast(`${ids.length} products now visible on the store`); setSel(new Set()); }}>Set active</Button>
            <Button size="sm" icon={EyeSlash} onClick={() => { setStatus(ids, "draft"); toast(`${ids.length} products hidden as drafts`); setSel(new Set()); }}>Set draft</Button>
            <Button size="sm" icon={Archive} onClick={() => { setStatus(ids, "archived"); toast(`${ids.length} products archived`); setSel(new Set()); }}>Archive</Button>
            <Button size="sm" icon={Trash} onClick={() => setConfirmDel(true)}>Delete</Button>
          </SelectionBar>
        )}

        {rows.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState icon={PackageIcon} title="No products found" body="Try a different search, or add a new piece to the catalog." action={<Button variant="primary" icon={Plus} onClick={() => navigate("/catalog/products/new")}>Add product</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-t border-line bg-surface-2">
                  <th className={th + " w-8"}><Checkbox label="Select all" checked={visible.length > 0 && visible.every((p) => sel.has(p.id))} indeterminate={visible.some((p) => sel.has(p.id))} onChange={(v) => setSel((s) => { const n = new Set(s); visible.forEach((p) => (v ? n.add(p.id) : n.delete(p.id))); return n; })} /></th>
                  <th className={th}>Product</th>
                  <th className={th}>Status</th>
                  <th className={th}>Availability</th>
                  <th className={th}>Inventory</th>
                  <th className={th + " text-right"}>Sold, 30d</th>
                  <th className={th + " text-right"}>Price</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={tr + " cursor-pointer"} onClick={() => navigate(`/catalog/products/${p.id}`)}>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <Checkbox label={`Select ${p.name}`} checked={sel.has(p.id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(p.id) : n.delete(p.id); return n; })} />
                    </td>
                    <td className={td + " py-2"}>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.image} alt="" size={56} />
                        <div className="min-w-0">
                          <div className="max-w-80 truncate font-medium">{p.name}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted"><Ref>{p.sku}</Ref><span>{catMap.get(p.categoryId)?.name}</span></div>
                        </div>
                      </div>
                    </td>
                    <td className={td}><StatusBadge status={p.status} /></td>
                    <td className={td}><SizeRun p={p} /></td>
                    <td className={td + " text-[13px]"}>{stockLabel(p)}</td>
                    <td className={td + " num text-right text-muted"}>{p.sold30d}</td>
                    <td className={td + " text-right"}>
                      {p.salePrice ? (
                        <><div className="num font-medium">{money(p.salePrice)}</div><div className="num text-[11.5px] text-faint line-through">{money(p.price)}</div></>
                      ) : <span className="num font-medium">{money(p.price)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </div>

      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { del(ids); toast(`${ids.length} products deleted`); setSel(new Set()); }} title={`Delete ${sel.size} product${sel.size > 1 ? "s" : ""}?`} body="They disappear from the storefront and catalog. Past orders keep their line items. Archive instead if the piece may return." confirmLabel="Delete" danger />
    </>
  );
}
