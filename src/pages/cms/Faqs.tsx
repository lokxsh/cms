import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CaretDown, Plus, Question, Trash } from "@phosphor-icons/react";
import { useStore } from "../../lib/store";
import { cx } from "../../lib/format";
import type { Faq } from "../../lib/types";
import { Button, EmptyState, Field, IconButton, Input, PageHeader, Textarea, Toggle } from "../../components/ui";

export function Faqs() {
  const saved = useStore((s) => s.faqs);
  const setFaqs = useStore((s) => s.setFaqs);
  const toast = useStore((s) => s.toast);
  const [faqs, setLocal] = useState<Faq[]>(saved);
  const [openId, setOpenId] = useState<string | null>(null);
  const dirty = JSON.stringify(faqs) !== JSON.stringify(saved);
  const groups = useMemo(() => [...new Set(faqs.map((f) => f.group))], [faqs]);

  const patch = (id: string, p: Partial<Faq>) => setLocal((l) => l.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const move = (id: string, dir: -1 | 1) => setLocal((l) => {
    const f = l.find((x) => x.id === id)!;
    const same = l.filter((x) => x.group === f.group);
    const k = same.indexOf(f) + dir;
    if (k < 0 || k >= same.length) return l;
    const a = l.indexOf(f), b = l.indexOf(same[k]);
    const n = [...l];
    [n[a], n[b]] = [n[b], n[a]];
    return n;
  });
  const add = (group: string) => {
    const f: Faq = { id: `f${Date.now()}`, group, q: "", a: "", visible: true };
    setLocal((l) => [...l, f]);
    setOpenId(f.id);
  };

  const save = () => {
    const bad = faqs.find((f) => !f.q.trim() || !f.a.trim());
    if (bad) {
      setOpenId(bad.id);
      return toast("Every FAQ needs a question and an answer", "bad");
    }
    setFaqs(faqs);
    toast("FAQs saved");
  };

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Shown on the Help page and under product details."
        actions={<><Button onClick={() => add(groups[0] ?? "General")} icon={Plus}>Add question</Button><Button variant="primary" disabled={!dirty} onClick={save}>Save</Button></>}
      />
      {faqs.length === 0 ? (
        <div className="rounded-[6px] border border-line bg-surface"><EmptyState icon={Question} title="No FAQs" body="Answer common questions about shipping, returns and payments." action={<Button icon={Plus} onClick={() => add("General")}>Add question</Button>} /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold">{g}</h2>
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => add(g)}>Add to {g}</Button>
              </div>
              <ul className="overflow-hidden rounded-[6px] border border-line bg-surface">
                {faqs.filter((f) => f.group === g).map((f) => {
                  const open = openId === f.id;
                  return (
                    <li key={f.id} className="border-t border-line first:border-0">
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <button onClick={() => setOpenId(open ? null : f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
                          <CaretDown size={12} className={cx("shrink-0 text-faint transition-transform", !open && "-rotate-90")} />
                          <span className={cx("truncate text-[13.5px]", f.visible ? "text-ink" : "text-faint")}>{f.q || "New question"}</span>
                        </button>
                        <Toggle label="Visible" checked={f.visible} onChange={(v) => patch(f.id, { visible: v })} />
                        <IconButton icon={ArrowUp} label="Move up" size={13} onClick={() => move(f.id, -1)} />
                        <IconButton icon={ArrowDown} label="Move down" size={13} onClick={() => move(f.id, 1)} />
                        <IconButton icon={Trash} label="Delete" size={13} className="hover:text-bad" onClick={() => setLocal((l) => l.filter((x) => x.id !== f.id))} />
                      </div>
                      {open && (
                        <div className="grid gap-3 border-t border-line bg-surface-2 px-4 py-4 sm:grid-cols-[1fr_180px]">
                          <div className="flex flex-col gap-3">
                            <Field label="Question" htmlFor={`q-${f.id}`}><Input id={`q-${f.id}`} value={f.q} onChange={(e) => patch(f.id, { q: e.target.value })} /></Field>
                            <Field label="Answer" htmlFor={`a-${f.id}`}><Textarea id={`a-${f.id}`} value={f.a} onChange={(e) => patch(f.id, { a: e.target.value })} /></Field>
                          </div>
                          <Field label="Group" htmlFor={`g-${f.id}`} hint="Type a new name to create a group">
                            <Input id={`g-${f.id}`} list="faq-groups" value={f.group} onChange={(e) => patch(f.id, { group: e.target.value })} />
                          </Field>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <datalist id="faq-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </div>
      )}
    </>
  );
}
