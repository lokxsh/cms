import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { moneyCompact, money, count } from "../lib/format";

const axis = { fontSize: 11, fill: "var(--faint)", fontFamily: "var(--font-mono)" };

function TipBox({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; fmt: (n: number, key: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[4px] border border-line bg-surface px-3 py-2 text-[12px] shadow-float">
      <div className="mb-1 text-muted">{label}</div>
      {payload.filter((p) => p.value !== null && p.value !== undefined).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-2">{p.name}</span>
          <span className="num ml-auto pl-4 font-medium text-ink">{fmt(p.value, p.dataKey)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data, height = 260, compare }: { data: { label: string; revenue: number | null; prev?: number; orders?: number }[]; height?: number; compare?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.1} />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={28} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={moneyCompact} width={52} />
        <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<TipBox fmt={(n, k) => (k === "orders" ? count(n) : money(n))} />} />
        {compare && <Line type="monotone" dataKey="prev" name={compare} stroke="var(--faint)" strokeDasharray="3 3" strokeWidth={1.25} dot={false} isAnimationActive={false} />}
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--ink)" strokeWidth={1.6} fill="url(#revFill)" dot={false} activeDot={{ r: 3.5, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function OrdersBars({ data, height = 200, dataKey = "orders", name = "Orders", fmt = count }: { data: Record<string, unknown>[]; height?: number; dataKey?: string; name?: string; fmt?: (n: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={40} allowDecimals={false} tickFormatter={(v) => (fmt === count ? String(v) : moneyCompact(v))} />
        <Tooltip cursor={{ fill: "var(--sunken)" }} content={<TipBox fmt={(n) => fmt(n)} />} />
        <Bar dataKey={dataKey} name={name} fill="var(--ink)" radius={[1, 1, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StackedBars({ data, keys, height = 220 }: { data: Record<string, unknown>[]; keys: { key: string; name: string; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <Tooltip cursor={{ fill: "var(--sunken)" }} content={<TipBox fmt={(n) => count(n)} />} />
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.name} stackId="s" fill={k.color} radius={i === keys.length - 1 ? [1, 1, 0, 0] : 0} maxBarSize={18} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Spark({ data, height = 32 }: { data: number[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="v" stroke="var(--ink)" strokeWidth={1.25} fill="var(--ink)" fillOpacity={0.06} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Shares as ruled figures: label, value and percentage on one line. */
export function ShareList({ rows, fmt }: { rows: { label: string; value: number; sub?: string }[]; fmt: (n: number) => string }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <ul className="-my-1">
      {rows.map((r) => (
        <li key={r.label} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[13px] last:border-0">
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="num shrink-0 text-ink">{fmt(r.value)}<span className="ml-2 inline-block w-9 text-right text-muted">{((r.value / total) * 100).toFixed(0)}%</span></span>
        </li>
      ))}
    </ul>
  );
}
