import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChatCenteredText, Check, SealCheck, X, ArrowBendUpLeft } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, cx } from "../lib/format";
import type { ReviewStatus } from "../lib/types";
import { Button, Checkbox, EmptyState, PageHeader, Select, Stars, StatusBadge, Tabs, Textarea, Thumb } from "../components/ui";

export function Reviews() {
  const reviews = useStore((s) => s.reviews);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const setStatus = useStore((s) => s.setReviewStatus);
  const reply = useStore((s) => s.replyReview);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<"all" | ReviewStatus>("pending");
  const [rating, setRating] = useState("any");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const rows = reviews.filter((r) => (tab === "all" || r.status === tab) && (rating === "any" || (rating === "low" ? r.rating <= 2 : r.rating === Number(rating)))).sort((a, b) => b.createdAt - a.createdAt);

  const approved = reviews.filter((r) => r.status === "approved");
  const avg = approved.reduce((s, r) => s + r.rating, 0) / Math.max(1, approved.length);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: approved.filter((r) => r.rating === n).length }));
  const maxC = Math.max(...dist.map((d) => d.c), 1);

  const act = (ids: string[], s: ReviewStatus) => {
    setStatus(ids, s);
    toast(`${ids.length} review${ids.length > 1 ? "s" : ""} ${s}`);
    setSel(new Set());
  };

  return (
    <>
      <PageHeader title="Reviews" description="Approve reviews before they appear on product pages." />

      <section className="mb-4 flex flex-wrap items-center gap-x-10 gap-y-4 rounded-[6px] border border-line bg-surface px-5 py-4">
        <div>
          <div className="flex items-baseline gap-2"><span className="num text-[28px] font-medium tracking-tight">{avg.toFixed(2)}</span><Stars value={avg} size={14} /></div>
          <div className="text-[12.5px] text-muted">{approved.length} published reviews</div>
        </div>
        <ul className="flex min-w-60 flex-1 flex-col gap-1">
          {dist.map((d) => (
            <li key={d.n} className="flex items-center gap-2 text-[12px]">
              <button onClick={() => { setRating(String(d.n)); setTab("all"); }} className="num w-3 text-muted hover:text-ink">{d.n}</button>
              <span className="h-1.5 rounded-[1px] bg-ink" style={{ width: `${Math.max(1, (d.c / maxC) * 60)}%` }} />
              <span className="num text-muted">{d.c}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-[6px] border border-line bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-2 px-4">
          <Tabs value={tab} onChange={(v) => { setTab(v); setSel(new Set()); }} className="border-0" items={[
            { value: "pending", label: "Pending", count: reviews.filter((r) => r.status === "pending").length },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All" },
          ]} />
          <Select aria-label="Rating" value={rating} onChange={(e) => setRating(e.target.value)} className="mb-1.5 w-auto">
            <option value="any">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
            <option value="low">1 to 2 stars</option>
          </Select>
        </div>

        {sel.size > 0 && (
          <div className="flex items-center gap-2 border-t border-line bg-sunken px-4 py-2">
            <span className="mr-2 text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-2">{sel.size} selected</span>
            <Button size="sm" icon={Check} onClick={() => act([...sel], "approved")}>Approve</Button>
            <Button size="sm" icon={X} onClick={() => act([...sel], "rejected")}>Reject</Button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="border-t border-line"><EmptyState icon={ChatCenteredText} title={tab === "pending" ? "All caught up" : "No reviews"} body={tab === "pending" ? "New reviews will wait here until you approve them." : "No reviews match this filter."} /></div>
        ) : (
          <ul>
            {rows.map((r) => {
              const p = prodMap.get(r.productId);
              const c = custMap.get(r.customerId);
              return (
                <li key={r.id} className={cx("flex gap-3 border-t border-line px-4 py-4", sel.has(r.id) && "bg-surface-2")}>
                  <div className="pt-0.5"><Checkbox label="Select review" checked={sel.has(r.id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(r.id) : n.delete(r.id); return n; })} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars value={r.rating} />
                      <span className="text-[13.5px] font-medium">{r.title}</span>
                      {r.status !== "pending" && <StatusBadge status={r.status} />}
                    </div>
                    <p className="mt-1 max-w-[75ch] text-[13px] leading-relaxed text-ink-2">{r.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                      <span className="text-ink-2">{c?.name}</span>
                      {r.verified && <span className="inline-flex items-center gap-1 text-ok"><SealCheck size={13} weight="fill" />Verified buyer</span>}
                      <span>{ago(r.createdAt)}</span>
                      {p && <Link to={`/catalog/products/${p.id}`} className="inline-flex items-center gap-1.5 hover:text-ink"><Thumb src={p.image} alt="" size={18} />{p.name}</Link>}
                    </div>
                    {r.reply && replying !== r.id && (
                      <div className="mt-3 max-w-[75ch] border-l-2 border-ink/50 pl-3 text-[12.5px] text-ink-2">
                        <div className="mb-0.5 text-[11.5px] font-medium text-muted">Store reply</div>{r.reply}
                      </div>
                    )}
                    {replying === r.id && (
                      <div className="mt-3 max-w-[75ch]">
                        <Textarea aria-label="Reply" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Shown publicly under the review" />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="primary" onClick={() => { reply(r.id, draft.trim()); toast(draft.trim() ? "Reply posted" : "Reply removed"); setReplying(null); }}>Post reply</Button>
                          <Button size="sm" onClick={() => setReplying(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-start">
                    {r.status !== "approved" && <Button size="sm" icon={Check} onClick={() => act([r.id], "approved")}>Approve</Button>}
                    {r.status !== "rejected" && <Button size="sm" variant="ghost" icon={X} onClick={() => act([r.id], "rejected")}>Reject</Button>}
                    {r.status === "approved" && replying !== r.id && <Button size="sm" variant="ghost" icon={ArrowBendUpLeft} onClick={() => { setDraft(r.reply ?? ""); setReplying(r.id); }}>{r.reply ? "Edit reply" : "Reply"}</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
