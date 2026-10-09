# Loomhouse Admin

Frontend for an e-commerce back office: dashboard, catalog, orders, payments, customers, coupons, storefront CMS, reviews, analytics and settings.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Stack: Vite, React 18, TypeScript, Tailwind v4, React Router, Zustand, Recharts, Phosphor icons, Geist.

## Where things live

| Path | What |
| --- | --- |
| `src/lib/types.ts` | Data model. Mirror these shapes in your API. |
| `src/lib/seed.ts` | Deterministic mock data. Delete once the API exists. |
| `src/lib/store.ts` | All reads and mutations. Replace each action body with an API call. |
| `src/lib/metrics.ts` | KPI and chart calculations. Move to the backend for real volumes. |
| `src/components/ui.tsx` | Buttons, inputs, tables, drawers, modals, badges, toasts. |
| `src/components/Shell.tsx` | Sidebar, top bar, Ctrl K search, notifications, theme. |
| `src/pages/` | One file per screen. `pages/cms/` holds the storefront editors. |

## Wiring a backend

- **Mutations**: every action in `store.ts` (`setOrderStatus`, `refund`, `upsertProduct`, ...) is the single place to call your API.
- **Realtime**: `pushLiveOrder` and `tickVisitors` in `Shell.tsx` simulate a feed. Replace with a WebSocket or SSE subscription that pushes into the store.
- **Uploads**: `Media.tsx` and `MediaPicker` use object URLs. Swap for S3, Cloudinary or similar.
- **Payments**: refund and re-check buttons should hit your server, which calls Razorpay. Never put the secret key in the frontend.
- **Permissions**: roles are defined in `seed.ts`. Gate routes and buttons on them once auth is in place.

Product photos are Picsum placeholders, so they won't match product names.
