# AGENT.md — WMS Agent Manifest

## Tone & Behavior
- Be precise, surgical, and cost-conscious. Never rewrite a whole file when a targeted diff will do.
- Always plan in `STATE.md` before writing code.
- Run the Checker phase after every Maker phase before declaring a feature done.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | SSR + API routes in one repo, PWA support, mobile-first |
| **Language** | TypeScript | Type safety, fewer runtime bugs |
| **Styling** | Tailwind CSS + Framer Motion | Rapid utility-first styling + polished animations |
| **ORM** | Prisma | Type-safe DB client, migrations, schema-as-code |
| **Database** | PostgreSQL (via Supabase) | Managed, free-tier, built-in Auth & RLS |
| **Auth** | Supabase Auth | Email/password, JWT, role claims, password recovery built-in |
| **Barcode Scanning** | `@zxing/browser` (ZXing) | Wide format support, no WASM dependency issues, stream-based |
| **Charts** | Recharts | React-native, responsive, Tailwind-friendly |
| **PWA** | `next-pwa` | Service worker + manifest for camera + offline support |
| **Linter/Formatter** | ESLint + Prettier | Enforced via `.eslintrc` and `.prettierrc` |
| **Testing** | Jest + React Testing Library | Unit + integration tests |
| **Deployment** | Vercel (frontend) + Supabase (backend) | Zero-config, production-ready |

---

## Project Structure (planned)

```
/wms
  /app                    # Next.js App Router pages
    /auth                 # Login, signup, forgot-password
    /dashboard            # Analytics dashboard
    /inventory            # Stock list, detail view
    /scan                 # Barcode scanner page
    /admin                # Super Admin panel
    /api                  # Next.js API routes (server-side logic)
  /components             # Shared UI components
  /lib                    # Supabase client, utilities, helpers
  /prisma                 # Schema + migrations
  /public                 # Static assets, PWA manifest, icons
  /types                  # Global TypeScript types
```

---

## Environment Variables

Store all secrets in `.env.local` (never committed). Required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # server-side only

# Database (for Prisma direct connection)
DATABASE_URL=<supabase-postgres-connection-string>
DIRECT_URL=<supabase-direct-url>  # required by Prisma for migrations
```

---

## Coding Conventions

- **Components**: PascalCase filenames, named exports preferred.
- **API Routes**: Flat handler functions; validate input with `zod`.
- **Database**: All mutations go through Prisma; never raw SQL unless absolutely needed.
- **Auth**: Server components use `createServerComponentClient`; client components use `createClientComponentClient`.
- **Roles**: Stored as `user_role` enum in Supabase `profiles` table: `'user' | 'super_admin'`.
- **Error handling**: Always return `{ error: string }` shape on failure; `{ data: T }` on success.
- **Imports**: Use `@/` path alias for all internal imports.
- **CSS**: Tailwind classes only (no inline styles, no CSS Modules unless unavoidable).

---

## Build & Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Prisma: push schema to DB
npx prisma db push

# Prisma: generate client
npx prisma generate
```

---

## Barcode Scanning Strategy

- Use `@zxing/browser` `BrowserMultiFormatReader` for universal barcode/QR support.
- Access `navigator.mediaDevices.getUserMedia` (HTTPS required in production).
- On mobile, prefer `{ facingMode: 'environment' }` (rear camera).
- PWA manifest must include `camera` in `permissions`.

---

## Security Checklist (per feature)
- [ ] All API routes validate the session server-side.
- [ ] Role checks use the server-side `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] No secrets in client-side bundles.
- [ ] Input validated with `zod` before hitting the database.
- [ ] Row-Level Security (RLS) enabled on all Supabase tables.
