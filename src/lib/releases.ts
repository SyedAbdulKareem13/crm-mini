/**
 * Release notes & roadmap — content surfaced in /app/releases and the
 * "What's new" dialog. Plain data (not user data), edited per release.
 */

export const CURRENT_VERSION = "0.25.0";

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
    version: "0.25.0",
    date: "2026-07-22",
    title: "Arabic, end to end — full coverage & smoother pipelines",
    summary: "The multilingual system now reaches the whole product: dashboard, opportunities, pipeline, leads, tables, filters, the command palette and every menu translate — with Gulf-standard right-to-left layout throughout. Full Arabic is selectable on staging. The lifecycle and pipeline-stage strips are now smooth, scrollbar-free carousels.",
    items: [
      { type: "new", text: "Full-Arabic interface across the app — dashboard KPIs and widgets, opportunities (list, detail and dialogs), the pipeline board and stage stepper, leads, tables, filters, breadcrumbs, the command palette, notifications and the profile menu all localize." },
      { type: "new", text: "Full Arabic can now be selected as the interface language on staging (Language → Arabic); real production stays gated until native-linguist review." },
      { type: "improved", text: "Right-to-left polish to a Gulf-standard bar: logical spacing and alignment, mirrored directional icons, correct ellipsis and punctuation, and stage names resolved from a single source so they read consistently everywhere." },
      { type: "improved", text: "The lifecycle flow strip and the pipeline-stage strip are now scrollbar-free carousels — hidden scrollbar, on-demand ‹ › arrows that disable at the ends, plus wheel and drag-to-scroll, all RTL-aware and honouring reduced-motion." },
      { type: "improved", text: "Every localized string keeps a built-in English fallback, so the interface stays pixel-perfect in English before a translation pack is loaded and switches to Arabic the moment it is." },
      { type: "improved", text: "Arabic integrity safeguard unchanged: only secular business terminology is machine-drafted (as reviewable drafts), no religious or Qur'anic content is machine-generated, and Full Arabic remains gated from production pending native-linguist and scholarly review." },
    ],
  },
  {
    version: "0.24.0",
    date: "2026-07-22",
    title: "Multilingual foundation — English, Urdu & Arabic (with RTL)",
    summary: "A configurable, database-driven localization system: pick your interface language and an optional second script beside headings, with full right-to-left support. English ships now; Urdu appears beside headings; Arabic is available for preview on staging and gated for production pending native-linguist review.",
    items: [
      { type: "new", text: "Language switcher — open it from the profile menu (Profile · Settings · Language · Sign out) or Settings → System Settings. Choose your interface language and, optionally, a second script shown beside English headings and navigation." },
      { type: "new", text: "Four presentation modes composed from configuration: Full English, English + Urdu, English + Arabic, and Full Arabic — with more languages addable through data alone, no code changes." },
      { type: "new", text: "Complete right-to-left (RTL) support: mirrored layout, navigation, breadcrumbs and directional icons, with an Arabic-capable font stack." },
      { type: "new", text: "Your language choice is saved to your account and restores automatically across devices when you sign in." },
      { type: "improved", text: "Enterprise-grade i18n architecture — namespaced, lazy-loaded, version-cached translations with English fallback and missing-key detection; every string is data-driven from Supabase." },
      { type: "improved", text: "Arabic integrity safeguard: no religious or Qur'anic terminology is machine-generated, and Full Arabic stays gated from production until reviewed and approved by a qualified native linguist and, for any Islamic terminology, appropriate scholarly review." },
    ],
  },
  {
    version: "0.23.1",
    date: "2026-07-22",
    title: "A more premium lifecycle pipeline",
    summary: "The Lead → Opportunity → RFQ → Quotation → Approval → Won → Project strip at the top of every record is redrawn as a polished, connected progress rail with animation — clearer at a glance and worthy of the workspace around it.",
    items: [
      { type: "improved", text: "The flow strip is now a continuous progress rail: connectors fill in emerald as each stage completes, the current stage glows with a soft animated halo, and completed stages carry a gradient check." },
      { type: "improved", text: "Every station animates in with a gentle stagger; hovering a clickable stage lifts it; pending stages read clearly as “not reached” instead of washed-out boxes." },
      { type: "improved", text: "Honours reduced-motion preferences and still scrolls neatly inside its own lane on narrow screens — the page never widens." },
    ],
  },
  {
    version: "0.23.0",
    date: "2026-07-22",
    title: "Enterprise role tiers",
    summary: "A cleaner role ladder — Super User, Super Admin, Admin, Sales Owner, Sales Head, Business Head, Finance Analyst, Finance Head — with a clear separation between who can use the platform and who can grant access.",
    items: [
      { type: "new", text: "Super User and Super Admin have full access to everything; only the Super Admin can grant access — onboard employees and edit the permission matrix." },
      { type: "new", text: "The client-side Admin role is fully tunable in the access matrix (it no longer holds unconditional access), with sensible starting defaults for every sales and finance role." },
      { type: "improved", text: "The Admin area now appears in the navigation only for Super Admin, Super User and Admin; the last active Super Admin is protected from demotion or deactivation." },
    ],
  },
  {
    version: "0.22.1",
    date: "2026-07-22",
    title: "Sign-in reliability",
    summary: "Cleaner, more honest authentication — clear messages instead of confusing failures, and a Google button that only appears where it actually works.",
    items: [
      { type: "fixed", text: "Requesting an OTP for an address with no account now says so immediately, instead of failing later as “invalid or expired code”; email is matched case-insensitively and codes are trimmed." },
      { type: "fixed", text: "“Continue with Google” now performs a real redirect and is shown only where Google sign-in is configured — no more dead button." },
      { type: "improved", text: "Deactivated accounts are refused at sign-in with a clear message." },
    ],
  },
  {
    version: "0.22.0",
    date: "2026-07-21",
    title: "Role-based access & real employee onboarding",
    summary: "A full permission matrix — READ / CREATE / UPDATE / DELETE plus Cancel, Reopen and Approve per module and role — enforced on every API, reflected in the navigation, and paired with proper employee onboarding.",
    items: [
      { type: "new", text: "Access matrix in Admin — every role's permissions across all eleven modules as editable toggles; the Admin role always keeps full access so an organisation can never lock itself out." },
      { type: "new", text: "Enforced everywhere — every create, update, delete, cancel, reopen and approve API checks the matrix server-side; modules a role can't read disappear from the navigation and redirect if visited; the Cancel button only renders for roles allowed to cancel." },
      { type: "new", text: "Onboard employees — Admin → Users creates a member with name, email and role, and shows a one-time temporary password to share securely; they must set their own password on first sign-in (a banner follows them until they do)." },
      { type: "new", text: "Safety rails — you can't demote or deactivate the last admin, change your own role, or deactivate yourself." },
      { type: "improved", text: "Authentic sign-in — the demo credentials are gone from the login form; everyone enters their own." },
    ],
  },
  {
    version: "0.21.0",
    date: "2026-07-21",
    title: "The visual sales lifecycle",
    summary: "Every record now shows its whole journey — Lead → Opportunity → RFQ → Quotation → Approval → Won → Project — with click-through stages, controlled cancellation with reasons, role-gated reopen, and one consistent status color language everywhere.",
    items: [
      { type: "new", text: "Lifecycle flow strip on every Lead, Opportunity, RFQ, Quotation and Project — completed stages in green with a ✓, the record you're on in blue, pending in grey, cancelled in red; click any stage to open its record, with Prev/Next navigation across the chain." },
      { type: "new", text: "Breadcrumb navigation (Home > Leads > OPP-x > …) derived from the same thread, so the path is always truthful." },
      { type: "new", text: "Cancel at every stage — a mandatory reason, timestamp and user are captured, the record becomes read-only (enforced on the server, not just the screen), and the owner is notified." },
      { type: "new", text: "Reopen cancelled records — Sales Managers, Business Heads and Admins can restore a record to exactly the status it held before cancellation; everything is audit-trailed." },
      { type: "new", text: "Guard rails: won opportunities, converted leads and accepted quotations can't be cancelled, and an opportunity with a live delivery project asks you to resolve the project first." },
      { type: "new", text: "Stage timeline and Lifecycle history cards — created / submitted / approved / rejected / cancelled moments with user and time, plus the full merged activity trail across the whole chain." },
      { type: "new", text: "Workflow chain validation (configurable, off by default): require opportunities to start from leads, RFQs from opportunities, and quotations from RFQs — Admin → SAP Projects." },
      { type: "improved", text: "One status color language across the app: green completed, blue current, yellow in progress, orange pending approval, red cancelled, grey draft." },
    ],
  },
  {
    version: "0.20.1",
    date: "2026-07-20",
    title: "Navigate everywhere, on every screen",
    summary: "Phones, tablets and narrow windows now reach the whole app: a More sheet on the mobile bar, the full sidebar from tablet widths, and the Product Document refreshed to cover every feature.",
    items: [
      { type: "new", text: "“More” on the mobile bottom bar — a springy sheet with every destination (Projects, Manz AI, Reports, Admin and more), active highlighting, and tap-outside to close." },
      { type: "improved", text: "The full sidebar now appears from tablet widths (768px) — phones in “desktop site” mode and iPads get real navigation instead of a stripped bar." },
      { type: "fixed", text: "Page content no longer hides behind the mobile bottom bar." },
      { type: "improved", text: "Product Document v3.0 — the full lifecycle, every module and 30 business scenarios, on the Manzil One letterhead (docs/Manzil-One-Documentation.pdf)." },
    ],
  },
  {
    version: "0.20.0",
    date: "2026-07-19",
    title: "Working calendars, RAID & an estimator that learns",
    summary: "Schedules now respect your working week and holidays, every project gets a structured RAID register, and the AI Estimator calibrates itself from your completed projects.",
    items: [
      { type: "new", text: "Working-day calendar — set your working weekdays and holidays in Admin → SAP Projects; the Gantt shades non-working days, dragged bars snap to working days, and auto-shifted tasks never land on a weekend or holiday." },
      { type: "new", text: "RAID register — a fifth planner view for Risks, Assumptions, Issues and Dependencies with severity, probability, owners (notified on assignment), mitigations and due dates with overdue flags. Open risks lead the generated proposal automatically." },
      { type: "new", text: "Estimator self-calibration — completing a project freezes its actual duration and logged hours; every new estimate then applies your organisation's median actual-vs-estimate factors and shows a “Calibrated · N completed projects” badge." },
      { type: "improved", text: "The project header counts open risks at a glance." },
    ],
  },
  {
    version: "0.19.0",
    date: "2026-07-17",
    title: "Baselines, drag-to-reschedule, live co-planning & exports",
    summary: "The Gantt becomes a full planning surface — snapshot a baseline, drag bars to reschedule, plan together in realtime, and hand the plan to any PMO in their format.",
    items: [
      { type: "new", text: "Baselines — snapshot the committed schedule and track planned-vs-actual as ghost bars with days-ahead/behind variance; re-baseline under change control." },
      { type: "new", text: "Drag-to-reschedule — move a bar to shift a task, drag its right edge to resize; dates persist and dependent tasks cascade automatically." },
      { type: "new", text: "Exports: Microsoft Project XML (phases, links, resources, % complete), Excel schedule sheet, a print-ready A4 plan PDF, and CSV." },
      { type: "new", text: "Realtime co-planning — presence avatars show who's viewing a project; every edit syncs to teammates instantly, including the activity feed." },
      { type: "new", text: "Overdue task alerts arrive in the notification bell automatically — no setup needed." },
      { type: "new", text: "Build any methodology from scratch — create methodologies, phases and transformation types in Admin (Agile, Waterfall, Oracle OUM…); in-use templates are delete-protected." },
    ],
  },
  {
    version: "0.18.0",
    date: "2026-07-15",
    title: "The Executive Dashboard",
    summary: "Eight live leadership widgets on the home dashboard — every number computed by the same code as the page it summarises, so nothing ever disagrees.",
    items: [
      { type: "new", text: "Pipeline by SAP Product, Revenue Forecast by month, Resource Utilization, Win Probability (pipeline vs realized), Gross Margin, Project Health, Duration Benchmarks and Delivery Capacity — each deep-links to its module." },
      { type: "fixed", text: "The app shell no longer stretches horizontally on narrower screens — wide Gantt timelines scroll inside their own pane on every page." },
    ],
  },
  {
    version: "0.17.0",
    date: "2026-07-13",
    title: "Dependencies, critical path & the workload board",
    summary: "Tasks can now depend on each other with automatic rescheduling, the critical path lights up, progress is tracked in % and hours, and a 12-week heatmap shows everyone's load across projects.",
    items: [
      { type: "new", text: "Finish-to-start dependencies with connector arrows — link any tasks; self, duplicate, cross-project and circular links are rejected with clear messages." },
      { type: "new", text: "Auto-shift — when a predecessor slips, every downstream task moves forward automatically, with a toast counting the moves and a full audit entry." },
      { type: "new", text: "Critical path — one click highlights the longest dependency chain driving your end date." },
      { type: "new", text: "% complete and effort hours on every task — quick 25/50/75/100 buttons, estimate vs actual hours, and phase/project completion rolled up from real progress." },
      { type: "new", text: "Resource workload board — a 12-week per-member heatmap across all active projects with overload flags (>2 concurrent tasks or >40h/week) and an unassigned-work pool." },
    ],
  },
  {
    version: "0.16.0",
    date: "2026-07-10",
    title: "Resource Optimizer & the AI Proposal Generator",
    summary: "From the estimate: a full staffing plan with onsite/offshore mix and peak periods — and a complete client-ready proposal assembled in one click.",
    items: [
      { type: "new", text: "Resource Optimizer — consultants and FTE-months, onsite/offshore mix, functional:technical ratio, PMO & QA sizing and peak staffing per phase, all derived from the estimate." },
      { type: "new", text: "GCC mode — Arabic-speaking consultant coverage, a local engagement lead and localization scope notes for Gulf engagements." },
      { type: "new", text: "Deliverable library — twelve reusable artifacts (Project Charter, RAID Log, Cutover Plan, Hypercare Checklist…) added to their natural phase in one click." },
      { type: "new", text: "AI Proposal Generator — executive summary (AI-polished), in/out of scope from your actual characteristics, approach and timeline, resource plan, commercials with payment milestones, risks and acceptance criteria — printed to PDF on the letterhead." },
    ],
  },
  {
    version: "0.15.0",
    date: "2026-07-08",
    title: "The AI Estimator & Costing engine",
    summary: "Fifteen solution characteristics become duration, phase effort, an 8-role resource mix and a priced estimate — grounded in your own rate cards and reproducible every time.",
    items: [
      { type: "new", text: "AI Estimator — enter users, countries, entities, plants, interfaces, RICEFW counts, testing cycles and more; get complexity, duration, effort by SAP Activate phase and a full role-cost table with rate-card provenance." },
      { type: "new", text: "Costing — implementation cost, contingency, customer price and gross margin, with every assumption disclosed." },
      { type: "new", text: "One-click “Draft quotation from estimate” — man-month line items and positions generate through the same engine as manual quotes, linked to the opportunity." },
      { type: "new", text: "Assigning a task now notifies the assignee in the bell." },
      { type: "improved", text: "The projects list gains a portfolio strip: total, active, at-risk, delayed and completed at a glance." },
    ],
  },
  {
    version: "0.14.0",
    date: "2026-07-06",
    title: "The Gantt chart & delivery governance",
    summary: "A zoomable month/week Gantt derived from the same roadmap configs, plus org-level governance switches for how strictly delivery runs.",
    items: [
      { type: "new", text: "Gantt view on every project — phase bars with progress fill, milestone diamonds, task bars with assignee initials, overdue rings, a today line and zoom; explicit dates override the derived schedule." },
      { type: "new", text: "Task scheduling — start/end dates, priority and assignee editable right from the chart; per-phase task add/remove in the roadmap view." },
      { type: "new", text: "Governance switches: sequential phase execution and completion-requires-all-phases — every enforcement message names the setting that controls it." },
      { type: "new", text: "CSV export of the full schedule." },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-07-03",
    title: "Projects & the SAP Transformation Hub",
    summary: "Manzil One grows from CRM into delivery: convert opportunities into projects that run configurable SAP Activate roadmaps, guarded by pipeline stage gates.",
    items: [
      { type: "new", text: "Projects module — convert any opportunity into a PRJ-numbered project; pick from fifteen SAP transformation types (Greenfield, Brownfield, Bluefield, rollouts, upgrades, BTP…) and its methodology instantiates the full roadmap." },
      { type: "new", text: "SAP Activate methodology templates (S/4HANA Private 45wk, Public Cloud 30wk) with phases, durations, colors and deliverable libraries — all editable in Admin → SAP Projects." },
      { type: "new", text: "Project Planner — a proportional phase timeline with click-to-cycle deliverable status, health chips (on track / at risk / delayed) and progress." },
      { type: "new", text: "Pipeline stage gates — require an approved quotation and/or a project from configurable stages; blocked moves explain themselves and name the setting." },
      { type: "new", text: "Projects joins the navigation, global search and the audit trail." },
    ],
  },
  {
    version: "0.12.0",
    date: "2026-07-01",
    title: "A calmer, richer landing",
    summary: "The immersive WebGL hero got a considered ambient polish — fewer, slower elements that guide the eye instead of competing for it.",
    items: [
      { type: "improved", text: "Hero v2 ambient pass — decluttered orbiters and comets, gentler motion, and the drag-to-win deal card front and centre." },
      { type: "improved", text: "Activity timeline updates instantly after logging, activities are editable, and the date picker got the premium calendar treatment." },
      { type: "new", text: "The nav-bar Manz AI button breathes with the same orb animation as the workspace." },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-06-29",
    title: "AI activity logging & configuration everywhere",
    summary: "Type “call Priya at Crescent Capital Mon 3pm” into ⌘K and Manz AI logs it on the right record. RFQ and Quotation forms join the configuration studio, and drag-reorder now drives form layout.",
    items: [
      { type: "new", text: "Manz AI activity logging — type a plain sentence in the ⌘K palette (“call Priya at Crescent Capital Mon 3pm”) and the right activity is created on the right lead or opportunity, with the type, subject and due time understood automatically (IST)." },
      { type: "new", text: "RFQ and Quotation forms now render admin-defined custom fields and honour configured labels, visibility and required — every module is configuration-driven end to end." },
      { type: "improved", text: "Admin drag-reorder now fully drives form layout on Leads, Opportunities and Customers — core and custom fields flow in one configured order." },
      { type: "improved", text: "Editing a quotation preserves custom-field values (key-wise merge)." },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-06-29",
    title: "Per-type activity fields, custom fields everywhere & global search",
    summary: "Each activity type can have its own field set, custom fields now save on every module form, the whole app is searchable from ⌘K, and navigation got a buttery motion pass.",
    items: [
      { type: "new", text: "Per-activity-type fields — scope any activity field (core or custom) to specific types with the new “Applies to” picker in Admin → Configuration; logging a Call, Meeting or Note now shows only that type's fields, with smooth animated swaps." },
      { type: "new", text: "Custom fields with saved values on Leads, Opportunities and Customers — admin-defined fields render on the forms, honour required, and display on the record with their configured labels." },
      { type: "improved", text: "Opportunity and Customer forms are now config-driven (label, show/hide, required) like the Lead form." },
      { type: "new", text: "Global search in the ⌘K palette — live results across leads, opportunities, customers, RFQs and quotations; jump straight to any record." },
      { type: "improved", text: "Motion pass: soft page transitions, staggered dashboard cards and hover-lift throughout — honouring reduced-motion preferences." },
    ],
  },
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
    week: "Next up",
    range: "21 Jul – 3 Aug 2026",
    items: [
      { title: "Timesheets & budget burn", detail: "Log time per day against tasks, track actual cost against the estimate, and tie invoicing to the proposal's payment milestones.", status: "in_progress" },
      { title: "Teams / Slack notifications", detail: "Assignments, overdue tasks and stage changes pushed to your workspace channels.", status: "planned" },
    ],
  },
  {
    week: "On the horizon",
    range: "Aug 2026",
    items: [
      { title: "Deeper scheduling", detail: "SS/FF/SF dependency types, lag and lead times, and multiple baselines with comparison.", status: "planned" },
      { title: "Named-resource optimization", detail: "A skills matrix that matches estimate roles to actual consultants and their availability.", status: "planned" },
      { title: "Client surfaces", detail: "A customer portal for quotation acceptance with e-signature, plus scheduled executive email digests.", status: "planned" },
    ],
  },
];
