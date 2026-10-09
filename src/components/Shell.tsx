import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, CalendarBlank, CaretDown, ChartLineUp, ChatCenteredText, CreditCard, Gear, House, List, MagnifyingGlass, Megaphone,
  Moon, Package, Receipt, SignOut, Sun, Users, Browsers, ArrowSquareOut, X, DotsThreeOutline, type Icon,
} from "@phosphor-icons/react";
import { useStore } from "../lib/store";
import { ago, cx, money } from "../lib/format";
import { Avatar, Toasts } from "./ui";
import { ErrorBoundary } from "./ErrorBoundary";

interface NavChild { label: string; to: string }
interface NavItem { label: string; to: string; icon: Icon; badge?: number; children?: NavChild[] }

/** Navigation follows section 4 of the client's requirements, with Appointments added for the bridal salons. */
function useNav(): NavItem[] {
  const pendingOrders = useStore((s) => s.orders.filter((o) => o.status === "pending").length);
  const pendingReviews = useStore((s) => s.reviews.filter((r) => r.status === "pending").length);
  const requested = useStore((s) => s.appointments.filter((a) => a.status === "requested").length);
  return [
    { label: "Dashboard", to: "/", icon: House },
    { label: "Catalog", to: "/catalog", icon: Package, children: [
      { label: "Products", to: "/catalog/products" }, { label: "Categories", to: "/catalog/categories" },
      { label: "Inventory", to: "/catalog/inventory" }, { label: "Media", to: "/catalog/media" },
    ] },
    { label: "Orders", to: "/orders", icon: Receipt, badge: pendingOrders, children: [
      { label: "All orders", to: "/orders" }, { label: "Pending", to: "/orders?status=pending" }, { label: "Processing", to: "/orders?status=processing" },
      { label: "Shipped", to: "/orders?status=shipped" }, { label: "Delivered", to: "/orders?status=delivered" }, { label: "Cancelled", to: "/orders?status=cancelled" },
      { label: "Refunds", to: "/orders?status=refunded" },
    ] },
    { label: "Payments", to: "/payments", icon: CreditCard, children: [
      { label: "Transactions", to: "/payments" }, { label: "Successful", to: "/payments?status=captured" }, { label: "Failed", to: "/payments?status=failed" },
      { label: "Pending", to: "/payments?status=pending" }, { label: "Refunds", to: "/payments?status=refunds" },
    ] },
    { label: "Customers", to: "/customers", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarBlank, badge: requested },
    { label: "Marketing", to: "/marketing", icon: Megaphone, children: [
      { label: "Coupons", to: "/marketing/coupons" }, { label: "Discounts", to: "/marketing/discounts" }, { label: "Promotions", to: "/marketing/promotions" },
    ] },
    { label: "CMS", to: "/cms", icon: Browsers, children: [
      { label: "Homepage", to: "/cms/homepage" }, { label: "Headers & banners", to: "/cms/banners" }, { label: "Pages", to: "/cms/pages" },
      { label: "FAQs", to: "/cms/faqs" }, { label: "SEO", to: "/cms/seo" },
    ] },
    { label: "Reviews", to: "/reviews", icon: ChatCenteredText, badge: pendingReviews },
    { label: "Analytics", to: "/analytics", icon: ChartLineUp, children: [
      { label: "Sales", to: "/analytics?view=sales" }, { label: "Products", to: "/analytics?view=products" }, { label: "Customers", to: "/analytics?view=customers" },
      { label: "Payments", to: "/analytics?view=payments" }, { label: "Inventory", to: "/analytics?view=inventory" },
    ] },
    { label: "Settings", to: "/settings", icon: Gear, children: [
      { label: "Store", to: "/settings/store" }, { label: "Shipping", to: "/settings/shipping" }, { label: "Tax", to: "/settings/tax" },
      { label: "Payment gateway", to: "/settings/payments" }, { label: "Notifications", to: "/settings/notifications" },
      { label: "Admin users & permissions", to: "/settings/team" }, { label: "Activity log", to: "/settings/activity" },
    ] },
  ];
}

function useIsActive() {
  const { pathname, search } = useLocation();
  return (to: string, exactQuery = true) => {
    const [p, q = ""] = to.split("?");
    if (p === "/") return pathname === "/";
    if (!pathname.startsWith(p)) return false;
    if (!exactQuery) return true;
    const want = new URLSearchParams(q);
    const have = new URLSearchParams(search);
    const key = p === "/orders" || p === "/payments" ? "status" : p === "/analytics" ? "view" : null;
    if (!key) return true;
    const fallback = p === "/analytics" ? "sales" : "";
    return (want.get(key) ?? fallback) === (have.get(key) ?? fallback);
  };
}

function Wordmark() {
  const name = useStore((s) => s.settings.name);
  const [word, ...rest] = name.split(" ");
  return (
    <Link to="/" className="block leading-none">
      <span className="display block text-[21px] font-semibold tracking-[0.2em] text-rail-ink">{word}</span>
      <span className="mt-1.5 block text-[10.5px] font-medium tracking-[0.32em] text-rail-muted">{rest.join(" ") || "STUDIO"} ADMIN</span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNav();
  const { pathname } = useLocation();
  const isActive = useIsActive();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const g = nav.find((n) => n.children && pathname.startsWith(n.to));
    if (g) setOpen((o) => ({ ...o, [g.to]: true }));
  }, [pathname]);

  return (
    <div className="flex h-full flex-col bg-rail text-rail-ink">
      <div className="px-5 pb-5 pt-6"><Wordmark /></div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 [scrollbar-color:var(--rail-line)_transparent]" aria-label="Main">
        <ul className="flex flex-col gap-px">
          {nav.map((item) => {
            const I = item.icon;
            const here = isActive(item.to, false);
            const isOpen = open[item.to];
            const head = (
              <>
                <span className={cx("size-1.5 shrink-0 rounded-[1px]", here ? "bg-gold" : "bg-transparent")} />
                <I size={17} weight={here ? "fill" : "regular"} className={here ? "text-rail-ink" : "text-rail-muted"} />
                <span className="flex-1 text-left">{item.label}</span>
                {!!item.badge && <span className="num rounded-[3px] bg-rail-2 px-1.5 text-[11px] text-rail-ink">{item.badge}</span>}
              </>
            );
            const rowCls = cx("flex h-9 w-full items-center gap-2.5 rounded-[4px] pl-1.5 pr-2 text-[13.5px] transition-colors", here ? "text-rail-ink" : "text-rail-muted hover:bg-rail-2 hover:text-rail-ink");
            if (!item.children) {
              return <li key={item.to}><Link to={item.to} onClick={onNavigate} aria-current={here ? "page" : undefined} className={rowCls}>{head}</Link></li>;
            }
            return (
              <li key={item.to}>
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [item.to]: !o[item.to] }))} aria-expanded={isOpen} className={rowCls}>
                  {head}
                  <CaretDown size={11} className={cx("transition-transform", !isOpen && "-rotate-90")} />
                </button>
                {isOpen && (
                  <ul className="mb-1.5 ml-[33px] mt-0.5 flex flex-col border-l border-rail-line">
                    {item.children.map((c) => {
                      const on = isActive(c.to);
                      return (
                        <li key={c.to} className="relative">
                          {on && <span className="absolute -left-px top-1.5 bottom-1.5 w-px bg-gold" />}
                          <Link to={c.to} onClick={onNavigate} aria-current={on ? "page" : undefined} className={cx("flex h-8 items-center pl-3 text-[13px] transition-colors", on ? "text-rail-ink" : "text-rail-muted hover:text-rail-ink")}>
                            {c.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-rail-line p-3">
        <a href="https://rinaz-boutique.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[4px] px-2 py-2 text-[12.5px] text-rail-muted hover:bg-rail-2 hover:text-rail-ink">
          <ArrowSquareOut size={14} /> View storefront
        </a>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const notes = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = notes.filter((n) => !n.read).length;
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen((o) => !o)} className="relative grid size-9 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink">
        <Bell size={18} />
        {unread > 0 && <span className="num absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-[2px] bg-ink px-0.5 text-[9.5px] font-semibold text-surface">{unread}</span>}
      </button>
      {open && (
        <div className="anim-rise absolute right-0 top-11 z-30 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[6px] border border-line bg-surface shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-semibold">Notifications</span>
            <button type="button" className="text-[12px] text-muted underline underline-offset-2 hover:text-ink" onClick={markRead}>Mark all read</button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => { setOpen(false); navigate(n.href); }} className="flex w-full gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-surface-2">
                  <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-[1px]", n.read ? "bg-transparent" : "bg-ink")} />
                  <span className="flex-1">
                    <span className={cx("block text-[13px]", n.read ? "text-muted" : "text-ink")}>{n.text}</span>
                    <span className="text-[11.5px] text-faint">{ago(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const appointments = useStore((s) => s.appointments);
  const nav = useNav();

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pages = nav.flatMap((n) => (n.children ? n.children.map((c) => ({ label: `${n.label}: ${c.label}`, sub: "", to: c.to })) : [{ label: n.label, sub: "", to: n.to }]));
    if (!t) return pages.filter((p) => !p.to.includes("?")).slice(0, 10).map((p) => ({ ...p, group: "Go to" }));
    return [
      ...pages.filter((p) => p.label.toLowerCase().includes(t)).slice(0, 6).map((p) => ({ ...p, group: "Go to" })),
      ...orders.filter((o) => o.number.toLowerCase().includes(t)).slice(0, 5).map((o) => ({ label: o.number, sub: money(o.total), to: `/orders/${o.id}`, group: "Orders" })),
      ...appointments.filter((a) => a.ref.toLowerCase().includes(t) || a.clientName.toLowerCase().includes(t)).slice(0, 4).map((a) => ({ label: `${a.ref}, ${a.clientName}`, sub: a.atelier, to: `/appointments?a=${a.id}`, group: "Appointments" })),
      ...products.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)).slice(0, 5).map((p) => ({ label: p.name, sub: p.sku, to: `/catalog/products/${p.id}`, group: "Products" })),
      ...customers.filter((c) => c.name.toLowerCase().includes(t) || c.email.includes(t) || c.phone.replace(/\s/g, "").includes(t.replace(/\s/g, ""))).slice(0, 5).map((c) => ({ label: c.name, sub: c.city, to: `/customers?c=${c.id}`, group: "Customers" })),
    ];
  }, [q, nav, orders, products, customers, appointments]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { if (open) setQ(""); }, [open]);
  if (!open) return null;

  const go = (to: string) => { navigate(to); onClose(); };
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex justify-center px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <div className="anim-rise relative h-fit w-full max-w-xl overflow-hidden rounded-[6px] border border-line bg-surface shadow-float">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <MagnifyingGlass size={17} className="text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter" && results[active]) go(results[active].to);
            }}
            placeholder="Order no., client, appointment, product or page"
            aria-label="Search the admin"
            className="h-12 flex-1 bg-transparent text-[14px] placeholder:text-faint focus:outline-none"
          />
          <kbd className="hidden rounded-[3px] border border-line px-1.5 text-[11px] text-muted sm:inline">Esc</kbd>
        </div>
        <ul className="max-h-[56vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted">Nothing matches “{q}”.</li>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <li key={r.group + r.to + i}>
                {header && <div className="px-2.5 pb-1 pt-2.5 text-[11.5px] font-medium text-faint">{header}</div>}
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r.to)} className={cx("flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left text-[13px]", i === active ? "bg-sunken text-ink" : "text-ink-2")}>
                  <span className="truncate">{r.label}</span>
                  <span className="num ml-3 shrink-0 text-[12px] text-muted">{r.sub}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const forced = new URLSearchParams(location.search).get("theme");
    if (forced === "light" || forced === "dark") return forced;
    try {
      const saved = localStorage.getItem("rinaz-admin-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* storage unavailable */ }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("rinaz-admin-theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme] as const;
}

const mobileTabs: { label: string; to: string; icon: Icon }[] = [
  { label: "Today", to: "/", icon: House },
  { label: "Orders", to: "/orders", icon: Receipt },
  { label: "Salon", to: "/appointments", icon: CalendarBlank },
  { label: "Products", to: "/catalog/products", icon: Package },
];

export function Shell() {
  const [theme, setTheme] = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);
  const pushLiveOrder = useStore((s) => s.pushLiveOrder);
  const tickVisitors = useStore((s) => s.tickVisitors);
  const { pathname } = useLocation();
  const isActive = useIsActive();
  const mainRef = useRef<HTMLElement>(null);

  // Simulated realtime: a new order roughly every 45 s, visitor count drifts every 5 s.
  useEffect(() => {
    const a = setInterval(() => pushLiveOrder(), 45_000);
    const b = setInterval(() => tickVisitors(), 5_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [pushLiveOrder, tickVisitors]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="flex h-full">
      <aside className="hidden w-[244px] shrink-0 lg:block">
        <Sidebar />
      </aside>

      {mobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setMobileNav(false)} />
          <div className="anim-slide absolute inset-y-0 left-0 w-[284px] max-w-[86vw]">
            <button type="button" aria-label="Close menu" onClick={() => setMobileNav(false)} className="absolute right-2 top-4 z-10 grid size-10 place-items-center rounded-[4px] text-rail-muted hover:text-rail-ink"><X size={18} /></button>
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setMobileNav(true)} className="grid size-10 place-items-center rounded-[4px] text-ink lg:hidden"><List size={20} /></button>
          <Link to="/" className="display text-[17px] font-semibold tracking-[0.2em] lg:hidden">RINAZ</Link>
          <button type="button" onClick={() => setPalette(true)} className="ml-auto flex h-9 items-center gap-2 rounded-[4px] border border-line bg-surface-2 px-2.5 text-[13px] text-faint transition-colors hover:border-line-strong max-lg:size-10 max-lg:justify-center max-lg:border-transparent max-lg:bg-transparent max-lg:px-0 lg:ml-0 lg:w-full lg:max-w-sm" aria-label="Search">
            <MagnifyingGlass size={16} className="max-lg:text-ink" />
            <span className="hidden flex-1 text-left lg:inline">Search orders, clients, products</span>
            <kbd className="hidden rounded-[3px] border border-line bg-surface px-1.5 text-[11px] text-muted lg:inline">Ctrl K</kbd>
          </button>
          <span title="Orders, clients, payments and appointments are sample data until the backend is connected." className="hidden rounded-[3px] border border-dashed border-line-strong px-2 py-0.5 text-[11.5px] text-muted md:inline lg:ml-auto">Demo data</span>
          <div className="flex items-center gap-0.5 lg:ml-0">
            <button type="button" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="grid size-9 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationsMenu />
            <div className="mx-2 hidden h-5 w-px bg-line sm:block" />
            <Link to="/settings/team" className="hidden items-center gap-2 rounded-[4px] py-1 pl-1 pr-2 hover:bg-sunken sm:flex">
              <Avatar name="Rinaz Qadri" size={26} />
              <span className="text-[13px] font-medium">Rinaz</span>
            </Link>
            <button type="button" aria-label="Sign out" title="Sign out" className="hidden size-9 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink sm:grid"><SignOut size={17} /></button>
          </div>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div key={pathname} className="anim-rise mx-auto w-full max-w-[1360px] px-4 py-6 lg:px-8 lg:py-8">
            <ErrorBoundary><Outlet /></ErrorBoundary>
          </div>
        </main>
        <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rail-line bg-rail pb-[env(safe-area-inset-bottom)] lg:hidden">
          {mobileTabs.map((t) => {
            const on = t.to === "/" ? pathname === "/" : isActive(t.to, false);
            const I = t.icon;
            return (
              <Link key={t.to} to={t.to} aria-current={on ? "page" : undefined} className={cx("relative flex h-15 flex-col items-center justify-center gap-1 text-[11px]", on ? "text-rail-ink" : "text-rail-muted")}>
                {on && <span className="absolute inset-x-6 top-0 h-[2px] bg-gold" />}
                <I size={20} weight={on ? "fill" : "regular"} />
                {t.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMobileNav(true)} className="flex h-15 flex-col items-center justify-center gap-1 text-[11px] text-rail-muted">
            <DotsThreeOutline size={20} />
            More
          </button>
        </nav>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <Toasts />
    </div>
  );
}
