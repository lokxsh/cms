export type ProductStatus = "active" | "draft" | "archived";
export type ProductLine = "abaya" | "jewelry" | "couture";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "partially_refunded";
export type PaymentMethod = "Card" | "Apple Pay" | "PayPal" | "Bank transfer" | "Cash on delivery";
export type TxnStatus = "captured" | "pending" | "failed" | "refunded" | "partial_refund";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type Atelier = "London" | "Dubai" | "Doha" | "Lahore";

export interface VariantOption {
  name: string;
  values: string[];
}

/** One sellable combination, e.g. Size M / Blush. Price null means the product price applies. */
export interface Variant {
  id: string;
  options: string[];
  sku: string;
  price: number | null;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  line: ProductLine;
  categoryId: string;
  collections: string[];
  price: number;
  salePrice: number | null;
  cost: number;
  lowStockAt: number;
  status: ProductStatus;
  image: string;
  gallery: string[];
  options: VariantOption[];
  variants: Variant[];
  description: string;
  details: Record<string, string>;
  tags: string[];
  madeToOrder: boolean;
  leadTimeDays: number;
  sold30d: number;
  revenue30d: number;
  rating: number;
  reviewCount: number;
  weightGrams: number;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  visible: boolean;
  order: number;
  image: string;
  description: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  visible: boolean;
}

export interface Address {
  label: string;
  line1: string;
  city: string;
  region: string;
  country: string;
  postcode: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  joinedAt: number;
  status: "active" | "blocked";
  marketing: boolean;
  privateClient: boolean;
  addresses: Address[];
  measurements: Record<string, string>;
  note: string;
}

export interface OrderItem {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  variant: string;
  qty: number;
  price: number;
  image: string;
}

export interface TimelineEvent {
  at: number;
  label: string;
  by: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  coupon: string | null;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: number;
  address: Address;
  carrier: string | null;
  tracking: string | null;
  shippingMethod: string;
  giftBox: boolean;
  timeline: TimelineEvent[];
  note: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  amount: number;
  refunded: number;
  method: PaymentMethod;
  gateway: string;
  status: TxnStatus;
  gatewayRef: string;
  createdAt: number;
  failureReason: string | null;
  gatewayResponse: Record<string, string | number | null>;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: number;
  status: ReviewStatus;
  reply: string | null;
  verified: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minOrder: number;
  usageLimit: number | null;
  perCustomer: number;
  used: number;
  startsAt: number;
  expiresAt: number | null;
  active: boolean;
  appliesTo: "all" | "categories" | "products";
  targetIds: string[];
}

/** Automatic price rule, applied without a code. */
export interface Discount {
  id: string;
  name: string;
  kind: "percent_off" | "amount_off" | "buy_x_get_y" | "free_gift";
  value: number;
  buyQty: number;
  getQty: number;
  gift: string;
  minSpend: number;
  appliesTo: "all" | "categories" | "collections" | "products";
  targetIds: string[];
  startsAt: number;
  endsAt: number | null;
  active: boolean;
  timesApplied: number;
}

/** A campaign: dates, the banner that announces it, the offer behind it, and where it is sent. */
export interface Promotion {
  id: string;
  name: string;
  summary: string;
  startsAt: number;
  endsAt: number;
  collectionId: string | null;
  bannerId: string | null;
  offer: { kind: "coupon" | "discount" | "none"; id: string | null };
  channels: ("storefront" | "email" | "whatsapp" | "sms")[];
  status: "draft" | "scheduled" | "live" | "ended";
  revenue: number;
  orders: number;
}

export interface Banner {
  id: string;
  placement: "hero" | "announcement" | "collection" | "popup";
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  secondaryLabel: string;
  secondaryLink: string;
  image: string;
  startsAt: number | null;
  endsAt: number | null;
  active: boolean;
  order: number;
}

export interface StockMove {
  id: string;
  productId: string;
  variantId: string | null;
  delta: number;
  reason: "sale" | "restock" | "return" | "correction" | "damaged";
  by: string;
  at: number;
  after: number;
}

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  sizeKb: number;
  width: number;
  height: number;
  folder: "products" | "banners" | "homepage" | "categories" | "promotions" | "misc";
  usedIn: number;
  uploadedAt: number;
  alt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  atelier: Atelier | "All";
  lastActive: number;
  status: "active" | "invited" | "suspended";
  twoFactor: boolean;
}

export type Permission = "view" | "edit" | "delete";

export interface Role {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  permissions: Record<string, Permission[]>;
}

export interface AuditEntry {
  id: string;
  adminId: string;
  action: string;
  target: string;
  at: number;
  ip: string;
}

export type SectionType = "hero_slider" | "collection_tiles" | "capsule" | "service_promises" | "curated_look" | "brand_story" | "salon_cta" | "locations" | "newsletter" | "product_row";

export interface HomeSection {
  id: string;
  type: SectionType;
  label: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  updatedAt: number;
  body: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Faq {
  id: string;
  group: string;
  q: string;
  a: string;
  visible: boolean;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
}

export interface Notification {
  id: string;
  kind: "order" | "payment" | "stock" | "review" | "appointment";
  text: string;
  at: number;
  read: boolean;
  href: string;
}

export type AppointmentType = "Bridal consultation" | "Fine jewelry viewing" | "Custom measurements" | "Fitting" | "Styling session";
export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  ref: string;
  customerId: string | null;
  clientName: string;
  email: string;
  phone: string;
  atelier: Atelier;
  type: AppointmentType;
  start: number;
  durationMin: number;
  stylist: string;
  status: AppointmentStatus;
  eventDate: number | null;
  notes: string;
  measurements: Record<string, string>;
  createdAt: number;
  source: "website" | "phone" | "walk-in" | "whatsapp";
}

export interface AtelierInfo {
  name: Atelier;
  label: string;
  address: string;
  timezone: string;
  opens: number;
  closes: number;
  stylists: string[];
  phone: string;
}
