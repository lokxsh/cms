# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The small team behind RINAZ STUDIO: the owner plus a few staff split across operations (orders, insured shipping, inventory), content (storefront, collections, media, reviews), finance (payments, refunds, reports) and the bridal/styling concierge who runs private salon appointments. They work both at a desk and on a phone; phone use is a real part of the job (checking an order, confirming an appointment, approving a review between fittings).

## Product Purpose

The back office for RINAZ STUDIO's online store (https://rinaz-boutique.vercel.app). It lets the team run catalog, orders, payments, customers, inventory, promotions, appointments and storefront content without a developer, and shows real-time business performance. Success means daily tasks are fast and correct, and the owner reads the state of the business at a glance.

## Positioning

A single-house admin for a luxury modest-fashion and fine-jewelry maison, not a generic multi-store platform. The CMS edits RINAZ's structured storefront (hero slides, collection tiles, capsule features, curated looks, service promises, salon locations, newsletter) rather than being a free-form page builder.

## Operating Context

- Store: RINAZ STUDIO. Three product lines: Haute Abayas, 18K Fine Jewelry (hallmarked gold, certified diamonds and pearls), Pakistani Couture (bridal anarkalis, peshwas, pret). Collections include New In, Bridal Pret, Evening Noir, The Golden Hour capsule.
- Global clientele. Storefront has a currency selector (USD shown) and light/dark modes.
- Studio sanctuaries (ateliers): London (Knightsbridge & Bond Street), Dubai (Fashion Avenue & D3), Doha (private suite), Lahore (Gulberg atelier).
- Services the site promises: certificates of authenticity, DHL Express worldwide insured shipping (complimentary over $400), 14-day global returns with pickup, 24/7 styling concierge, private bridal consultations, custom measurements, gift box packaging.
- Bridal appointments: 1-on-1 consultations, gold and diamond viewings, custom sizing and hem tailoring, per atelier.
- Private client register (newsletter) for lookbooks and drops.
- Role-based access: Owner, Operations, Content, Finance, Concierge.

## Capabilities and Constraints

- Existing codebase: Vite, React 18, TypeScript, Tailwind v4, React Router, Zustand, Recharts, Phosphor icons. Frontend only; data is mock and in memory until a backend is wired through `src/lib/store.ts`.
- Required modules: dashboard KPIs, products (with apparel sizes/colours and jewelry metal/stone/certificate details), collections and categories, inventory, media, storefront CMS, orders, payments, customers, appointments, coupons/discounts/promotions, shipping, reviews, analytics, notifications, admin users/roles/audit, settings.
- Undecided: base currency and multi-currency setup, tax regime (VAT/GST per country), payment gateway. Keep all three configurable and do not hard-code one.

## Brand Commitments

- Name: RINAZ STUDIO (wordmark set in caps).
- Storefront identity: black and gold with ivory text, Cinzel for display caps, light and dark modes. The admin should feel like part of the same house.
- Voice: modest, refined, cultural pride (Islamic modest heritage and South Asian craft); never loud or salesy.

## Evidence on Hand

- Live storefront copy, product names and prices (e.g. Blush Silk Embroidered Open Abaya $680, The Gilded Teardrop Diamond Pendant $1,450, Graceful Adornment Pearl & Gold Choker $980; Nocturne Charcoal Zardozi Evening Abaya).
- No real order, customer, payment or appointment data. All operational data in the admin is placeholder and must not be presented as real figures.

## Product Principles

1. Daily tasks first: confirm, ship, refund, restock, book and approve are one or two actions from where the user already is.
2. The state of the house is legible at a glance, with problems surfaced before totals.
3. A phone is a first-class surface, not a squeezed desktop.
4. Content changes never need a developer.
5. Nothing destructive happens without a clear confirmation.
