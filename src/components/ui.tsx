import { forwardRef, useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CaretLeft, CaretRight, CheckCircle, Info, MagnifyingGlass, Star, WarningCircle, X, type Icon } from "@phosphor-icons/react";
import { cx, initials } from "../lib/format";
import { useStore } from "../lib/store";

/* Shape rule: controls 4px, panels 6px, status chips 3px. One-pixel rules, no shadows on content. */

/* ---------------- Buttons ---------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] font-medium transition-[background-color,color,border-color] duration-150 active:translate-y-px disabled:opacity-45 disabled:pointer-events-none select-none";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-primary text-primary-ink border border-primary hover:bg-ink-2 dark:hover:bg-white",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-2",
  ghost: "text-ink-2 border border-transparent hover:bg-sunken hover:text-ink",
  danger: "bg-bad text-white border border-bad hover:brightness-110 dark:text-[#1a0d0c]",
};
const btnSizes = { sm: "h-7 px-2.5 text-[12.5px] max-sm:h-9", md: "h-8.5 px-3.5 text-[13px] max-sm:h-10" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: keyof typeof btnSizes;
  icon?: Icon;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", icon: I, className, children, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} {...rest}>
      {I && <I size={size === "sm" ? 14 : 15} className="shrink-0" />}
      {children}
    </button>
  );
});

export function IconButton({ icon: I, label, className, size = 16, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string; size?: number }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx("inline-grid size-8 shrink-0 place-items-center rounded-[4px] text-muted transition-colors hover:bg-sunken hover:text-ink active:translate-y-px disabled:opacity-35 max-sm:size-10", className)} {...rest}>
      <I size={size} />
    </button>
  );
}

/* ---------------- Status marks ---------------- */

export type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "ink";
const toneText: Record<Tone, string> = {
  neutral: "text-muted border-line",
  ok: "text-ink border-line-strong",
  warn: "text-ink border-ink/60",
  bad: "text-bad border-bad/45",
  info: "text-ink-2 border-line-strong",
  ink: "text-ink border-line-strong",
};
/* Marks, not colours: filled = done or settled, hollow = waiting on someone, faint = in motion, struck = stopped. */
const toneMark: Record<Tone, string> = {
  neutral: "border border-faint bg-transparent",
  ok: "bg-ink",
  warn: "border border-ink bg-transparent",
  bad: "bg-bad",
  info: "bg-faint",
  ink: "bg-ink",
};

export function Badge({ tone = "neutral", children, className, mark = true }: { tone?: Tone; children: ReactNode; className?: string; mark?: boolean }) {
  return (
    <span className={cx("inline-flex h-5.5 items-center gap-1.5 whitespace-nowrap rounded-[3px] border bg-surface px-1.5 text-[11.5px] font-medium", toneText[tone], className)}>
      {mark && <span className={cx("size-[7px] shrink-0 rounded-[1px]", toneMark[tone])} />}
      {children}
    </span>
  );
}

const statusMap: Record<string, [string, Tone]> = {
  pending: ["Pending", "warn"], processing: ["Processing", "info"], shipped: ["Shipped", "ink"], delivered: ["Delivered", "ok"], cancelled: ["Cancelled", "neutral"], refunded: ["Refunded", "bad"],
  paid: ["Paid", "ok"], failed: ["Failed", "bad"], partially_refunded: ["Part refunded", "warn"],
  captured: ["Captured", "ok"], partial_refund: ["Part refunded", "warn"],
  active: ["Active", "ok"], draft: ["Draft", "neutral"], archived: ["Archived", "neutral"],
  approved: ["Approved", "ok"], rejected: ["Rejected", "bad"],
  published: ["Published", "ok"], blocked: ["Blocked", "bad"], invited: ["Invited", "info"], suspended: ["Suspended", "bad"],
  requested: ["Requested", "warn"], confirmed: ["Confirmed", "ink"], completed: ["Completed", "ok"], no_show: ["No show", "bad"],
  live: ["Live", "ok"], scheduled: ["Scheduled", "info"], ended: ["Ended", "neutral"],
};
export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = statusMap[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

/** One stable reference per record (order no., SKU, appointment no.), set the same way everywhere. */
export function Ref({ children, to, className }: { children: ReactNode; to?: string; className?: string }) {
  const cls = cx("num text-[12.5px] font-medium text-ink", to && "underline decoration-line-strong underline-offset-[3px] hover:decoration-ink", className);
  return to ? <Link to={to} onClick={(e) => e.stopPropagation()} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}

/* ---------------- The tape ---------------- */

const tickInk = "rgb(18 17 16 / 0.5)";
const tickFaint = "var(--line-strong)";
export const tapeTicks = (color: string, major: number) =>
  `linear-gradient(to right, ${color} 1px, transparent 1px) 0 0 / calc(100% / ${major * 4}) 35% repeat-x, linear-gradient(to right, ${color} 1px, transparent 1px) 0 0 / calc(100% / ${major}) 70% repeat-x`;
export const TAPE_GOLD = (major: number) => `${tapeTicks(tickInk, major)}, var(--gold)`;
export const TAPE_BLANK = (major: number) => `${tapeTicks(tickFaint, major)}, var(--sunken)`;

/**
 * The signature: a tailor's tape. Gold with black ticks measures progress; the black pin marks where things stand.
 * Reserved for progress against a target and for time. Nothing else in the admin is gold.
 */
export function Tape({ value, major = 4, className, label, height = 10, animate = true }: { value: number; major?: number; className?: string; label?: string; height?: number; animate?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label} className={cx("relative w-full", className)} style={{ height }}>
      <div className="absolute inset-0 rounded-[1px]" style={{ background: TAPE_BLANK(major) }} />
      {pct > 0 && (
        <div className={cx("absolute inset-y-0 left-0 overflow-hidden rounded-[1px]", animate && "tape-fill")} style={{ width: `${pct}%` }}>
          <div className="absolute inset-y-0 left-0" style={{ width: `${(100 / pct) * 100}%`, background: TAPE_GOLD(major) }} />
        </div>
      )}
      {pct > 0 && pct < 100 && <span aria-hidden className="absolute -top-[3px] -bottom-[3px] w-[2px] -translate-x-1/2 bg-ink" style={{ left: `${pct}%` }} />}
    </div>
  );
}

/** A tape divided into named stages, used for order fulfilment. */
export function StageTape({ stages, at, broken, compact }: { stages: string[]; at: number; broken?: boolean; compact?: boolean }) {
  const segs = stages.length - 1;
  return (
    <div className={cx("w-full", compact && "max-w-[92px]")}>
      {broken ? (
        <div className="relative rounded-[1px]" style={{ height: compact ? 8 : 10, background: TAPE_BLANK(segs) }}>
          <span className="absolute inset-x-0 top-1/2 h-px bg-bad" />
        </div>
      ) : (
        <Tape value={at / segs} major={segs} height={compact ? 8 : 10} label={`${stages[at]}, step ${at + 1} of ${stages.length}`} />
      )}
      {!compact && (
        <div className="mt-2 grid text-[11.5px]" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
          {stages.map((s, i) => (
            <span key={s} className={cx(i === 0 ? "text-left" : i === stages.length - 1 ? "text-right" : "text-center", !broken && i <= at ? "font-medium text-ink" : "text-faint")}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Form controls ---------------- */

const controlCls =
  "rounded-[4px] border border-line-strong bg-surface px-2.5 text-[13.5px] text-ink placeholder:text-faint transition-colors hover:border-faint focus:border-ink focus:outline-none focus:shadow-[0_0_0_3px_var(--gold-soft)] disabled:bg-sunken disabled:text-muted aria-[invalid=true]:border-bad";

export function Field({ label, hint, error, children, className, htmlFor, aside }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string; htmlFor?: string; aside?: ReactNode }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-ink-2">{label}</label>
        {aside && <span className="text-[12px] text-muted">{aside}</span>}
      </div>
      {children}
      {error ? <p className="text-[12px] text-bad">{error}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix?: string; suffix?: string }>(function Input({ className, prefix, suffix, ...rest }, ref) {
  if (prefix || suffix) {
    return (
      <div className={cx("flex h-8.5 items-stretch overflow-hidden rounded-[4px] border border-line-strong bg-surface focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--gold-soft)] max-sm:h-10", className)}>
        {prefix && <span className="grid place-items-center border-r border-line bg-surface-2 px-2.5 text-[13px] text-muted">{prefix}</span>}
        <input ref={ref} className="min-w-0 flex-1 bg-transparent px-2.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none" {...rest} />
        {suffix && <span className="grid place-items-center border-l border-line bg-surface-2 px-2.5 text-[13px] text-muted">{suffix}</span>}
      </div>
    );
  }
  return <input ref={ref} className={cx(controlCls, "h-8.5 w-full max-sm:h-10", className)} {...rest} />;
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlCls, "min-h-20 w-full py-2 leading-relaxed", className)} {...rest} />;
}

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%238f8d88'%3E%3Cpath d='M213.66 101.66l-80 80a8 8 0 01-11.32 0l-80-80a8 8 0 0111.32-11.32L128 164.69l74.34-74.35a8 8 0 0111.32 11.32z'/%3E%3C/svg%3E\")";
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(controlCls, !/(^| )w-/.test(className ?? "") && "w-full", "h-8.5 appearance-none bg-[length:14px] bg-[right_9px_center] bg-no-repeat pr-8 max-sm:h-10", className)} style={{ backgroundImage: chevron }} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-5 w-9 shrink-0 items-center rounded-[3px] border transition-colors disabled:opacity-45", checked ? "border-ink bg-ink" : "border-line-strong bg-sunken")}
    >
      <span className={cx("absolute left-[2px] size-3.5 rounded-[2px] transition-transform duration-200", checked ? "translate-x-4 bg-surface" : "bg-faint")} />
    </button>
  );
}

export function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 cursor-pointer max-sm:size-4.5" />;
}

export function SearchInput({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx("relative", className)}>
      <MagnifyingGlass size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input type="search" aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(controlCls, "h-8.5 w-full pl-8 max-sm:h-10 [&::-webkit-search-cancel-button]:hidden")} />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/* ---------------- Layout pieces ---------------- */

export function PageHeader({ title, description, actions, back, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { to: string; label: string }; meta?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
            <ArrowLeft size={13} /> {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display text-[25px] leading-tight text-ink max-sm:text-[22px]">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1.5 max-w-[68ch] text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, actions, children, className, bodyClass, description, id }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; description?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cx("min-w-0 rounded-[6px] border border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cx(bodyClass ?? "p-4")}>{children}</div>
    </section>
  );
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("-mb-px flex gap-5 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]", className)}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.value)}
            className={cx("relative flex h-10 shrink-0 items-center gap-1.5 text-[13px] transition-colors", on ? "font-semibold text-ink" : "text-muted hover:text-ink")}
          >
            {it.label}
            {it.count !== undefined && <span className={cx("num text-[11.5px]", on ? "text-ink" : "text-faint")}>{it.count}</span>}
            {on && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-gold" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[4px] border border-line-strong bg-surface p-0.5">
      {items.map((it) => (
        <button key={it.value} type="button" role="radio" aria-checked={it.value === value} onClick={() => onChange(it.value)} className={cx("h-7 rounded-[3px] px-2.5 text-[12.5px] transition-colors max-sm:h-9", it.value === value ? "bg-ink font-medium text-surface" : "text-muted hover:text-ink")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Tables ---------------- */

export const th = "h-9 px-3 text-left text-[12px] font-medium text-muted whitespace-nowrap first:pl-4 last:pr-4";
export const td = "h-13 px-3 text-[13px] first:pl-4 last:pr-4";
export const tr = "border-t border-line transition-colors hover:bg-surface-2";

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[12.5px] text-muted">
      <span className="num">{from}-{to} of {total}</span>
      <div className="flex items-center gap-1">
        <IconButton icon={CaretLeft} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} size={14} />
        <span className="num px-1">{page} / {pages}</span>
        <IconButton icon={CaretRight} label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} size={14} />
      </div>
    </div>
  );
}

export function EmptyState({ icon: I, title, body, action }: { icon: Icon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <I size={26} weight="light" className="mb-3 text-faint" />
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-[42ch] text-[13px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-[4px]", className)} />;
}

/** Bulk-selection bar shown above a table. */
export function SelectionBar({ count, children, onClear }: { count: number; children: ReactNode; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-rail px-4 py-2 text-rail-ink">
      <span className="num mr-2 text-[13px] font-medium">{count} selected</span>
      <div className="flex flex-wrap items-center gap-1.5 [&_button]:border-rail-line [&_button]:bg-rail-2 [&_button]:text-rail-ink [&_button:hover]:border-rail-muted">{children}</div>
      <button type="button" onClick={onClear} className="ml-auto text-[12.5px] text-rail-muted hover:text-rail-ink">Clear</button>
    </div>
  );
}

/* ---------------- Avatars, thumbs, stars ---------------- */

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 font-medium text-ink-2" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name) || "?"}
    </span>
  );
}

/** Portrait thumb: fashion photography is roughly 4:5. */
export function Thumb({ src, alt, size = 40, square }: { src: string; alt: string; size?: number; square?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const w = square ? size : Math.round(size * 0.8);
  // Request a thumbnail-sized rendition from the image CDN instead of the full photo.
  const sized = src?.includes("images.unsplash.com") ? src.replace(/([?&])w=\d+/, `$1w=${Math.min(600, Math.ceil(size * 3))}`) : src;
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-[3px] bg-sunken" style={{ width: w, height: size }}>
      {sized && <img src={sized} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} className={cx("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} />}
    </span>
  );
}

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px text-ink" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} weight={n <= Math.round(value) ? "fill" : "regular"} className={n <= Math.round(value) ? "" : "text-line-strong"} />
      ))}
    </span>
  );
}

/* ---------------- Overlays ---------------- */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

export function Drawer({ open, onClose, title, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <div className="anim-slide absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-float" style={{ maxWidth: width }}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 440 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <div className="anim-rise relative w-full rounded-t-[8px] border border-line bg-surface shadow-float sm:rounded-[6px]" style={{ maxWidth: width }}>
        <div className="px-5 pt-5">
          <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-3 text-[13.5px] text-ink-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 pb-5 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Keep as is</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      {body}
    </Modal>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-end gap-2 lg:inset-x-auto lg:bottom-4 lg:right-4" aria-live="polite">
      {toasts.map((t) => {
        const I = t.tone === "ok" ? CheckCircle : t.tone === "bad" ? WarningCircle : Info;
        return (
          <div key={t.id} className="anim-rise pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-[4px] bg-rail px-3.5 py-2.5 text-[13px] text-rail-ink shadow-float">
            <I size={17} weight="fill" className={t.tone === "bad" ? "text-[#ef8a80]" : "text-rail-ink"} />
            <span className="flex-1">{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-rail-muted hover:text-rail-ink"><X size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(104px,auto)_1fr] gap-x-4 gap-y-2 text-[13px]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null || !isFinite(value)) return <span className="text-[12px] text-faint">no earlier data</span>;
  if (Math.abs(value) < 0.05) return <span className="num text-[12px] text-muted">no change</span>;
  const good = invert ? value < 0 : value > 0;
  return <span className={cx("num text-[12px] font-medium", good ? "text-ink" : "text-bad")}>{value > 0 ? "+" : "−"}{Math.abs(value).toFixed(1)}%</span>;
}
