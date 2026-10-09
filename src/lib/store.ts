import { create } from "zustand";
import * as seed from "./seed";
import { money, setCurrency } from "./format";
import type {
  Admin, Appointment, AppointmentStatus, AtelierInfo, AuditEntry, Banner, Category, CmsPage, Collection, Coupon, Customer,
  Discount, Faq, HomeSection, MediaAsset, NavLink, Notification, Order, OrderStatus, Product, Promotion, Review, Role,
  StockMove, Transaction,
} from "./types";

export interface TaxRegion {
  id: string;
  region: string;
  rate: number;
  label: string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  logo: string;
  footerText: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  baseCurrency: string;
  displayCurrencies: string[];
  timezone: string;
  dailyRevenueTarget: number;
  monthlyRevenueTarget: number;
  /** Daily targets; monthly targets are these times the days in the month (rates stay as they are). */
  kpiTargets: { orders: number; aov: number; conversion: number; paid: number; newClients: number };
  taxInclusive: boolean;
  taxConfirmed: boolean;
  taxRegions: TaxRegion[];
  social: { instagram: string; tiktok: string; pinterest: string; youtube: string; whatsapp: string };
  gateway: { provider: string; mode: "live" | "test"; cards: boolean; applePay: boolean; paypal: boolean; bankTransfer: boolean; cod: boolean; codCountries: string };
  zones: { id: string; name: string; regions: string; standard: number; express: number | null; freeAbove: number | null; days: string; carrier: string }[];
  carriers: { name: string; enabled: boolean }[];
  notify: Record<string, { email: boolean; sms: boolean; whatsapp: boolean }>;
  sender: { fromName: string; fromEmail: string; replyTo: string; whatsappNumber: string };
  seo: { title: string; description: string; ogImage: string; robots: string };
}

export interface Toast {
  id: number;
  text: string;
  tone: "ok" | "bad" | "info";
}

interface State {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  customers: Customer[];
  orders: Order[];
  transactions: Transaction[];
  reviews: Review[];
  coupons: Coupon[];
  discounts: Discount[];
  promotions: Promotion[];
  banners: Banner[];
  stockMoves: StockMove[];
  media: MediaAsset[];
  homeSections: HomeSection[];
  navLinks: NavLink[];
  pages: CmsPage[];
  faqs: Faq[];
  notifications: Notification[];
  admins: Admin[];
  roles: Role[];
  audit: AuditEntry[];
  appointments: Appointment[];
  ateliers: AtelierInfo[];
  settings: StoreSettings;
  toasts: Toast[];
  liveVisitors: number;
  freshIds: string[];

  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  upsertProduct: (p: Product) => void;
  deleteProducts: (ids: string[]) => void;
  setProductStatus: (ids: string[], status: Product["status"]) => void;
  adjustStock: (productId: string, variantId: string, delta: number, reason: StockMove["reason"]) => void;
  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;
  upsertCollection: (c: Collection) => void;
  setOrderStatus: (ids: string[], status: OrderStatus, extra?: Partial<Order>) => void;
  addOrderNote: (id: string, note: string) => void;
  refund: (txnId: string, amount: number) => void;
  retryCapture: (txnId: string) => void;
  setCustomerStatus: (id: string, status: Customer["status"]) => void;
  updateCustomer: (c: Customer) => void;
  upsertCoupon: (c: Coupon) => void;
  deleteCoupon: (id: string) => void;
  upsertDiscount: (d: Discount) => void;
  deleteDiscount: (id: string) => void;
  upsertPromotion: (p: Promotion) => void;
  deletePromotion: (id: string) => void;
  upsertBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;
  setReviewStatus: (ids: string[], status: Review["status"]) => void;
  replyReview: (id: string, reply: string) => void;
  addMedia: (m: MediaAsset[]) => void;
  deleteMedia: (ids: string[]) => void;
  updateMedia: (m: MediaAsset) => void;
  setHomeSections: (s: HomeSection[]) => void;
  setNavLinks: (n: NavLink[]) => void;
  upsertPage: (p: CmsPage) => void;
  setFaqs: (f: Faq[]) => void;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  markNotificationsRead: () => void;
  upsertAdmin: (a: Admin) => void;
  upsertRole: (r: Role) => void;
  deleteRole: (id: string) => void;
  upsertAppointment: (a: Appointment) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAtelier: (a: AtelierInfo) => void;
  pushLiveOrder: () => Order | null;
  tickVisitors: () => void;
}

let toastId = 0;
const ME = "Rinaz (Owner)";
const upsert = <T extends { id: string }>(list: T[], item: T, front = false) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : front ? [item, ...list] : [...list, item];

export const useStore = create<State>((set, get) => ({
  products: seed.products,
  categories: seed.categories,
  collections: seed.collections,
  customers: seed.customers,
  orders: seed.orders,
  transactions: seed.transactions,
  reviews: seed.reviews,
  coupons: seed.coupons,
  discounts: seed.discounts,
  promotions: seed.promotions,
  banners: seed.banners,
  stockMoves: seed.stockMoves,
  media: seed.media,
  homeSections: seed.homeSections,
  navLinks: seed.navLinks,
  pages: seed.pages,
  faqs: seed.faqs,
  notifications: seed.notifications,
  admins: seed.admins,
  roles: seed.roles,
  audit: seed.audit,
  appointments: seed.appointments,
  ateliers: seed.ateliers,
  toasts: [],
  liveVisitors: 23,
  freshIds: [],
  settings: {
    name: "RINAZ STUDIO",
    tagline: "Haute Abayas, Fine Jewelry & Pakistani Couture",
    logo: "",
    footerText: "Handcrafted couture Abayas, certified 18K solid gold fine jewelry, and bespoke Pakistani bridal couture crafted for the modern you.",
    legalName: "RINAZ STUDIO",
    email: "concierge@rinazstudio.com",
    phone: "+44 20 7946 0321",
    address: "Knightsbridge, London SW1X",
    baseCurrency: "USD",
    displayCurrencies: ["USD", "GBP", "AED", "QAR", "PKR"],
    timezone: "Europe/London",
    dailyRevenueTarget: 5000,
    monthlyRevenueTarget: 140000,
    kpiTargets: { orders: 4, aov: 1800, conversion: 2.5, paid: 4, newClients: 2 },
    taxInclusive: true,
    taxConfirmed: false,
    taxRegions: [
      { id: "tx1", region: "United Kingdom", rate: 20, label: "VAT" },
      { id: "tx2", region: "United Arab Emirates", rate: 5, label: "VAT" },
      { id: "tx3", region: "Saudi Arabia", rate: 15, label: "VAT" },
      { id: "tx4", region: "Qatar", rate: 0, label: "No VAT" },
      { id: "tx5", region: "Pakistan", rate: 18, label: "Sales tax" },
      { id: "tx6", region: "Rest of world", rate: 0, label: "Duties paid by customer" },
    ],
    social: { instagram: "rinazstudio", tiktok: "rinazstudio", pinterest: "rinazstudio", youtube: "", whatsapp: "+44 7700 900 321" },
    gateway: { provider: "", mode: "test", cards: true, applePay: true, paypal: true, bankTransfer: true, cod: true, codCountries: "Pakistan" },
    zones: [
      { id: "z1", name: "United Kingdom", regions: "England, Scotland, Wales, Northern Ireland", standard: 0, express: 25, freeAbove: 400, days: "1-2", carrier: "Royal Mail Special Delivery" },
      { id: "z2", name: "Gulf (GCC)", regions: "UAE, Qatar, Saudi Arabia, Kuwait, Bahrain, Oman", standard: 35, express: 45, freeAbove: 400, days: "2-3", carrier: "DHL Express" },
      { id: "z3", name: "Pakistan", regions: "All cities", standard: 15, express: 25, freeAbove: 400, days: "2-4", carrier: "TCS" },
      { id: "z4", name: "North America", regions: "United States, Canada", standard: 35, express: 55, freeAbove: 400, days: "2-3", carrier: "DHL Express" },
      { id: "z5", name: "Rest of world", regions: "All other DHL destinations", standard: 45, express: 65, freeAbove: 400, days: "3-5", carrier: "DHL Express" },
    ],
    carriers: [
      { name: "DHL Express", enabled: true },
      { name: "Royal Mail Special Delivery", enabled: true },
      { name: "TCS", enabled: true },
      { name: "Aramex", enabled: false },
    ],
    notify: {
      "Order placed": { email: true, sms: false, whatsapp: true },
      "Order shipped": { email: true, sms: true, whatsapp: true },
      "Order delivered": { email: true, sms: false, whatsapp: true },
      "Payment failed": { email: true, sms: false, whatsapp: true },
      "Refund issued": { email: true, sms: false, whatsapp: false },
      "Appointment confirmed": { email: true, sms: true, whatsapp: true },
      "Appointment reminder (24 h)": { email: true, sms: false, whatsapp: true },
      "Abandoned cart": { email: true, sms: false, whatsapp: false },
      "Low stock (to staff)": { email: true, sms: false, whatsapp: false },
    },
    sender: { fromName: "RINAZ STUDIO", fromEmail: "concierge@rinazstudio.com", replyTo: "concierge@rinazstudio.com", whatsappNumber: "+44 7700 900 321" },
    seo: { title: "RINAZ STUDIO: Haute Abayas, Fine Jewelry & Pakistani Couture", description: "Handcrafted luxury Abayas, certified 18K solid gold jewelry, and bespoke Pakistani bridal couture created for modern poise.", ogImage: seed.unsplash("photo-1724412665971-114bd351a42d", 1200), robots: "index, follow" },
  },

  toast: (text, tone = "ok") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
    setTimeout(() => get().dismissToast(id), 3400);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  upsertProduct: (p) => set((s) => ({ products: upsert(s.products, { ...p, updatedAt: Date.now() }, true) })),
  deleteProducts: (ids) => set((s) => ({ products: s.products.filter((p) => !ids.includes(p.id)) })),
  setProductStatus: (ids, status) => set((s) => ({ products: s.products.map((p) => (ids.includes(p.id) ? { ...p, status } : p)) })),
  adjustStock: (productId, variantId, delta, reason) =>
    set((s) => {
      const p = s.products.find((x) => x.id === productId);
      const v = p?.variants.find((x) => x.id === variantId);
      if (!p || !v) return {};
      const after = Math.max(0, v.stock + delta);
      return {
        products: s.products.map((x) => (x.id === productId ? { ...x, variants: x.variants.map((vv) => (vv.id === variantId ? { ...vv, stock: after } : vv)) } : x)),
        stockMoves: [{ id: `mv_${Date.now()}`, productId, variantId, delta, reason, by: ME, at: Date.now(), after }, ...s.stockMoves],
      };
    }),

  upsertCategory: (c) => set((s) => ({ categories: upsert(s.categories, c) })),
  deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id && c.parentId !== id) })),
  moveCategory: (id, dir) =>
    set((s) => {
      const c = s.categories.find((x) => x.id === id)!;
      const siblings = s.categories.filter((x) => x.parentId === c.parentId).sort((a, b) => a.order - b.order);
      const swap = siblings[siblings.findIndex((x) => x.id === id) + dir];
      if (!swap) return {};
      return { categories: s.categories.map((x) => (x.id === c.id ? { ...x, order: swap.order } : x.id === swap.id ? { ...x, order: c.order } : x)) };
    }),
  upsertCollection: (c) => set((s) => ({ collections: upsert(s.collections, c) })),

  setOrderStatus: (ids, status, extra) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (!ids.includes(o.id)) return o;
        const label = { pending: "Moved back to pending", processing: "Confirmed and sent to packing", shipped: `Shipped${extra?.carrier ? ` with ${extra.carrier}` : ""}, insured`, delivered: "Marked as delivered", cancelled: "Order cancelled", refunded: "Refund issued" }[status];
        return { ...o, ...extra, status, timeline: [...o.timeline, { at: Date.now(), label, by: ME }] };
      }),
    })),
  addOrderNote: (id, note) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, note, timeline: [...o.timeline, { at: Date.now(), label: "Internal note updated", by: ME }] } : o)) })),

  refund: (txnId, amount) =>
    set((s) => {
      const t = s.transactions.find((x) => x.id === txnId);
      if (!t) return {};
      const refunded = Math.min(t.amount, t.refunded + amount);
      const full = refunded >= t.amount;
      return {
        transactions: s.transactions.map((x) => (x.id === txnId ? { ...x, refunded, status: full ? "refunded" : "partial_refund" } : x)),
        orders: s.orders.map((o) =>
          o.id === t.orderId
            ? { ...o, paymentStatus: full ? "refunded" : "partially_refunded", status: full ? "refunded" : o.status, timeline: [...o.timeline, { at: Date.now(), label: `${full ? "Refund" : "Partial refund"} of ${money(amount)} issued`, by: ME }] }
            : o,
        ),
      };
    }),
  retryCapture: (txnId) =>
    set((s) => ({
      transactions: s.transactions.map((x) => (x.id === txnId ? { ...x, status: "captured", failureReason: null } : x)),
      orders: s.orders.map((o) => (s.transactions.find((t) => t.id === txnId)?.orderId === o.id ? { ...o, paymentStatus: "paid" } : o)),
    })),

  setCustomerStatus: (id, status) => set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, status } : c)) })),
  updateCustomer: (c) => set((s) => ({ customers: upsert(s.customers, c) })),
  upsertCoupon: (c) => set((s) => ({ coupons: upsert(s.coupons, c, true) })),
  deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),
  upsertDiscount: (d) => set((s) => ({ discounts: upsert(s.discounts, d, true) })),
  deleteDiscount: (id) => set((s) => ({ discounts: s.discounts.filter((d) => d.id !== id) })),
  upsertPromotion: (p) => set((s) => ({ promotions: upsert(s.promotions, p, true) })),
  deletePromotion: (id) => set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) })),
  upsertBanner: (b) => set((s) => ({ banners: upsert(s.banners, b) })),
  deleteBanner: (id) => set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),
  setReviewStatus: (ids, status) => set((s) => ({ reviews: s.reviews.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) })),
  replyReview: (id, reply) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply: reply || null } : r)) })),
  addMedia: (m) => set((s) => ({ media: [...m, ...s.media] })),
  deleteMedia: (ids) => set((s) => ({ media: s.media.filter((m) => !ids.includes(m.id)) })),
  updateMedia: (m) => set((s) => ({ media: s.media.map((x) => (x.id === m.id ? m : x)) })),
  setHomeSections: (homeSections) => set({ homeSections }),
  setNavLinks: (navLinks) => set({ navLinks }),
  upsertPage: (p) => set((s) => ({ pages: upsert(s.pages, { ...p, updatedAt: Date.now() }, true) })),
  setFaqs: (faqs) => set({ faqs }),
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    if (patch.baseCurrency) setCurrency(patch.baseCurrency);
  },
  markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  upsertAdmin: (a) => set((s) => ({ admins: upsert(s.admins, a) })),
  upsertRole: (r) => set((s) => ({ roles: upsert(s.roles, r) })),
  deleteRole: (id) => set((s) => ({ roles: s.roles.filter((r) => r.id !== id), admins: s.admins.map((a) => (a.role === id ? { ...a, role: "role_ops" } : a)) })),
  upsertAppointment: (a) => set((s) => ({ appointments: upsert(s.appointments, a).sort((x, y) => x.start - y.start) })),
  setAppointmentStatus: (id, status) => set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)) })),
  updateAtelier: (a) => set((s) => ({ ateliers: s.ateliers.map((x) => (x.name === a.name ? a : x)) })),

  // Simulates the realtime feed a websocket or SSE stream would provide in production.
  pushLiveOrder: () => {
    const s = get();
    const sellable = s.products.filter((p) => p.status === "active" && p.variants.some((v) => v.stock > 0));
    if (!sellable.length) return null;
    const p = sellable[Math.floor(Math.random() * sellable.length)];
    const inStock = p.variants.filter((v) => v.stock > 0);
    const v = inStock[Math.floor(Math.random() * inStock.length)];
    const c = s.customers[Math.floor(Math.random() * s.customers.length)];
    const price = v.price ?? p.price;
    const methods = ["Card", "Card", "Apple Pay", "PayPal"] as const;
    const method = methods[Math.floor(Math.random() * methods.length)];
    const failed = Math.random() < 0.1;
    const num = Math.max(...s.orders.map((o) => Number(o.number.slice(3)))) + 1;
    const now = Date.now();
    const order: Order = {
      id: `ord_live_${num}`, number: `RZ-${num}`, customerId: c.id,
      items: [{ productId: p.id, variantId: v.id, name: p.name, sku: v.sku, variant: v.options.join(" / "), qty: 1, price, image: p.image }],
      subtotal: price, discount: 0, coupon: null, shipping: 0, tax: 0, total: price, status: "pending", paymentStatus: failed ? "failed" : "paid",
      paymentMethod: method, createdAt: now, address: c.addresses[0], carrier: null, tracking: null, shippingMethod: "Standard, insured", giftBox: true,
      timeline: [{ at: now, label: "Order placed", by: "Customer" }, { at: now, label: failed ? "Payment failed" : `Payment captured (${method})`, by: "Gateway" }], note: "",
    };
    const txn: Transaction = {
      id: `txn_live_${num}`, orderId: order.id, orderNumber: order.number, customerId: c.id, amount: price, refunded: 0, method, gateway: "Demo gateway",
      status: failed ? "failed" : "captured", gatewayRef: `txn_${Math.random().toString(36).slice(2, 16)}`, createdAt: now, failureReason: failed ? "Card declined by issuer" : null,
      gatewayResponse: { object: "payment", amount: price * 100, currency: "usd", status: failed ? "failed" : "succeeded", payment_method: method.toLowerCase().replace(/ /g, "_") },
    };
    set((st) => ({
      orders: [order, ...st.orders],
      transactions: [txn, ...st.transactions],
      freshIds: [order.id, ...st.freshIds].slice(0, 6),
      products: st.products.map((x) => (x.id === p.id ? { ...x, sold30d: x.sold30d + 1, variants: x.variants.map((vv) => (vv.id === v.id ? { ...vv, stock: Math.max(0, vv.stock - 1) } : vv)) } : x)),
      notifications: [{ id: `nt_${num}`, kind: (failed ? "payment" : "order") as Notification["kind"], text: failed ? `Payment failed on ${order.number}` : `New order ${order.number}, ${p.name}`, at: now, read: false, href: `/orders/${order.id}` }, ...st.notifications].slice(0, 20),
    }));
    return order;
  },
  tickVisitors: () => set((s) => ({ liveVisitors: Math.max(6, Math.min(60, s.liveVisitors + Math.round((Math.random() - 0.48) * 4))) })),
}));
