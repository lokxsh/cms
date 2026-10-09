import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DownloadSimple, Prohibit, Users, EnvelopeSimple, ChatCircleText } from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, date, downloadCsv, money } from "../lib/format";
import { Avatar, Badge, Button, Confirm, Drawer, EmptyState, KeyValue, PageHeader, Pagination, Ref, SearchInput, Select, StatusBadge, Tabs, Textarea, Toggle, td, th, tr } from "../components/ui";

type Seg = "all" | "new" | "repeat" | "private" | "vip" | "blocked";
const PAGE = 20;

export function Customers() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const appointments = useStore((s) => s.appointments);
  const setStatus = useStore((s) => s.setCustomerStatus);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const toast = useStore((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const openId = params.get("c");
  const [seg, setSeg] = useState<Seg>("all");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("any");
  const [sort, setSort] = useState("spent");
  const [page, setPage] = useState(1);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const stats = useMemo(() => {
    const m = new Map<string, { orders: number; spent: number; last: number }>();
    for (const o of orders) {
      const s = m.get(o.customerId) ?? { orders: 0, spent: 0, last: 0 };
      s.orders++;
      if (o.status !== "cancelled" && o.paymentStatus !== "failed") s.spent += o.total - (o.status === "refunded" ? o.total : 0);
      s.last = Math.max(s.last, o.createdAt);
      m.set(o.customerId, s);
    }
    return m;
  }, [orders]);
  const st = (id: string) => stats.get(id) ?? { orders: 0, spent: 0, last: 0 };
  const countries = useMemo(() => [...new Set(customers.map((c) => c.country))].sort(), [customers]);

  const inSeg = (c: (typeof customers)[number], s: Seg) => {
    if (s === "new") return c.joinedAt > Date.now() - 30 * 86_400_000;
    if (s === "repeat") return st(c.id).orders > 1;
    if (s === "private") return c.privateClient;
    if (s === "vip") return st(c.id).spent >= 5000;
    if (s === "blocked") return c.status === "blocked";
    return true;
  };

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = customers.filter((c) => inSeg(c, seg) && (country === "any" || c.country === country) && (!t || c.name.toLowerCase().includes(t) || c.email.includes(t) || c.phone.replace(/\s/g, "").includes(t.replace(/\s/g, "")) || c.city.toLowerCase().includes(t)));
    return r.sort((a, b) => sort === "spent" ? st(b.id).spent - st(a.id).spent : sort === "orders" ? st(b.id).orders - st(a.id).orders : sort === "recent" ? st(b.id).last - st(a.id).last : b.joinedAt - a.joinedAt);
  }, [customers, seg, q, sort, stats, country]);

  const open = customers.find((c) => c.id === openId);
  const openOrders = orders.filter((o) => o.customerId === openId);
  const openAppts = appointments.filter((a) => a.customerId === openId).sort((a, b) => b.start - a.start);
  const openStats = open ? st(open.id) : null;

  return (
    <>
      <PageHeader
        title="Customers"
        actions={<Button icon={DownloadSimple} onClick={() => { downloadCsv("rinaz-customers.csv", [["Name", "Email", "Phone", "City", "Country", "Orders", "Total spent", "Joined", "Private client", "Marketing"], ...rows.map((c) => [c.name, c.email, c.phone, c.city, c.country, st(c.id).orders, st(c.id).spent, new Date(c.joinedAt).toISOString().slice(0, 10), c.privateClient ? "yes" : "no", c.marketing ? "yes" : "no"])]); toast(`Exported ${rows.length} customers`, "info"); }}>Export CSV</Button>}
      />
      <div className="rounded-[6px] border border-line bg-surface">
        <div className="px-4">
          <Tabs value={seg} onChange={(v) => { setSeg(v); setPage(1); }} items={[
            { value: "all", label: "All", count: customers.length },
            { value: "private", label: "Private clients", count: customers.filter((c) => inSeg(c, "private")).length },
            { value: "repeat", label: "Repeat buyers", count: customers.filter((c) => inSeg(c, "repeat")).length },
            { value: "vip", label: "Spent $5k+", count: customers.filter((c) => inSeg(c, "vip")).length },
            { value: "new", label: "New, 30 days", count: customers.filter((c) => inSeg(c, "new")).length },
            { value: "blocked", label: "Blocked", count: customers.filter((c) => c.status === "blocked").length },
          ]} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, email, phone or city" className="w-full sm:w-72" />
          <Select aria-label="Country" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="w-auto">
            <option value="any">All countries</option>
            {countries.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto sm:ml-auto">
            <option value="spent">Most spent</option>
            <option value="orders">Most orders</option>
            <option value="recent">Last order</option>
            <option value="joined">Newest</option>
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-line"><EmptyState icon={Users} title="No customers found" body="Nobody matches this search or segment." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr className="border-t border-line bg-surface-2"><th className={th}>Client</th><th className={th}>Location</th><th className={th + " text-right"}>Orders</th><th className={th + " text-right"}>Total spent</th><th className={th}>Last order</th><th className={th}></th></tr></thead>
              <tbody>
                {rows.slice((page - 1) * PAGE, page * PAGE).map((c) => {
                  const s = st(c.id);
                  return (
                    <tr key={c.id} className={tr + " cursor-pointer"} onClick={() => setParams({ c: c.id })}>
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} size={30} />
                          <div className="min-w-0"><div className="truncate font-medium">{c.name}</div><div className="truncate text-[12px] text-muted">{c.email}</div></div>
                        </div>
                      </td>
                      <td className={td + " text-muted"}>{c.city}, {c.country}</td>
                      <td className={td + " num text-right"}>{s.orders}</td>
                      <td className={td + " num text-right font-medium"}>{money(s.spent)}</td>
                      <td className={td + " whitespace-nowrap text-muted"}>{s.last ? ago(s.last) : "Never"}</td>
                      <td className={td}>
                        <div className="flex gap-1.5">
                          {c.status === "blocked" && <StatusBadge status="blocked" />}
                          {c.privateClient && <Badge tone="ink">Private client</Badge>}
                          {Object.keys(c.measurements).length > 0 && <Badge mark={false}>Measured</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </div>

      <Drawer
        open={!!open}
        onClose={() => setParams({})}
        title="Client"
        width={580}
        footer={open && (
          <>
            <Button variant="ghost" icon={Prohibit} className={open.status === "blocked" ? "mr-auto" : "mr-auto text-bad"} onClick={() => open.status === "blocked" ? (setStatus(open.id, "active"), toast(`${open.name} unblocked`)) : setConfirmBlock(true)}>{open.status === "blocked" ? "Unblock" : "Block"}</Button>
            <a href={`https://wa.me/${open.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Button icon={ChatCircleText}>WhatsApp</Button></a>
            <a href={`mailto:${open.email}`}><Button variant="primary" icon={EnvelopeSimple}>Email</Button></a>
          </>
        )}
      >
        {open && openStats && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Avatar name={open.name} size={46} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-semibold">{open.name}</span>{open.status === "blocked" && <StatusBadge status="blocked" />}</div>
                <div className="text-[12.5px] text-muted">{open.city}, {open.country} · client since {date(open.joinedAt)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[4px] border border-line bg-line">
              {[["Orders", String(openStats.orders)], ["Total spent", money(openStats.spent)], ["Appointments", String(openAppts.length)]].map(([k, v]) => (
                <div key={k} className="bg-surface p-3"><div className="text-[11.5px] text-muted">{k}</div><div className="num mt-0.5 text-[16px] font-medium">{v}</div></div>
              ))}
            </div>
            <KeyValue items={[["Email", <a href={`mailto:${open.email}`} className="underline decoration-line-strong underline-offset-2">{open.email}</a>], ["Phone", <span className="num">{open.phone}</span>], ["Address", `${open.addresses[0]?.line1}, ${open.addresses[0]?.city}, ${open.addresses[0]?.country}`]]} />
            <div className="flex flex-col gap-3 rounded-[4px] border border-line p-3">
              <label className="flex items-center justify-between gap-3 text-[13px]">Private client register<Toggle label="Private client" checked={open.privateClient} onChange={(v) => { updateCustomer({ ...open, privateClient: v }); toast(v ? `${open.name} added to private clients` : `${open.name} removed from private clients`); }} /></label>
              <label className="flex items-center justify-between gap-3 text-[13px]">Marketing emails and WhatsApp<Toggle label="Marketing consent" checked={open.marketing} onChange={(v) => updateCustomer({ ...open, marketing: v })} /></label>
            </div>
            {Object.keys(open.measurements).length > 0 && (
              <div>
                <h3 className="mb-2 text-[13.5px] font-semibold">Measurements</h3>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[4px] border border-line bg-line text-[12.5px]">
                  {Object.entries(open.measurements).map(([k, v]) => <div key={k} className="bg-surface px-3 py-2"><div className="text-muted">{k}</div><div className="num">{v}</div></div>)}
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-[13.5px] font-semibold">Notes</h3>
              <Textarea aria-label="Client notes" defaultValue={open.note} onBlur={(e) => e.target.value !== open.note && (updateCustomer({ ...open, note: e.target.value }), toast("Note saved"))} placeholder="Preferences, sizes, occasions. Staff only." className="min-h-16" />
            </div>
            {openAppts.length > 0 && (
              <div>
                <h3 className="mb-2 text-[13.5px] font-semibold">Appointments</h3>
                <ul className="overflow-hidden rounded-[4px] border border-line">
                  {openAppts.slice(0, 5).map((a) => (
                    <li key={a.id} className="border-t border-line first:border-0">
                      <Link to={`/appointments?a=${a.id}`} className="flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-surface-2">
                        <Ref>{a.ref}</Ref><span className="truncate text-muted">{a.type}, {a.atelier}</span>
                        <span className="ml-auto whitespace-nowrap text-muted">{date(a.start)}</span><StatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-[13.5px] font-semibold">Order history</h3>
              {openOrders.length === 0 ? <p className="text-[13px] text-muted">No orders yet.</p> : (
                <ul className="overflow-hidden rounded-[4px] border border-line">
                  {openOrders.map((o) => (
                    <li key={o.id} className="border-t border-line first:border-0">
                      <Link to={`/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-surface-2">
                        <Ref>{o.number}</Ref>
                        <span className="text-muted">{date(o.createdAt)}</span>
                        <span className="ml-auto"><StatusBadge status={o.status} /></span>
                        <span className="num w-20 text-right">{money(o.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Confirm open={confirmBlock} onClose={() => setConfirmBlock(false)} onConfirm={() => { if (open) { setStatus(open.id, "blocked"); toast(`${open.name} blocked`); } }} title={`Block ${open?.name}?`} body="They will not be able to sign in, order or book appointments. Existing orders are not affected." confirmLabel="Block" danger />
    </>
  );
}
