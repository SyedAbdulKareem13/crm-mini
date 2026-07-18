import type { OpportunityStage } from "@prisma/client";

export const OPP_STAGES: { value: OpportunityStage; label: string; probability: number; tone: string }[] = [
  { value: "QUALIFICATION", label: "Qualification", probability: 10, tone: "from-slate-500/20 to-slate-500/5" },
  { value: "DISCOVERY", label: "Discovery", probability: 20, tone: "from-blue-500/20 to-blue-500/5" },
  { value: "REQUIREMENT_ANALYSIS", label: "Requirement Analysis", probability: 30, tone: "from-cyan-500/20 to-cyan-500/5" },
  { value: "PROPOSAL_SUBMITTED", label: "Proposal Submitted", probability: 40, tone: "from-teal-500/20 to-teal-500/5" },
  { value: "RFQ_RECEIVED", label: "RFQ Received", probability: 50, tone: "from-emerald-500/20 to-emerald-500/5" },
  { value: "QUOTATION_SENT", label: "Quotation Sent", probability: 60, tone: "from-lime-500/20 to-lime-500/5" },
  { value: "NEGOTIATION", label: "Negotiation", probability: 70, tone: "from-amber-500/20 to-amber-500/5" },
  { value: "MANAGEMENT_APPROVAL", label: "Mgmt Approval", probability: 80, tone: "from-orange-500/20 to-orange-500/5" },
  { value: "VERBAL_CONFIRMATION", label: "Verbal Confirmation", probability: 90, tone: "from-fuchsia-500/20 to-fuchsia-500/5" },
  { value: "WON", label: "Won", probability: 100, tone: "from-green-500/30 to-green-500/5" },
  { value: "LOST", label: "Lost", probability: 0, tone: "from-rose-500/20 to-rose-500/5" },
];

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "EMAIL_CAMPAIGN",
  "EVENT",
  "PARTNER",
  "SOCIAL",
  "OTHER",
] as const;

export const INDUSTRIES = [
  "Software & Technology",
  "Banking & Finance",
  "Pharma & Healthcare",
  "Manufacturing",
  "Retail & E-Commerce",
  "Telecom",
  "Energy & Utilities",
  "Government",
  "Education",
  "Consulting",
];

export const APPROVAL_CHAIN_DEFAULT = [
  { stepNumber: 1, label: "Sales Executive", roleRequired: "SALES_EXEC" as const },
  { stepNumber: 2, label: "Sales Manager", roleRequired: "SALES_MANAGER" as const },
  { stepNumber: 3, label: "Business Head", roleRequired: "BUSINESS_HEAD" as const },
  { stepNumber: 4, label: "Finance", roleRequired: "FINANCE" as const },
];

export const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/app/ai", label: "Manz AI", icon: "WandSparkles" },
  { href: "/app/leads", label: "Leads", icon: "Sparkles" },
  { href: "/app/opportunities", label: "Opportunities", icon: "Target" },
  { href: "/app/pipeline", label: "Pipeline", icon: "Kanban" },
  { href: "/app/rfqs", label: "RFQs", icon: "FileText" },
  { href: "/app/quotations", label: "Quotations", icon: "Receipt" },
  { href: "/app/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/app/customers", label: "Customers", icon: "Building2" },
  { href: "/app/activities", label: "Activities", icon: "CalendarClock" },
  { href: "/app/rate-cards", label: "Rate Cards", icon: "BadgeDollarSign" },
  { href: "/app/approvals", label: "Approvals", icon: "ShieldCheck" },
  { href: "/app/reports", label: "Reports", icon: "BarChart3" },
  { href: "/app/audit", label: "Audit Log", icon: "History" },
  { href: "/app/releases", label: "What's New", icon: "Rocket" },
  { href: "/app/admin", label: "Admin", icon: "Settings" },
] as const;
