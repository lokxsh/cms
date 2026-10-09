# RINAZ STUDIO Admin

Back-office frontend for [RINAZ STUDIO](https://rinaz-boutique.vercel.app): dashboard, catalog, orders, payments, customers, salon appointments, marketing, storefront CMS, reviews, analytics and settings.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

Stack: Vite, React 18, TypeScript, Tailwind v4, React Router, Zustand, Recharts, Phosphor icons.

- Product truth: [PRODUCT.md](PRODUCT.md). Visual system: [DESIGN.md](DESIGN.md).
- Data is in-memory demo data (`src/lib/seed.ts`). Catalog content mirrors the live storefront; orders, clients, payments and appointments are samples.
- Every create, update and delete goes through `src/lib/store.ts`. Replace those action bodies with API calls to connect a backend.
- Currency, tax rates and payment gateway are configurable in Settings and still to be confirmed.

## Deploying

Deployed on Vercel as a Vite project. `vercel.json` rewrites all paths to `index.html` so deep links like `/orders/ord_12` work.
