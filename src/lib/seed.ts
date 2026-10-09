import type {
  Admin, Appointment, AppointmentStatus, AppointmentType, AtelierInfo, AuditEntry, Banner, Category, CmsPage,
  Collection, Coupon, Customer, Discount, Faq, HomeSection, MediaAsset, NavLink, Notification, Order, OrderItem,
  OrderStatus, PaymentMethod, PaymentStatus, Product, Promotion, Review, Role, StockMove, TimelineEvent, Transaction,
  Variant,
} from "./types";

/*
  Catalog content (names, prices, descriptions, photography) mirrors the live RINAZ storefront.
  Everything operational (customers, orders, payments, appointments, reviews) is placeholder data
  so the screens can be exercised. Replace it with the real API.
*/

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(90417);
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const weighted = <T,>(pairs: [T, number][]): T => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const unsplash = (id: string, w = 900) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ---------- Ateliers ----------
export const ateliers: AtelierInfo[] = [
  { name: "London", label: "Knightsbridge & Bond Street", address: "Knightsbridge, London SW1X", timezone: "Europe/London", opens: 10, closes: 19, stylists: ["Amira Haddad", "Sofia Rahman"], phone: "+44 20 7946 0321" },
  { name: "Dubai", label: "Fashion Avenue & D3", address: "Fashion Avenue, Dubai Mall, Dubai", timezone: "Asia/Dubai", opens: 11, closes: 21, stylists: ["Layla Al Mansoori", "Noor Siddiqui"], phone: "+971 4 555 0188" },
  { name: "Doha", label: "Private Suite", address: "West Bay, Doha (by appointment)", timezone: "Asia/Qatar", opens: 12, closes: 20, stylists: ["Mariam Al Thani"], phone: "+974 4400 7712" },
  { name: "Lahore", label: "Gulberg Atelier", address: "MM Alam Road, Gulberg III, Lahore", timezone: "Asia/Karachi", opens: 11, closes: 20, stylists: ["Rinaz Qadri", "Hira Butt", "Zainab Malik"], phone: "+92 42 3577 1190" },
];

// ---------- Categories & collections ----------
const catDefs: [string, string | null, string, string][] = [
  ["Haute Abayas", null, "Pure silk and crepe abayas with champagne gold needlework.", "photo-1724412665971-114bd351a42d"],
  ["Open Abayas", "Haute Abayas", "Open-front silhouettes with matching slip and hijab.", "photo-1760083545495-b297b1690672"],
  ["Evening Abayas", "Haute Abayas", "Zardozi and zari embroidered evening abayas.", "photo-1772474542630-5f5822ca8421"],
  ["18K Fine Jewelry", null, "Hallmarked 18K solid gold, certified diamonds and South Sea pearls.", "photo-1773832190768-b4c4667ceeb4"],
  ["Pendants", "18K Fine Jewelry", "Diamond and gold pendants.", "photo-1771515411694-57fb626159d1"],
  ["Necklaces & Chokers", "18K Fine Jewelry", "Pearl and gold necklaces.", "photo-1654699991520-aaaf4dd2608b"],
  ["Pakistani Couture", null, "Heirloom bridal anarkalis, peshwas and formal pret.", "photo-1747847471517-952a3eb93a89"],
  ["Bridal Anarkalis", "Pakistani Couture", "Hand-embroidered bridal anarkali ensembles.", "photo-1733470324488-d0e10d014d80"],
  ["Formal Peshwas", "Pakistani Couture", "Raw silk peshwas with resham and gota work.", "photo-1733470381571-c3d082e68457"],
];
export const categories: Category[] = (() => {
  const out: Category[] = [];
  catDefs.forEach(([name, parent, description, photo], i) => {
    out.push({
      id: `cat_${i + 1}`, name, slug: slugify(name.replace("18K ", "")), parentId: parent ? out.find((c) => c.name === parent)!.id : null,
      visible: true, order: i, image: unsplash(photo, 600), description,
    });
  });
  return out;
})();
const catId = (name: string) => categories.find((c) => c.name === name)!.id;

export const collections: Collection[] = [
  { id: "col_new", name: "New In", slug: "new-in", description: "The latest arrivals from the studio.", visible: true },
  { id: "col_bridal", name: "Bridal Pret", slug: "bridal-pret", description: "Ready-to-wear bridal and wedding-guest couture.", visible: true },
  { id: "col_noir", name: "Evening Noir", slug: "evening-noir", description: "Monochrome reception silhouettes.", visible: true },
  { id: "col_golden", name: "The Golden Hour", slug: "golden-hour", description: "Double-faced georgette silk and metallic gold zardozi for intimate ceremonies.", visible: true },
];

// ---------- Products (from the live storefront) ----------
interface ProductDef {
  name: string; cat: string; line: Product["line"]; price: number; description: string; photos: [string, string];
  collections: string[]; details: Record<string, string>; options: { name: string; values: string[] }[]; madeToOrder: boolean; lead: number;
}
const productDefs: ProductDef[] = [
  {
    name: "Blush Silk Embroidered Open Abaya", cat: "Open Abayas", line: "abaya", price: 680,
    description: "Crafted from premium Korean silk crepe, this open abaya features delicate champagne gold needlework along the lapels and sleeves, styled with a matching tonal slip and chiffon hijab.",
    photos: ["photo-1760083545495-b297b1690672", "photo-1736342182642-e2042084f47c"], collections: ["col_new", "col_golden"],
    details: { Fabric: "Korean silk crepe", Embroidery: "Champagne gold needlework", Includes: "Tonal slip, chiffon hijab", Care: "Dry clean only" },
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }, { name: "Length", values: ['54"', '56"', '58"'] }], madeToOrder: false, lead: 0,
  },
  {
    name: "Nocturne Charcoal Zardozi Evening Abaya", cat: "Evening Abayas", line: "abaya", price: 740,
    description: "Timeless modest elegance in rich deep charcoal. Accented with intricate hand-embroidered sleeve medallions in antique champagne gold zari with a tie sash and matching Sheila.",
    photos: ["photo-1772474542630-5f5822ca8421", "photo-1772474528936-4f1187eb1611"], collections: ["col_noir"],
    details: { Fabric: "Deep charcoal crepe", Embroidery: "Antique champagne gold zari medallions", Includes: "Tie sash, matching Sheila", Care: "Dry clean only" },
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }, { name: "Length", values: ['54"', '56"', '58"'] }], madeToOrder: false, lead: 0,
  },
  {
    name: "The Gilded Teardrop Diamond Pendant", cat: "Pendants", line: "jewelry", price: 1450,
    description: "A radiant statement of modern grace. Designed in 18K solid champagne gold featuring a center pear-cut diamond surrounded by a double halo of brilliant pavé diamonds.",
    photos: ["photo-1773832190768-b4c4667ceeb4", "photo-1771515411694-57fb626159d1"], collections: ["col_new"],
    details: { Metal: "18K solid champagne gold", Hallmark: "750", Stones: "Pear-cut centre diamond, double pavé halo", Certificate: "Gemological valuation included" },
    options: [{ name: "Chain", values: ['16"', '18"'] }], madeToOrder: false, lead: 0,
  },
  {
    name: "Graceful Adornment Pearl & Gold Choker", cat: "Necklaces & Chokers", line: "jewelry", price: 980,
    description: "Lustrous hand-selected cultured South Sea pearls strung with silk knotting and finished with an architectural 18K gold clasp embossed with the RINAZ monogram.",
    photos: ["photo-1654699991520-aaaf4dd2608b", "photo-1515562141207-7a88fb7ce338"], collections: ["col_golden"],
    details: { Metal: "18K gold clasp, RINAZ monogram", Hallmark: "750", Stones: "Cultured South Sea pearls, silk knotted", Certificate: "Pearl grading report included" },
    options: [{ name: "Length", values: ['14"', '15"', '16"'] }], madeToOrder: false, lead: 0,
  },
  {
    name: "Ivory & Gold Hand-Embroidered Anarkali Ensemble", cat: "Bridal Anarkalis", line: "couture", price: 1850,
    description: "An ethereal traditional silhouette reinterpreted with contemporary poise. Features 16 kalis of pure 80g raw silk intricately hand-worked with pearls, crystal beads, and gold dabka.",
    photos: ["photo-1747847471517-952a3eb93a89", "photo-1733470324488-d0e10d014d80"], collections: ["col_new", "col_bridal", "col_golden"],
    details: { Fabric: "80g pure raw silk, 16 kalis", Work: "Pearls, crystal beads, gold dabka", Includes: "Anarkali, churidar, dupatta", Care: "Dry clean only" },
    options: [{ name: "Size", values: ["XS", "S", "M", "L", "Made to measure"] }], madeToOrder: true, lead: 28,
  },
  {
    name: "Rose Quartz Raw Silk Formal Peshwas", cat: "Formal Peshwas", line: "couture", price: 1620,
    description: "A fairytale silhouette blending soft blush pink hues with intricate resham thread embroidery and hand-cut gota motifs. The flared hem glides effortlessly.",
    photos: ["photo-1733470381571-c3d082e68457", "photo-1705920824583-0e783235394d"], collections: ["col_bridal"],
    details: { Fabric: "Raw silk", Work: "Resham thread, hand-cut gota", Includes: "Peshwas, trouser, dupatta", Care: "Dry clean only" },
    options: [{ name: "Size", values: ["XS", "S", "M", "L", "Made to measure"] }], madeToOrder: true, lead: 21,
  },
];

const combos = (opts: { values: string[] }[]) => opts.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);

export const products: Product[] = productDefs.map((d, i) => {
  const prefix = { abaya: "AB", jewelry: "FJ", couture: "PC" }[d.line];
  const base = `RZ-${prefix}-${String(101 + i * 4)}`;
  const variants: Variant[] = combos(d.options).map((opts, j) => {
    const mtm = opts.includes("Made to measure");
    const stock = mtm ? 0 : d.line === "jewelry" ? weighted([[0, 1], [int(1, 2), 3], [int(3, 5), 2]]) : weighted([[0, 2], [int(1, 2), 4], [int(3, 7), 4]]);
    return {
      id: `${base}-${j}`, options: opts, sku: `${base}-${opts.map((o) => o.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()).join("-")}`,
      price: mtm ? d.price + 250 : d.line === "jewelry" && opts[0] === '18"' ? d.price + 60 : null, stock,
    };
  });
  const sold30d = int(4, 22);
  return {
    id: `prd_${i + 1}`, name: d.name, sku: base, line: d.line, categoryId: catId(d.cat), collections: d.collections, price: d.price,
    salePrice: null, cost: Math.round(d.price * (d.line === "jewelry" ? 0.55 : 0.34)), lowStockAt: d.line === "jewelry" ? 3 : 5,
    status: "active", image: unsplash(d.photos[0]), gallery: [unsplash(d.photos[1])], options: d.options, variants, description: d.description,
    details: d.details, tags: [d.line === "jewelry" ? "fine jewelry" : d.line === "abaya" ? "abaya" : "couture", ...(d.collections.includes("col_bridal") ? ["bridal"] : [])],
    madeToOrder: d.madeToOrder, leadTimeDays: d.lead, sold30d, revenue30d: sold30d * d.price, rating: Math.round((4.4 + rnd() * 0.6) * 10) / 10,
    reviewCount: int(6, 40), weightGrams: d.line === "jewelry" ? int(8, 40) : int(700, 1800), seoTitle: `${d.name} | RINAZ STUDIO`,
    seoDescription: d.description.slice(0, 155), slug: slugify(d.name), updatedAt: NOW - int(1, 20) * DAY,
  };
});
export const productStock = (p: Pick<Product, "variants">) => p.variants.reduce((s, v) => s + v.stock, 0);
export const isMto = (options: string[]) => options.includes("Made to measure");

// ---------- Customers ----------
const people: [string, string, string, string][] = [
  ["Aisha Rahman", "London", "United Kingdom", "+44 7700 900"], ["Fatima Al Suwaidi", "Dubai", "United Arab Emirates", "+971 50 1"],
  ["Mariam Qureshi", "Lahore", "Pakistan", "+92 300 4"], ["Noor Al Kuwari", "Doha", "Qatar", "+974 5512 "],
  ["Hana Siddiqui", "Toronto", "Canada", "+1 416 555 0"], ["Zara Chaudhry", "Birmingham", "United Kingdom", "+44 7700 901"],
  ["Sara Al Hashimi", "Abu Dhabi", "United Arab Emirates", "+971 55 2"], ["Amna Sheikh", "Karachi", "Pakistan", "+92 321 2"],
  ["Leena Haddad", "Riyadh", "Saudi Arabia", "+966 55 3"], ["Yasmin Patel", "Manchester", "United Kingdom", "+44 7700 902"],
  ["Rania Khalil", "New York", "United States", "+1 212 555 0"], ["Iman Farooq", "Islamabad", "Pakistan", "+92 333 5"],
  ["Dana Al Thani", "Doha", "Qatar", "+974 6611 "], ["Sumaya Begum", "London", "United Kingdom", "+44 7700 903"],
  ["Khadija Malik", "Houston", "United States", "+1 713 555 0"], ["Lubna Al Falasi", "Dubai", "United Arab Emirates", "+971 52 7"],
  ["Ayesha Javed", "Lahore", "Pakistan", "+92 300 8"], ["Nadia Hussain", "Leicester", "United Kingdom", "+44 7700 904"],
  ["Reem Al Otaibi", "Kuwait City", "Kuwait", "+965 6600 "], ["Hafsa Ahmed", "Sydney", "Australia", "+61 412 555 "],
  ["Mehwish Iqbal", "Lahore", "Pakistan", "+92 322 6"], ["Salma Bakr", "Jeddah", "Saudi Arabia", "+966 50 4"],
  ["Inaya Kapadia", "Dubai", "United Arab Emirates", "+971 56 3"], ["Samira Osman", "London", "United Kingdom", "+44 7700 905"],
  ["Alia Rashid", "Chicago", "United States", "+1 312 555 0"], ["Maha Al Sulaiti", "Doha", "Qatar", "+974 3300 "],
  ["Sana Mirza", "Karachi", "Pakistan", "+92 345 1"], ["Huda Nasser", "Manama", "Bahrain", "+973 3600 "],
  ["Farah Latif", "Glasgow", "United Kingdom", "+44 7700 906"], ["Shiza Tariq", "Lahore", "Pakistan", "+92 301 9"],
  ["Abeer Al Mazrouei", "Abu Dhabi", "United Arab Emirates", "+971 50 9"], ["Mahnoor Aslam", "Toronto", "Canada", "+1 647 555 0"],
  ["Rukhsar Ali", "Bradford", "United Kingdom", "+44 7700 907"], ["Jumana Saleh", "Muscat", "Oman", "+968 9100 "],
  ["Eman Butt", "Lahore", "Pakistan", "+92 302 3"], ["Tasneem Khan", "London", "United Kingdom", "+44 7700 908"],
];
export const customers: Customer[] = people.map(([name, city, country, phonePrefix], i) => {
  const phone = `${phonePrefix}${int(100, 999)} ${int(100, 999)}`.replace(/\s+/g, " ");
  const email = `${name.toLowerCase().replace(/[^a-z ]/g, "").replace(" ", ".")}${rnd() < 0.3 ? int(2, 91) : ""}@${pick(["gmail.com", "icloud.com", "outlook.com", "yahoo.com"])}`;
  const bride = rnd() < 0.35;
  return {
    id: `cus_${i + 1}`, name, email, phone, city, country,
    joinedAt: NOW - (i < 3 ? int(2, 20) * HOUR : int(2, 400) * DAY), status: rnd() < 0.03 ? "blocked" : "active",
    marketing: rnd() < 0.7, privateClient: rnd() < 0.3,
    addresses: [{ label: "Home", line1: `${int(2, 180)} ${pick(["Cadogan Square", "Al Wasl Road", "Main Boulevard", "Pearl Qatar Tower 4", "King Street", "Jumeirah Bay Villa", "Park Lane", "DHA Phase 5"])}`, city, region: city, country, postcode: country === "United Kingdom" ? `SW${int(1, 20)} ${int(1, 9)}AB` : String(int(10000, 99999)), phone }],
    measurements: (bride ? { Bust: `${int(32, 40)} in`, Waist: `${int(26, 34)} in`, Hips: `${int(36, 44)} in`, Height: `${int(5, 5)} ft ${int(1, 9)} in`, "Shoulder to hem": `${int(54, 58)} in` } : {}) as Record<string, string>,
    note: bride ? `Wedding planned for ${new Date(NOW + int(30, 200) * DAY).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.` : "",
  };
});

// ---------- Orders & transactions ----------
const methodsFor = (country: string): [PaymentMethod, number][] => country === "Pakistan"
  ? [["Card", 4], ["Bank transfer", 3], ["Cash on delivery", 3]]
  : [["Card", 6], ["Apple Pay", 3], ["PayPal", 1], ["Bank transfer", 0.5]];
const vatFor = (country: string) => ({ "United Kingdom": 20, "United Arab Emirates": 5, "Saudi Arabia": 15, Bahrain: 10, Oman: 5, Pakistan: 18 } as Record<string, number>)[country] ?? 0;
const failReasons = ["Card declined by issuer", "3-D Secure authentication failed", "Insufficient funds", "Payment cancelled by customer", "Gateway timeout"];

export const orders: Order[] = [];
export const transactions: Transaction[] = [];
const ORDER_COUNT = 190;
for (let i = 0; i < ORDER_COUNT; i++) {
  const age = i < 5 ? int(10, 13 * 60) * MIN : i < 150 ? int(1, 45) * DAY + int(0, 23) * HOUR : int(46, 120) * DAY;
  const createdAt = NOW - age;
  const cust = rnd() < 0.4 ? customers[int(0, 11)] : pick(customers);
  const items: OrderItem[] = [];
  const lines = weighted([[1, 7], [2, 3], [3, 1]]);
  for (let l = 0; l < lines; l++) {
    const p = pick(products);
    if (items.some((x) => x.productId === p.id)) continue;
    const v = pick(p.variants);
    items.push({ productId: p.id, variantId: v.id, name: p.name, sku: v.sku, variant: v.options.join(" / "), qty: 1, price: v.price ?? p.price, image: p.image });
  }
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const coupon = rnd() < 0.12 ? pick(["WELCOME10", "GOLDENHOUR", "EIDGIFT"]) : null;
  const discount = coupon === "WELCOME10" ? Math.round(subtotal * 0.1) : coupon === "GOLDENHOUR" ? Math.round(subtotal * 0.12) : coupon === "EIDGIFT" ? 75 : 0;
  const express = rnd() < 0.25;
  const shipping = express ? 45 : subtotal - discount >= 400 ? 0 : 35;
  const rate = vatFor(cust.country);
  const tax = Math.round(((subtotal - discount) * rate) / (100 + rate));
  const total = subtotal - discount + shipping;
  const method = weighted(methodsFor(cust.country));
  const ageDays = age / DAY;
  let status: OrderStatus;
  if (ageDays < 0.6) status = weighted([["pending", 5], ["processing", 4], ["cancelled", 0.3]]);
  else if (ageDays < 4) status = weighted([["processing", 4], ["shipped", 5], ["cancelled", 0.4]]);
  else if (ageDays < 9) status = weighted([["shipped", 3], ["delivered", 7], ["cancelled", 0.3], ["refunded", 0.4]]);
  else status = weighted([["delivered", 18], ["cancelled", 1], ["refunded", 1.3]]);

  let paymentStatus: PaymentStatus;
  if (method === "Cash on delivery") paymentStatus = status === "delivered" ? "paid" : status === "cancelled" ? "failed" : "pending";
  else if (method === "Bank transfer" && status === "pending") paymentStatus = "pending";
  else if (status === "refunded") paymentStatus = rnd() < 0.35 ? "partially_refunded" : "refunded";
  else if (status === "pending") paymentStatus = weighted([["pending", 2], ["failed", 2], ["paid", 4]]);
  else if (status === "cancelled") paymentStatus = weighted([["failed", 2], ["refunded", 2]]);
  else paymentStatus = "paid";

  const number = `RZ-${10240 + ORDER_COUNT - i}`;
  const id = `ord_${ORDER_COUNT - i}`;
  const carrier = cust.country === "Pakistan" ? "TCS" : cust.country === "United Kingdom" && !express ? "Royal Mail Special Delivery" : "DHL Express";
  const timeline: TimelineEvent[] = [{ at: createdAt, label: "Order placed", by: "Customer" }];
  if (paymentStatus === "paid" && method !== "Cash on delivery") timeline.push({ at: createdAt + int(1, 3) * MIN, label: `Payment captured (${method})`, by: "Gateway" });
  if (paymentStatus === "failed") timeline.push({ at: createdAt + int(1, 5) * MIN, label: "Payment failed", by: "Gateway" });
  if (["processing", "shipped", "delivered"].includes(status)) timeline.push({ at: createdAt + int(2, 9) * HOUR, label: "Confirmed and sent to packing", by: "Hira (Operations)" });
  let tracking: string | null = null;
  if (["shipped", "delivered"].includes(status)) {
    tracking = carrier === "DHL Express" ? String(int(1000000000, 9999999999)) : carrier === "TCS" ? `TCS${int(10000000, 99999999)}` : `RS${int(10000000, 99999999)}GB`;
    timeline.push({ at: createdAt + int(18, 40) * HOUR, label: `Shipped with ${carrier}, insured`, by: "Hira (Operations)" });
  }
  if (status === "delivered") timeline.push({ at: createdAt + int(2, 4) * DAY, label: "Delivered, signed for", by: carrier });
  if (status === "cancelled") timeline.push({ at: createdAt + int(1, 18) * HOUR, label: "Order cancelled", by: pick(["Customer", "Hira (Operations)"]) });
  if (status === "refunded") timeline.push({ at: createdAt + int(6, 12) * DAY, label: paymentStatus === "partially_refunded" ? "Partial refund issued" : "Return received, refund issued", by: "Omar (Finance)" });

  orders.push({
    id, number, customerId: cust.id, items, subtotal, discount, coupon, shipping, tax, total, status, paymentStatus, paymentMethod: method,
    createdAt, address: cust.addresses[0], carrier: tracking ? carrier : null, tracking, shippingMethod: express ? "Express, insured" : "Standard, insured",
    giftBox: rnd() < 0.4, timeline: timeline.sort((a, b) => a.at - b.at),
    note: rnd() < 0.07 ? pick(["Gift for my mother, please include a note card.", "Please call before delivery.", "Needed before the walima on the 14th."]) : "",
  });

  if (method !== "Cash on delivery" || paymentStatus === "paid") {
    const refunded = paymentStatus === "refunded" ? total : paymentStatus === "partially_refunded" ? Math.round(total * 0.4) : 0;
    const tStatus = paymentStatus === "paid" ? "captured" : paymentStatus === "pending" ? "pending" : paymentStatus === "failed" ? "failed" : paymentStatus === "refunded" ? "refunded" : "partial_refund";
    const ref = `txn_${Math.floor(rnd() * 36 ** 8).toString(36).padStart(8, "0")}${Math.floor(rnd() * 36 ** 6).toString(36)}`;
    const failureReason = tStatus === "failed" ? pick(failReasons) : null;
    transactions.push({
      id: `txn_${ORDER_COUNT - i}`, orderId: id, orderNumber: number, customerId: cust.id, amount: total, refunded, method,
      gateway: method === "Cash on delivery" ? "Cash on delivery" : "Demo gateway", status: tStatus, gatewayRef: ref,
      createdAt: createdAt + int(0, 3) * MIN, failureReason,
      gatewayResponse: {
        id: ref, object: "payment", amount: total * 100, currency: "usd", status: tStatus === "failed" ? "failed" : tStatus === "pending" ? "requires_action" : "succeeded",
        payment_method: method.toLowerCase().replace(/ /g, "_"), order_reference: number, card_country: cust.country,
        failure_code: failureReason ? "card_declined" : null, failure_message: failureReason, risk_level: pick(["normal", "normal", "elevated"]),
      },
    });
  }
}
orders.sort((a, b) => b.createdAt - a.createdAt);
// Order numbers follow placement time, newest highest.
{
  const renumber = new Map<string, string>();
  orders.forEach((o, i) => { const n = `RZ-${10240 + ORDER_COUNT - i}`; renumber.set(o.id, n); o.number = n; });
  for (const t of transactions) { t.orderNumber = renumber.get(t.orderId)!; t.gatewayResponse.order_reference = t.orderNumber; }
}
transactions.sort((a, b) => b.createdAt - a.createdAt);

// ---------- Appointments ----------
const apptTypes: [AppointmentType, number, number][] = [["Bridal consultation", 90, 5], ["Fine jewelry viewing", 60, 3], ["Custom measurements", 45, 3], ["Fitting", 60, 4], ["Styling session", 60, 2]];
function atelierTime(a: AtelierInfo, dayOffset: number, hour: number, minute: number) {
  // Build a UTC timestamp for a local wall-clock time in the atelier's time zone.
  const ref = new Date(NOW + dayOffset * DAY);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: a.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ref);
  const guess = Date.parse(`${parts}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const offsetMin = (new Date(guess).getTime() - Date.parse(new Date(guess).toLocaleString("en-US", { timeZone: a.timezone }) + " UTC")) / MIN;
  return guess + offsetMin * MIN;
}
export const appointments: Appointment[] = [];
let apptN = 2040;
for (let d = -14; d <= 21; d++) {
  for (const a of ateliers) {
    const n = d === 0 ? int(2, 4) : weighted([[0, 2], [1, 3], [2, 3], [3, 1]]);
    const used: number[] = [];
    for (let k = 0; k < n; k++) {
      let h = int(a.opens, a.closes - 2);
      while (used.includes(h)) h = h + 1 < a.closes - 1 ? h + 1 : a.opens;
      used.push(h);
      const [type, dur] = weighted(apptTypes.map((t) => [t, t[2]] as [[AppointmentType, number, number], number]));
      const cust = rnd() < 0.6 ? pick(customers.filter((c) => (a.name === "Lahore" ? c.country === "Pakistan" : a.name === "London" ? c.country === "United Kingdom" : a.name === "Dubai" ? c.country === "United Arab Emirates" : c.country === "Qatar")) .concat(customers.slice(0, 2))) : null;
      const start = atelierTime(a, d, h, pick([0, 0, 30]));
      const status: AppointmentStatus = start < NOW - HOUR
        ? weighted([["completed", 8], ["no_show", 0.6], ["cancelled", 0.8]])
        : weighted([["confirmed", 8], ["requested", d <= 4 ? 1.6 : 0.4], ["cancelled", 0.3]]);
      const walkName = pick(["Rabia Anwar", "Hessa Al Nuaimi", "Kiran Shah", "Nida Hameed", "Shaikha Al Kaabi", "Maryam Yousuf", "Areeba Khalid", "Amal Darwish"]);
      appointments.push({
        id: `apt_${apptN}`, ref: `APT-${apptN++}`, customerId: cust?.id ?? null, clientName: cust?.name ?? walkName,
        email: cust?.email ?? `${walkName.toLowerCase().replace(" ", ".")}@gmail.com`, phone: cust?.phone ?? "+44 7700 900 000",
        atelier: a.name, type, start, durationMin: dur, stylist: pick(a.stylists), status,
        eventDate: type === "Bridal consultation" || type === "Fitting" ? start + int(25, 160) * DAY : null,
        notes: type === "Bridal consultation" ? pick(["Nikkah and walima looks, prefers ivory and gold.", "Mehndi outfit plus reception, budget around $6k.", "Wants to see the Golden Hour capsule and matching jewelry."]) : type === "Fine jewelry viewing" ? "Interested in the teardrop pendant and pearl choker." : "",
        measurements: type === "Custom measurements" && status === "completed" ? { Bust: "35 in", Waist: "29 in", Hips: "39 in", "Shoulder to hem": "56 in", Sleeve: "23 in" } : {},
        createdAt: start - int(2, 20) * DAY, source: weighted([["website", 6], ["whatsapp", 3], ["phone", 2], ["walk-in", 1]]),
      });
    }
  }
}
appointments.sort((a, b) => a.start - b.start);

// ---------- Reviews ----------
const reviewBank: [number, string, string][] = [
  [5, "Even more beautiful in person", "The needlework catches the light beautifully. Fits true to size and the slip is a lovely touch."],
  [5, "Worth every penny", "Certificate arrived with the pendant and the packaging felt like a gift in itself."],
  [4, "Gorgeous, runs slightly long", "Stunning abaya, I had the hem taken up an inch. Customer care sorted the alteration quickly."],
  [5, "Wore it for my nikkah", "Everyone asked where it was from. The dabka work is exquisite."],
  [3, "Lovely piece, slow delivery", "Beautiful but took five days to reach Toronto instead of three."],
  [5, "The salon appointment was wonderful", "Sofia took my measurements and the anarkali fit perfectly first time."],
  [4, "Pearls are lustrous", "Very happy with the choker. Clasp is a little stiff at first."],
  [2, "Colour differs from photos", "The blush is more peach than pink on my screen. Returning for exchange."],
];
export const reviews: Review[] = Array.from({ length: 26 }, (_, i) => {
  const [rating, title, body] = pick(reviewBank);
  const status: Review["status"] = i < 5 ? "pending" : rnd() < 0.07 ? "rejected" : "approved";
  return {
    id: `rev_${i + 1}`, productId: pick(products).id, customerId: pick(customers).id, rating, title, body,
    createdAt: NOW - (i < 5 ? int(1, 40) * HOUR : int(2, 90) * DAY), status,
    reply: status === "approved" && rnd() < 0.3 ? "Thank you for choosing RINAZ. Your words are shared with our atelier." : null, verified: rnd() < 0.9,
  };
});

// ---------- Marketing ----------
export const coupons: Coupon[] = [
  { id: "cpn_1", code: "WELCOME10", type: "percent", value: 10, minOrder: 0, usageLimit: null, perCustomer: 1, used: 214, startsAt: NOW - 200 * DAY, expiresAt: null, active: true, appliesTo: "all", targetIds: [] },
  { id: "cpn_2", code: "GOLDENHOUR", type: "percent", value: 12, minOrder: 900, usageLimit: 150, perCustomer: 1, used: 118, startsAt: NOW - 18 * DAY, expiresAt: NOW + 10 * DAY, active: true, appliesTo: "products", targetIds: ["prd_1", "prd_4", "prd_5"] },
  { id: "cpn_3", code: "EIDGIFT", type: "fixed", value: 75, minOrder: 700, usageLimit: 300, perCustomer: 1, used: 300, startsAt: NOW - 90 * DAY, expiresAt: NOW - 60 * DAY, active: false, appliesTo: "all", targetIds: [] },
  { id: "cpn_4", code: "BRIDE2026", type: "percent", value: 8, minOrder: 1500, usageLimit: 60, perCustomer: 1, used: 9, startsAt: NOW + 5 * DAY, expiresAt: NOW + 60 * DAY, active: true, appliesTo: "categories", targetIds: [catId("Pakistani Couture")] },
  { id: "cpn_5", code: "SALONVIP", type: "free_shipping", value: 0, minOrder: 0, usageLimit: null, perCustomer: 5, used: 41, startsAt: NOW - 120 * DAY, expiresAt: null, active: true, appliesTo: "all", targetIds: [] },
];

export const discounts: Discount[] = [
  { id: "dsc_1", name: "Complimentary gift box over $400", kind: "free_gift", value: 0, buyQty: 0, getQty: 0, gift: "RINAZ velvet keepsake box", minSpend: 400, appliesTo: "all", targetIds: [], startsAt: NOW - 300 * DAY, endsAt: null, active: true, timesApplied: 612 },
  { id: "dsc_2", name: "Abaya with fine jewelry: 10% off the jewelry", kind: "percent_off", value: 10, buyQty: 0, getQty: 0, gift: "", minSpend: 0, appliesTo: "categories", targetIds: [catId("18K Fine Jewelry")], startsAt: NOW - 20 * DAY, endsAt: NOW + 25 * DAY, active: true, timesApplied: 37 },
  { id: "dsc_3", name: "Evening Noir weekend", kind: "amount_off", value: 60, buyQty: 0, getQty: 0, gift: "", minSpend: 0, appliesTo: "collections", targetIds: ["col_noir"], startsAt: NOW + 9 * DAY, endsAt: NOW + 12 * DAY, active: true, timesApplied: 0 },
];

// ---------- Banners ----------
export const banners: Banner[] = [
  { id: "bn_1", placement: "announcement", title: "Complimentary insured DHL Express on orders over $400", subtitle: "", ctaLabel: "", ctaLink: "/shipping", secondaryLabel: "", secondaryLink: "", image: "", startsAt: null, endsAt: null, active: true, order: 0 },
  { id: "bn_2", placement: "hero", title: "Timeless Style. Modern Luxury", subtitle: "Handcrafted luxury Abayas, certified 18K solid gold jewelry, and bespoke Pakistani bridal couture created for modern poise.", ctaLabel: "Shop new in", ctaLink: "/collection/new-in", secondaryLabel: "Book private salon", secondaryLink: "/#sanctuary", image: unsplash("photo-1724412665971-114bd351a42d", 1600), startsAt: null, endsAt: null, active: true, order: 1 },
  { id: "bn_3", placement: "hero", title: "The Golden Hour Collection", subtitle: "Sculpted in pure double-faced georgette silk and metallic gold zardozi for intimate ceremonies and receptions.", ctaLabel: "Shop the capsule", ctaLink: "/collection/golden-hour", secondaryLabel: "", secondaryLink: "", image: unsplash("photo-1733470324488-d0e10d014d80", 1600), startsAt: NOW - 18 * DAY, endsAt: NOW + 10 * DAY, active: true, order: 2 },
  { id: "bn_4", placement: "hero", title: "Bridal Pret", subtitle: "Heirloom anarkalis and peshwas, ready to wear or made to measure.", ctaLabel: "Explore bridal", ctaLink: "/collection/bridal-pret", secondaryLabel: "Book bridal appointment", secondaryLink: "/#sanctuary", image: unsplash("photo-1747847471517-952a3eb93a89", 1600), startsAt: null, endsAt: null, active: true, order: 3 },
  { id: "bn_5", placement: "collection", title: "Evening Noir", subtitle: "Monochrome reception silhouettes", ctaLabel: "View collection", ctaLink: "/collection/evening-noir", secondaryLabel: "", secondaryLink: "", image: unsplash("photo-1772474528936-4f1187eb1611", 1200), startsAt: NOW + 9 * DAY, endsAt: NOW + 12 * DAY, active: true, order: 4 },
];

export const promotions: Promotion[] = [
  { id: "prm_1", name: "The Golden Hour capsule", summary: "Launch of the Golden Hour capsule with 12% off selected pieces for private clients.", startsAt: NOW - 18 * DAY, endsAt: NOW + 10 * DAY, collectionId: "col_golden", bannerId: "bn_3", offer: { kind: "coupon", id: "cpn_2" }, channels: ["storefront", "email", "whatsapp"], status: "live", revenue: 0, orders: 0 },
  { id: "prm_2", name: "Evening Noir weekend", summary: "$60 off the Evening Noir collection over one weekend.", startsAt: NOW + 9 * DAY, endsAt: NOW + 12 * DAY, collectionId: "col_noir", bannerId: "bn_5", offer: { kind: "discount", id: "dsc_3" }, channels: ["storefront", "email"], status: "scheduled", revenue: 0, orders: 0 },
  { id: "prm_3", name: "Eid gifting", summary: "$75 off orders over $700 with complimentary gift wrapping.", startsAt: NOW - 90 * DAY, endsAt: NOW - 60 * DAY, collectionId: null, bannerId: null, offer: { kind: "coupon", id: "cpn_3" }, channels: ["storefront", "email", "whatsapp", "sms"], status: "ended", revenue: 0, orders: 0 },
];
for (const p of promotions) {
  const code = p.offer.kind === "coupon" ? coupons.find((c) => c.id === p.offer.id)?.code : null;
  const os = orders.filter((o) => o.createdAt >= p.startsAt && o.createdAt <= p.endsAt && (!code || o.coupon === code));
  p.orders = os.length;
  p.revenue = os.reduce((s, o) => s + o.total, 0);
}

// ---------- Inventory history ----------
export const stockMoves: StockMove[] = Array.from({ length: 70 }, (_, i) => {
  const p = pick(products);
  const v = pick(p.variants);
  const reason = weighted<StockMove["reason"]>([["sale", 10], ["restock", 3], ["return", 2], ["correction", 1], ["damaged", 0.5]]);
  const delta = reason === "sale" ? -1 : reason === "restock" ? int(2, 6) : reason === "return" ? 1 : reason === "damaged" ? -1 : pick([-1, 1, 2]);
  return { id: `mv_${i + 1}`, productId: p.id, variantId: v.id, delta, reason, by: reason === "sale" ? "System" : pick(["Hira (Operations)", "Bilal (Warehouse)"]), at: NOW - int(5, 60 * 24 * 30) * MIN, after: Math.max(0, v.stock + int(-2, 4)) };
}).sort((a, b) => b.at - a.at);

// ---------- Media ----------
const mediaPhotos: [string, MediaAsset["folder"], string][] = [
  ["photo-1724412665971-114bd351a42d", "homepage", "Black abaya with champagne gold embroidery"],
  ["photo-1760083545495-b297b1690672", "products", "Beige open abaya with tonal needlework"],
  ["photo-1736342182642-e2042084f47c", "products", "Blush Silk Open Abaya styled with fine jewelry"],
  ["photo-1747847471517-952a3eb93a89", "homepage", "Bride in hand-embroidered Pakistani couture"],
  ["photo-1733470324488-d0e10d014d80", "banners", "Bridal couture from The Golden Hour Collection"],
  ["photo-1773832190768-b4c4667ceeb4", "products", "Gold pendant set with diamonds"],
  ["photo-1771515411694-57fb626159d1", "products", "Teardrop diamond pendant, alternate view"],
  ["photo-1654699991520-aaaf4dd2608b", "products", "Strand of South Sea pearls"],
  ["photo-1515562141207-7a88fb7ce338", "products", "Pearl and gold choker, alternate view"],
  ["photo-1772474542630-5f5822ca8421", "products", "Nocturne Charcoal Zardozi Evening Abaya"],
  ["photo-1772474528936-4f1187eb1611", "banners", "Charcoal evening abaya, alternate view"],
  ["photo-1733470381571-c3d082e68457", "products", "Rose Quartz Raw Silk Formal Peshwas"],
  ["photo-1705920824583-0e783235394d", "products", "Rose quartz peshwas, alternate view"],
];
export const media: MediaAsset[] = mediaPhotos.map(([id, folder, alt], i) => ({
  id: `med_${i}`, url: unsplash(id, 900), name: `${slugify(alt).slice(0, 36)}.jpg`, sizeKb: int(240, 980), width: 1400, height: folder === "banners" || folder === "homepage" ? 933 : 1750,
  folder, usedIn: int(1, 3), uploadedAt: NOW - int(2, 60) * DAY, alt,
})).sort((a, b) => b.uploadedAt - a.uploadedAt);

// ---------- Storefront CMS ----------
export const homeSections: HomeSection[] = [
  { id: "sec_hero", type: "hero_slider", label: "Hero slider", enabled: true, config: { source: "Hero banners", autoplay: "6" } },
  { id: "sec_tiles", type: "collection_tiles", label: "Explore our world of style", enabled: true, config: { heading: "Explore Our World of Style", subheading: "Handcrafted for Unforgettable Entrances", tiles: "Haute Abayas, 18K Fine Jewelry, Pakistani Couture, Evening Noir" } },
  { id: "sec_capsule", type: "capsule", label: "The Golden Hour capsule", enabled: true, config: { heading: "The Golden Hour Collection.", body: "Sculpted in pure double-faced georgette silk and metallic gold zardozi for intimate ceremonies and receptions.", ctaLabel: "Shop the capsule", ctaLink: "/collection/golden-hour", image: unsplash("photo-1733470324488-d0e10d014d80", 1200) } },
  { id: "sec_promises", type: "service_promises", label: "Service promises", enabled: true, config: { items: "100% Certified Authentic | DHL Express Worldwide | 14-Day Global Returns | 24/7 Styling Concierge" } },
  { id: "sec_look", type: "curated_look", label: "Curated adornments & pairings", enabled: true, config: { heading: "Curated Adornments & Pairings", body: "Style the signature Blush Silk Open Abaya with hallmarked 18K solid gold and South Sea pearls for an effortless, elevated entrance.", products: "prd_1, prd_3, prd_4", image: unsplash("photo-1736342182642-e2042084f47c", 1000) } },
  { id: "sec_story", type: "brand_story", label: "Simple. Memorable. Meaningful.", enabled: true, config: { heading: "Simple. Memorable. Meaningful.", body: "Every curve of the RINAZ mark is rooted in modesty, craftsmanship, and cultural pride. We honor Islamic modest heritage and South Asian craft traditions with graceful contemporary refinement." } },
  { id: "sec_salon", type: "salon_cta", label: "Private bridal consultation", enabled: true, config: { heading: "An intimate private bridal consultation.", subheading: "Custom fittings tailored for your sacred day", ctaLabel: "Book bridal appointment", ctaLink: "/#sanctuary" } },
  { id: "sec_locations", type: "locations", label: "Studio sanctuaries", enabled: true, config: { ateliers: "London, Dubai, Doha, Lahore" } },
  { id: "sec_news", type: "newsletter", label: "Private client register", enabled: true, config: { heading: "Receive First Access to Runway Drops", subheading: "Join our private client register to receive seasonal preview lookbooks, limited bridal pret releases, and private studio invitations.", ctaLabel: "Subscribe" } },
];

export const navLinks: NavLink[] = [
  { id: "n1", label: "New In", href: "/collection/new-in" },
  { id: "n2", label: "Haute Abayas", href: "/category/haute-abayas" },
  { id: "n3", label: "18K Fine Jewelry", href: "/category/fine-jewelry" },
  { id: "n4", label: "Pakistani Couture", href: "/category/pakistani-couture" },
  { id: "n5", label: "Bridal Pret", href: "/collection/bridal-pret" },
  { id: "n6", label: "Studio Sanctuary", href: "/#sanctuary" },
];

export const pages: CmsPage[] = [
  { id: "pg1", title: "About the Studio", slug: "about", status: "published", updatedAt: NOW - 30 * DAY, body: "RINAZ STUDIO honors Islamic modest heritage and South Asian craft traditions with graceful contemporary refinement.", seoTitle: "About RINAZ STUDIO", seoDescription: "Haute abayas, fine jewelry and Pakistani couture rooted in modesty, craftsmanship and cultural pride." },
  { id: "pg2", title: "Bespoke Bridal Consultations", slug: "bridal-consultations", status: "published", updatedAt: NOW - 12 * DAY, body: "Private 1-on-1 bridal consultations, certified 18K gold and diamond viewings, custom bridal sizing and hem tailoring.", seoTitle: "Bridal consultations | RINAZ STUDIO", seoDescription: "Book a private bridal appointment in London, Dubai, Doha or Lahore." },
  { id: "pg3", title: "Custom Measurement Service", slug: "custom-measurements", status: "published", updatedAt: NOW - 40 * DAY, body: "Made-to-measure couture from your measurements, taken in salon or by video call.", seoTitle: "Custom measurements | RINAZ STUDIO", seoDescription: "Made-to-measure couture and abayas." },
  { id: "pg4", title: "Insured Express Courier", slug: "shipping", status: "published", updatedAt: NOW - 50 * DAY, body: "Complimentary insured DHL Express on orders over $400, delivered within 2 to 3 business days.", seoTitle: "Shipping | RINAZ STUDIO", seoDescription: "Insured worldwide delivery." },
  { id: "pg5", title: "Returns", slug: "returns", status: "published", updatedAt: NOW - 50 * DAY, body: "14-day global returns with complimentary insured pickup from your doorstep.", seoTitle: "Returns | RINAZ STUDIO", seoDescription: "14-day global returns." },
  { id: "pg6", title: "Gift Box Packaging", slug: "gift-box", status: "draft", updatedAt: NOW - 2 * DAY, body: "Every order arrives in the RINAZ velvet keepsake box.", seoTitle: "Gift packaging | RINAZ STUDIO", seoDescription: "The RINAZ keepsake box." },
  { id: "pg7", title: "Privacy Policy", slug: "privacy", status: "published", updatedAt: NOW - 100 * DAY, body: "", seoTitle: "Privacy Policy", seoDescription: "" },
  { id: "pg8", title: "Terms of Service", slug: "terms", status: "published", updatedAt: NOW - 100 * DAY, body: "", seoTitle: "Terms of Service", seoDescription: "" },
];

export const faqs: Faq[] = [
  { id: "f1", group: "Orders & delivery", q: "How long does delivery take?", a: "Insured DHL Express delivers within 2 to 3 business days to most destinations.", visible: true },
  { id: "f2", group: "Orders & delivery", q: "Is shipping free?", a: "Complimentary insured courier on orders over $400.", visible: true },
  { id: "f3", group: "Returns", q: "What is the returns policy?", a: "14-day global returns with complimentary pickup from your doorstep and full insurance.", visible: true },
  { id: "f4", group: "Authenticity", q: "Is the jewelry certified?", a: "Every piece is hallmarked 18K solid gold and arrives with a gemological valuation certificate.", visible: true },
  { id: "f5", group: "Bridal & bespoke", q: "Can I order couture made to measure?", a: "Yes. Book a measurement appointment in salon or by video call. Made-to-measure pieces take 3 to 4 weeks.", visible: true },
  { id: "f6", group: "Bridal & bespoke", q: "Where are your salons?", a: "London (Knightsbridge & Bond Street), Dubai (Fashion Avenue & D3), Doha (private suite) and Lahore (Gulberg).", visible: true },
];

// ---------- Admin ----------
const ALL = ["dashboard", "catalog", "orders", "payments", "customers", "appointments", "marketing", "cms", "reviews", "analytics", "settings"];
const full = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, ["view", "edit", "delete"] as ("view" | "edit" | "delete")[]]));
const viewOnly = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, ["view"] as ("view" | "edit" | "delete")[]]));
const none = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, [] as ("view" | "edit" | "delete")[]]));
export const roles: Role[] = [
  { id: "role_owner", name: "Owner", description: "Full access, including payments, settings and admin users.", locked: true, permissions: full(...ALL) },
  { id: "role_ops", name: "Operations", description: "Orders, shipping, inventory and appointments.", locked: false, permissions: { ...none(...ALL), ...viewOnly("dashboard", "payments", "customers", "analytics"), catalog: ["view", "edit"], orders: ["view", "edit"], appointments: ["view", "edit"], reviews: ["view"] } },
  { id: "role_content", name: "Content", description: "Storefront, banners, media, products and reviews.", locked: false, permissions: { ...none(...ALL), ...viewOnly("dashboard", "marketing"), catalog: ["view", "edit"], cms: ["view", "edit", "delete"], reviews: ["view", "edit"] } },
  { id: "role_finance", name: "Finance", description: "Payments, refunds and reports.", locked: false, permissions: { ...none(...ALL), ...viewOnly("dashboard", "catalog", "orders", "customers", "settings"), payments: ["view", "edit"], analytics: ["view"] } },
  { id: "role_concierge", name: "Concierge", description: "Appointments, client profiles and measurements at one atelier.", locked: false, permissions: { ...none(...ALL), ...viewOnly("dashboard", "catalog", "orders"), customers: ["view", "edit"], appointments: ["view", "edit", "delete"] } },
];

export const admins: Admin[] = [
  { id: "adm_1", name: "Rinaz Qadri", email: "rinaz@rinazstudio.com", role: "role_owner", atelier: "All", lastActive: NOW - 4 * MIN, status: "active", twoFactor: true },
  { id: "adm_2", name: "Hira Butt", email: "hira@rinazstudio.com", role: "role_ops", atelier: "Lahore", lastActive: NOW - 26 * MIN, status: "active", twoFactor: true },
  { id: "adm_3", name: "Omar Shafiq", email: "omar@rinazstudio.com", role: "role_finance", atelier: "All", lastActive: NOW - 5 * HOUR, status: "active", twoFactor: true },
  { id: "adm_4", name: "Sofia Rahman", email: "sofia@rinazstudio.com", role: "role_concierge", atelier: "London", lastActive: NOW - 50 * MIN, status: "active", twoFactor: false },
  { id: "adm_5", name: "Layla Al Mansoori", email: "layla@rinazstudio.com", role: "role_concierge", atelier: "Dubai", lastActive: NOW - 3 * HOUR, status: "active", twoFactor: true },
  { id: "adm_6", name: "Zainab Malik", email: "zainab@rinazstudio.com", role: "role_content", atelier: "Lahore", lastActive: NOW - 2 * DAY, status: "active", twoFactor: false },
  { id: "adm_7", name: "", email: "studio.doha@rinazstudio.com", role: "role_concierge", atelier: "Doha", lastActive: 0, status: "invited", twoFactor: false },
];

const auditActions: [string, string][] = [
  ["Updated price", "Blush Silk Embroidered Open Abaya"], ["Marked order shipped", "RZ-10418"], ["Issued refund $680", "RZ-10377"],
  ["Approved review", "Graceful Adornment Pearl & Gold Choker"], ["Edited hero banner", "The Golden Hour Collection"], ["Created coupon", "BRIDE2026"],
  ["Restocked +3", "Nocturne Charcoal Zardozi Evening Abaya"], ["Confirmed appointment", "APT-2061"], ["Published page", "Bespoke Bridal Consultations"],
  ["Updated shipping zone", "Gulf (GCC)"], ["Cancelled order", "RZ-10409"], ["Uploaded 4 images", "Media library"],
];
export const audit: AuditEntry[] = Array.from({ length: 30 }, (_, i) => {
  const [action, target] = pick(auditActions);
  return { id: `aud_${i}`, adminId: pick(admins.slice(0, 6)).id, action, target, at: NOW - int(4, 60 * 24 * 10) * MIN, ip: `${pick(["86.12", "94.204", "39.48", "185.22"])}.${int(1, 254)}.${int(1, 254)}` };
}).sort((a, b) => b.at - a.at);

const todayRequested = appointments.filter((a) => a.status === "requested").length;
export const notifications: Notification[] = [
  { id: "nt1", kind: "appointment", text: `${todayRequested} appointment requests waiting for confirmation`, at: NOW - 12 * MIN, read: false, href: "/appointments?status=requested" },
  { id: "nt2", kind: "payment", text: `Payment failed on ${orders.find((o) => o.paymentStatus === "failed")?.number ?? "RZ-10420"}`, at: NOW - 35 * MIN, read: false, href: "/payments?status=failed" },
  { id: "nt3", kind: "stock", text: `Sizes sold out on ${products.filter((p) => p.variants.some((v) => v.stock === 0 && !v.options.includes("Made to measure"))).length} products`, at: NOW - 2 * HOUR, read: false, href: "/catalog/inventory?filter=out" },
  { id: "nt4", kind: "review", text: "5 reviews waiting for moderation", at: NOW - 3 * HOUR, read: true, href: "/reviews" },
];

export const TIME = { NOW, MIN, HOUR, DAY };
