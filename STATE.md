# STATE.md — WMS Agent External Memory & Progress Log

> **Last Updated:** 2026-08-27  
> **Current Phase:** 🔄 Planning Phase — UPC Sharing (Barcode Conflict Resolution)

---

## Approved Decisions (Human-Confirmed)

| # | Question | Answer |
|---|---|---|
| Q1 | Supabase setup | User will create project manually; keys placed in `.env.local` |
| Q2 | Barcode formats | Both EAN/UPC (retail) + QR Code via ZXing |
| Q3 | First Super Admin | Seed script (`prisma/seed.ts`) that promotes a specific email |
| Q4 | Offline mode | Not required for V1 |
| Q5 | Product images | Not required for V1; text/SKU sufficient |

---

## Project Status Overview

| Phase | Status |
|---|---|
| Bootstrap Files | ✅ Done |
| Architecture Plan | ✅ Approved |
| Next.js Scaffold | ✅ Done (Next.js 16.3.2, TS, Tailwind 4) |
| Database Schema | ✅ Done (`prisma/schema.prisma`) |
| Supabase SQL Setup | ✅ Done (`supabase-setup.sql` — run manually) |
| Auth (Login/Signup/Recovery) | ✅ Done (pages + callback route) |
| Role-Based Access Control | ✅ Done (middleware + `lib/auth.ts`) |
| Inventory CRUD | ✅ Done (list, detail, new product pages + API) |
| Barcode Scanner (PWA) | ✅ Done (ZXing, rear-camera, scan-line animation) |
| Transactions (Inbound/Outbound) | ✅ Done (page + atomic API route) |
| Analytics Dashboard | ✅ Done (Recharts area + bar charts, stat cards) |
| Admin Panel | ✅ Done (user list + role toggle) |
| PWA Manifest | ✅ Done (`public/manifest.json`) |
| Prisma Client Generated | 🔄 In progress |
| `.env.local` Configured | ⬜ Needs user action |
| `supabase-setup.sql` Run | ⬜ Needs user action |
| Dev Server Running | ⬜ After env configured |
| End-to-End Testing | ⬜ After env configured |
| Production Deployment | ⬜ Not Started |

---

## Files Written This Session

```
WMS/
├── AGENT.md, GLOSSARY.md, STATE.md          ← Bootstrap
├── prisma/schema.prisma                      ← DB schema
├── prisma/seed.ts                            ← Super admin seed
├── supabase-setup.sql                        ← Run in Supabase SQL Editor
├── .env.example                              ← Copy → .env.local
├── middleware.ts                             ← Auth route guard
├── next.config.ts                            ← Supabase image domains
├── public/manifest.json                      ← PWA manifest
├── lib/
│   ├── supabase/server.ts                    ← Server Supabase client
│   ├── supabase/client.ts                    ← Browser Supabase client
│   ├── prisma.ts                             ← Singleton Prisma client
│   └── auth.ts                              ← getAuthUser / requireRole
├── types/index.ts                            ← Global TS types
├── app/
│   ├── layout.tsx, page.tsx, globals.css    ← Root layout + design system
│   ├── auth/login/page.tsx                  ← Login
│   ├── auth/signup/page.tsx                 ← Signup
│   ├── auth/forgot-password/page.tsx        ← Password recovery
│   ├── auth/callback/route.ts               ← OAuth callback
│   └── (app)/
│       ├── layout.tsx                       ← App shell (sidebar)
│       ├── dashboard/page.tsx + DashboardClient.tsx
│       ├── inventory/page.tsx               ← List + search
│       ├── inventory/[id]/page.tsx          ← Product detail
│       ├── inventory/[id]/TransactionHistoryTable.tsx
│       ├── inventory/new/page.tsx           ← Add product
│       ├── scan/page.tsx                    ← Barcode scanner
│       ├── transactions/page.tsx            ← Transaction log
│       └── admin/page.tsx + AdminClient.tsx
├── components/layout/Sidebar.tsx            ← Nav sidebar + mobile bottom nav
└── app/api/
    ├── products/route.ts                    ← GET/POST products
    ├── products/by-sku/route.ts             ← GET by SKU (scanner)
    ├── transactions/route.ts                ← GET/POST transactions
    └── admin/users/[id]/role/route.ts       ← PATCH role
```

---

## Known Issues / Blockers

| Issue | Status |
|---|---|
| `(app)` route group dirs need `dashboard/`, `inventory/`, `scan/`, `transactions/`, `admin/` moved from `app/` root dirs | ✅ Created under `app/(app)/` directly |
| `app/` root dirs for those routes still exist (empty) | ⬜ Can be removed — won't cause errors |
| `.env.local` not created yet | ⬜ User must create from `.env.example` |

---

## Next User Actions Required

> **You need to do 3 things before `npm run dev` works:**

1. **Copy `.env.example` → `.env.local`** and fill in your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (port 6543, pgbouncer)
   - `DIRECT_URL` (port 5432)
   - `SUPER_ADMIN_EMAIL`

2. **Run `supabase-setup.sql`** in the Supabase Dashboard → SQL Editor (creates tables, triggers, RLS).

3. **Run `npm run dev`** — the app will be at http://localhost:3000.

4. **Sign up** with `SUPER_ADMIN_EMAIL`, then run `npx prisma db seed` to promote it to super_admin.

---

## Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| Use Supabase over raw Postgres | Managed Auth, RLS, free tier, reduces infra overhead | 2026-08-21 |
| Use ZXing over QuaggaJS | Better maintained, TypeScript-native, broader barcode format support | 2026-08-21 |
| Use Next.js App Router | Enables server components for secure auth, co-located API routes | 2026-08-21 |
| Recharts over Chart.js | First-class React support, easier Tailwind theming | 2026-08-21 |
| Atomic Prisma transaction for stock | Prevents race conditions when concurrent scans hit same product | 2026-08-22 |
| Route group `(app)` for protected pages | Enables shared layout with sidebar without affecting URL paths | 2026-08-22 |
| Supabase trigger for auto-profile | Avoids extra API call on signup; profile row created server-side | 2026-08-22 |
| Discard Heavy Order Schema | Reverted back to a UI-only "Quick Bulk Update" approach using existing `Product` and `Transaction` models instead of complex multi-table Orders | 2026-08-27 |

---

## V3 Roadmap (In Progress)

1. **Quick Bulk Update System (Priority 1):** Replace the complex Order system with a flexible UI scratchpad (`/quick-update`) for scanning/adding multiple items, applying a global receiver/supplier name, and atomically updating `currentStock` and `Transactions`.
2. **Scanner Optimization (Priority 2):** ✅ Enforced `facingMode: "environment"` and optimized video feed.
3. **Brand Management (Priority 3):** ✅ `Brand` model (1-to-Many with Products), Super Admin dashboard filtering by brand.
4. **Global Delete Controls (Priority 4):** ✅ UI delete buttons for Products/Users, Prisma `onDelete: Cascade`.
5. **UPC Sharing & Barcode Conflict Resolution (Priority 5):** 🔄 Removing `@unique` from `sku`, updating APIs to return multiple matching products, and adding a conflict resolution modal to the scanner UI.

---

## V4 Roadmap: Dashboard & CRM (In Progress)

1. **Schema Expansion: Clients & Partners:** Add a `Contact` model for managing suppliers and customers.
2. **Dashboard Upgrade: Low Stock List:** Replace generic low stock warning with a scrollable list of specific items below threshold.
3. **Dashboard Upgrade: Brand Financials:** Add a new analytics section showing Total Cost and Total Earnings grouped by Brand, with Daily/Monthly/All-Time filters.
4. **New Page: Contacts Directory:** ✅ Create a `/contacts` page with a Clients/Partners toggle and an "Add New Contact" modal.

---

## V5 Roadmap: Transactions Ledger Enhancement (In Progress)

1. **Transactions Time Filtering & Financial Values:** Add `unitPrice` to `Transaction` model (snapshots costPrice or sellingPrice). Update ledger API and UI with time-based filters (Today, 7 Days, Month, All-Time) and Unit Price/Total Value columns.

---

## V6 Pre-Deployment Roadmap (In Progress)

1. **User Management & Roles (RBAC):** Add `Role` enum (`ADMIN`, `WORKER`) to the user/auth model. Update API routes and Next.js middleware so `WORKER` roles cannot access `/dashboard`, `/contacts`, or see pricing in API responses. Create `/admin/users` page for viewing accounts, creating WORKERs, and resetting passwords.
2. **Ledger-Safe Revert Feature:** Create `POST /api/transactions/[id]/revert` endpoint to generate a Compensating Transaction (no deleting records) and update `currentStock`. Add undo/revert button to `/transactions` page with confirmation modal.
3. **Printable Outbound Slip:** Trigger a success modal on `/quick-update` after successful batch submission that includes a "Print Slip" button. Implement `@media print` CSS layout for a clean, black-and-white packing slip (Date, Receiver, Items, Qty, Signature) hiding navigation.
