# Manzil One — Premium Modern CRM & Quotation Management Platform

A production-ready, fully responsive SaaS CRM built for **consulting, staffing, manpower services, software licensing and project-based businesses** — designed to feel like a $100M-grade product.

> Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn-style UI · Framer Motion · React Hook Form · Zod · NextAuth (Google + Credentials + OTP) · Prisma · PostgreSQL (Supabase-ready) · Recharts · Sonner

---

## ✨ What's in the box

- **Auth** — Google OAuth, email/password, email/SMS OTP, session, middleware-guarded `/app`.
- **Workspace shell** — luxurious sidebar + topbar + responsive bottom-tab mobile nav, dark mode, ⌘K command palette, gradient mesh & aurora background.
- **Dashboard** — 8 animated KPI cards, monthly revenue area chart, sales funnel, lead-source donut, upcoming follow-ups, recent activities & quotations.
- **Leads** — list, filter, create dialog, detail page, **convert lead → opportunity** (carries activities, documents, customer & notes).
- **Opportunities + Pipeline Kanban** — 11 stages (Qualification → Won/Lost), HTML5 drag-and-drop with Framer Motion `layoutId` transitions, live value/aging/probability per card.
- **RFQ** — multi-line creation (Manpower / Non-Manpower / Software License / Hardware / Service), linked to opportunity, auto-advances stage.
- **Quotation builder** — pull from RFQ, apply rate cards, compute markup / discount / tax / margin live, generate version-controlled quotation.
- **Position Determination Engine** — resource estimation with headcount × duration × monthly rate, billing markup, cost / revenue / margin / margin % roll-ups.
- **Approval workflow** — 4-step chain (Sales Exec → Sales Manager → Business Head → Finance), comments, rejections, audit trail.
- **Rate cards** — Manpower (designation/experience/grade/location/hourly-daily-monthly), Non-Manpower (category/unit/tax/margin), License (product/edition/duration/cost/margin).
- **Customers** — master with contacts, industry, billing/shipping, GST and engagement summary.
- **Activities** — calls, meetings, emails, follow-ups, tasks — unified timeline.
- **Approvals queue** — global view of pending and historical approvals.
- **Reports** — lead conversion, opportunity funnel, RFQ status, quotation report, win/loss, sales performance.
- **Admin** — users, roles, territories, business units, approval chains.

---

## 🚀 Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# Fill DATABASE_URL (Supabase or local Postgres), AUTH_SECRET, AUTH_GOOGLE_ID/SECRET

# 3. Schema + seed
npm run db:push
npm run db:seed

# 4. Run
npm run dev
# Open http://localhost:3000
```

**Demo login** (seeded):

| Email                 | Password      | Role           |
| --------------------- | ------------- | -------------- |
| `admin@nova.crm`      | `password123` | ADMIN          |
| `manager@nova.crm`    | `password123` | SALES_MANAGER  |
| `sales@nova.crm`      | `password123` | SALES_EXEC     |
| `finance@nova.crm`    | `password123` | FINANCE        |

---

## 🔐 Environment variables

| Var                          | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL` / `DIRECT_URL`| Postgres (Supabase or local).                                |
| `AUTH_SECRET`                | NextAuth JWT secret. `openssl rand -base64 32`.              |
| `AUTH_URL` / `AUTH_TRUST_HOST` | Base URL for Auth.js callbacks.                            |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client.                              |
| `OTP_PROVIDER`               | `mock` (default — returns code in dev), or wire SES/Twilio.  |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_URL` | App identity & canonical URL.              |

---

## 🧱 Tech stack & decisions

- **Next.js 15 App Router** — server components for fast initial paints, route handlers for `/api/*`, server actions enabled.
- **Auth.js v5 (NextAuth beta)** — Prisma adapter, JWT strategy, Google + Credentials + OTP providers.
- **Prisma + Postgres** — strict relational schema modelling Organization, User, Lead, Opportunity, RFQ, Quotation, RateCards, Approvals, Activities, Documents, Notifications. All multi-tenanted via `organizationId`.
- **Tailwind + shadcn-style UI primitives** — Radix headless + design-system tokens, glassmorphism + custom gradients & shadows, dark mode default.
- **Framer Motion** — page transitions, list reorder (`layoutId`), KPI animation, pipeline drag visual feedback.
- **Recharts** — area + pie + custom funnel.
- **cmdk** — command palette (⌘K).
- **Sonner** — toasts.

---

## 🧮 Position Determination Engine

`src/lib/position-engine.ts` exposes:

```ts
estimateRole({ designation, headcount, durationMonths, monthlyRate, markupPct }) → {
  monthlyBilling, cost, revenue, margin, marginPct
}
estimateFleet([demands]) → { rows, totals: { cost, revenue, margin, marginPct, headcount } }
```

Drives the Quotation Builder's live dashboard and stores per-position estimates on `PositionEstimate`.

---

## 🛂 Approval workflow

Default chain (`src/lib/constants.ts` → `APPROVAL_CHAIN_DEFAULT`):

```
Sales Executive → Sales Manager → Business Head → Finance → Approved
```

- `POST /api/quotations/:id/approve` with `{ action: SUBMIT | APPROVE | REJECT, comments? }`.
- Maintains step history (`ApprovalStep`) with approver, comments, timestamps — full audit trail.

---

## 📁 Project structure

```
src/
  app/
    (auth)/login, signup, forgot-password
    app/                        # protected workspace
      page.tsx                  # dashboard
      leads/                    # list + detail + convert
      opportunities/            # list + detail
      pipeline/                 # Kanban
      rfqs/                     # list + new + detail
      quotations/               # list + builder + detail
      customers/, activities/, rate-cards/
      approvals/, reports/, admin/
    api/                        # route handlers
      auth/, signup, otp/issue
      leads, opportunities, rfqs, quotations, rate-cards, customers
      quotations/[id]/approve
  components/
    ui/                         # shadcn-style primitives
    app/                        # shell (sidebar/topbar/command palette)
    dashboard/, leads/, pipeline/, rfq/, quotation/
  lib/
    auth.ts, prisma.ts, otp.ts, numbering.ts
    position-engine.ts, quotation-engine.ts
    dashboard-data.ts, constants.ts, utils.ts
prisma/
  schema.prisma                 # full data model
  seed.ts                       # rich demo seed
```

---

## ▲ Deploying to Vercel

1. Push to GitHub.
2. Import on Vercel → choose the repo.
3. Set env vars (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*`).
4. Run a one-time `prisma db push` and `prisma db seed` against your production DB (via Vercel CLI or your Postgres host).
5. Deploy. `vercel.json` is pre-configured (`prisma generate` runs in the build).

For Supabase: use the **session pooler** URL for `DATABASE_URL` (with `?pgbouncer=true&connection_limit=1`) and the **direct** URL for `DIRECT_URL`.

---

## 🛣 Roadmap shortlist

- File uploads → S3 / Supabase Storage with signed URLs (currently stores metadata only).
- AI-powered global search backed by `pgvector` embeddings.
- Web push + email digests for notifications.
- Excel/CSV bulk import for leads & rate cards.
- Multi-currency FX with snapshot rates per quotation.
- PDF export of quotations with branded template.

---

Crafted with care. Ship it.
