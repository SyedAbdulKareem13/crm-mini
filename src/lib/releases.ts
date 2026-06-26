/**
 * Release notes & roadmap — content surfaced in /app/releases and the
 * "What's new" dialog. Plain data (not user data), edited per release.
 */

export const CURRENT_VERSION = "0.9.0";

export type ChangeType = "new" | "improved" | "fixed";

export type Release = {
  version: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  summary: string;
  items: { type: ChangeType; text: string }[];
};

export const RELEASES: Release[] = [
  {
    version: "0.9.0",
    date: "2026-06-26",
    title: "Activities & no-code field configuration",
    summary: "A full activity timeline on Leads and Opportunities, plus an Admin Configuration studio where every module's fields and activity types are configured from the frontend.",
    items: [
      { type: "new", text: "Activity timeline on every Lead and Opportunity — log calls, meetings, emails, follow-ups, tasks and notes, then mark them done. Each entry shows the owner and a relative timestamp and is mirrored into the record's audit trail." },
      { type: "new", text: "Admin → Configuration: a no-code studio to tailor the app to your process — no redeploy needed." },
      { type: "new", text: "Field configuration for every module (Leads, Opportunities, Customers, Quotations, RFQs and Activities) — show or hide fields, rename labels, mark them required, reorder by drag, and add your own custom fields." },
      { type: "new", text: "Activity types are configurable — relabel, recolour, pick an icon, reorder and toggle Call / Meeting / Email / Follow-up / Task / Note to match how your team works." },
      { type: "improved", text: "The Lead form now renders live from its field configuration — hide, rename, reorder or require a field in Admin and the form follows instantly." },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-06-26",
    title: "Manz AI & editable quotations",
    summary: "A conversational AI workspace, one-step AI quotation drafting, and fully editable quotes with a transparent audit trail.",
    items: [
      { type: "new", text: "Manz AI workspace — a conversational copilot with capability cards and a live “what Manz AI noticed” pipeline insights feed, plus a one-click Manz AI launcher in the top bar." },
      { type: "new", text: "Draft with AI on Quotations — turn a plain-English brief (“3-month Salesforce CRM for a healthcare provider; 1 PM, 2 Developers, 1 QA; Fixed Price”) into a complete quotation: team, line items, pricing and margin." },
      { type: "improved", text: "AI drafts price each role from your manpower rate cards via smart designation matching, with indicative fallbacks where no card matches." },
      { type: "new", text: "AI-drafted quotations are flagged with an “AI” mark in the Quotations list." },
      { type: "new", text: "Edit quotations — change line items, pricing and terms with live totals; every change is captured in a transparent, field-level audit trail." },
      { type: "new", text: "RFQ parser, company lookup and email writer built into Manz AI." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-06-26",
    title: "Immersive landing & theming",
    summary: "A switchable WebGL hero, full-page theming, a polished Graphite dark mode and a dedicated deployment.",
    items: [
      { type: "new", text: "v2 immersive hero for the public site — a WebGL “guide every deal to its destination” scene with a drag-to-win deal card; switch v1 ⇄ v2 from Admin → Landing (Supabase-backed)." },
      { type: "improved", text: "Full-page theme switching with a smooth fade; the hero toggle moves Platinum ⇄ Graphite and carries across the app and login." },
      { type: "improved", text: "Graphite dark theme refined (Platinum coral on near-black) and now renders every component correctly." },
      { type: "improved", text: "Consistent theme switcher (all accents + dark) across the top bar, landing and auth pages; brand Najm-star favicon." },
      { type: "new", text: "Dedicated manzilone.vercel.app deployment with its own GitHub repo." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-06-25",
    title: "Premium polish & UX fixes",
    summary: "Sharper pipeline, elegant date pickers, instant profile photo and a hardened session.",
    items: [
      { type: "improved", text: "Pipeline board now fits the viewport with internally-scrolling columns — no more overflow." },
      { type: "improved", text: "Opportunity stage control redesigned as an aligned, premium stage-rail grid." },
      { type: "new", text: "Elegant calendar date pickers across the Opportunity, RFQ and Quotation forms." },
      { type: "fixed", text: "“Add Customer” now opens a full create dialog and saves correctly." },
      { type: "improved", text: "Profile photo updates the top bar instantly after upload — no reload." },
      { type: "fixed", text: "Hardened the session cookie so large avatars can never break authentication." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-06-25",
    title: "Production hardening",
    summary: "Complete auth flows, full Admin master-data control, notifications and PDF export.",
    items: [
      { type: "new", text: "Forgot-password sends an OTP and lets you reset; Change Password added in Settings → Security." },
      { type: "new", text: "Admin can manage all master data — user roles, territories, business units and the approval chain." },
      { type: "new", text: "Working notifications bell with fetch and mark-as-read." },
      { type: "new", text: "Export Quotations and RFQs to a branded, print-ready PDF." },
      { type: "new", text: "Profile settings: avatar upload, name and mobile." },
      { type: "new", text: "Six accent themes (Platinum default) plus a warm-dark Graphite." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-06-24",
    title: "Opportunities & leads editing",
    summary: "Create/edit dialogs and a click-to-move stage control.",
    items: [
      { type: "fixed", text: "“Add Opportunity” now works end-to-end with a proper create dialog." },
      { type: "new", text: "Edit dialogs for Leads and Opportunities." },
      { type: "new", text: "Click-to-move pipeline stage control on the opportunity detail page." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-06-23",
    title: "Manzil One brand & Platinum theme",
    summary: "New identity, the Platinum theme as default, and an Apple-grade performance pass.",
    items: [
      { type: "new", text: "Rebrand to Manzil One — Najm guiding-star mark, “CRM Suite” and the Urdu wordmark." },
      { type: "new", text: "Platinum theme (warm, coral) set as default; Urdu beside every section header." },
      { type: "improved", text: "Refined primary-button gradient and a performance pass for faster loads and buttery scroll." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-06-21",
    title: "First cut — core CRM",
    summary: "The end-to-end revenue lifecycle, deployed.",
    items: [
      { type: "new", text: "Leads, Opportunities and a drag-and-drop Pipeline across 11 stages." },
      { type: "new", text: "RFQ, Quotation builder with the Position Determination Engine and approval workflow." },
      { type: "new", text: "Rate cards, Customers, Activities, Reports and Dashboard analytics." },
      { type: "new", text: "Authentication (email/password + OTP), multi-tenant org, deployed on Vercel + Supabase." },
    ],
  },
];

export type RoadmapStatus = "in_progress" | "planned";

export type RoadmapWeek = {
  week: string;
  range: string;
  items: { title: string; detail: string; status: RoadmapStatus }[];
};

export const ROADMAP: RoadmapWeek[] = [
  {
    week: "Week 1",
    range: "26 Jun – 2 Jul 2026",
    items: [
      { title: "Config-driven forms everywhere", detail: "Extend the live field configuration that now powers the Lead form to the Opportunity, Customer, Quotation and RFQ forms.", status: "in_progress" },
      { title: "Custom-field values across modules", detail: "Persist and display admin-defined custom fields on every record, not just Activities.", status: "planned" },
      { title: "Task creation with confirmation", detail: "Create follow-up tasks with a confirm step, owner, due date and priority from the activity composer.", status: "planned" },
      { title: "Reminders & due-date nudges", detail: "Notifications for upcoming tasks, calls and meetings logged on the timeline.", status: "planned" },
    ],
  },
  {
    week: "Week 2",
    range: "3 Jul – 9 Jul 2026",
    items: [
      { title: "AI activity creation", detail: "Manz AI logs the right activity or task from a sentence — “call Priya at Crescent Capital Mon 3pm”.", status: "planned" },
      { title: "Email · Call · Meeting", detail: "Compose & send the AI-drafted email, log calls, and schedule meetings with reminders.", status: "planned" },
      { title: "Live Manz AI", detail: "Swap in a quota-enabled Gemini key (Supabase config) to turn on live chat, RFQ parsing and drafting.", status: "planned" },
      { title: "Merge Manz AI to production", detail: "Promote the AI workspace from dev to manzilone.vercel.app.", status: "planned" },
    ],
  },
];
