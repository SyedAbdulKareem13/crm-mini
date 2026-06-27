import { PrismaClient, OpportunityStage, LeadSource, ActivityType, ActivityStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* Dates are anchored to "now" so the dashboard, pipeline and timelines always
 * look current/real-time whenever the seed is run. */
const NOW = new Date();
const day = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * day);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * day);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);

async function main() {
  console.log("🌱 Seeding Manzil One (demo-ready, real-time dates)…");

  // ----- Organization -----
  const org = await prisma.organization.upsert({
    where: { slug: "nova-tech" },
    update: {},
    create: {
      name: "Manzil One Technologies",
      slug: "nova-tech",
      industry: "Consulting & Software Services",
      country: "India",
      currency: "INR",
    },
  });

  // ----- Territories / Business Units -----
  const [india, mea, americas] = await Promise.all([
    prisma.territory.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "India" } },
      update: {},
      create: { organizationId: org.id, name: "India", region: "APAC" },
    }),
    prisma.territory.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "MEA" } },
      update: {},
      create: { organizationId: org.id, name: "MEA", region: "Middle East & Africa" },
    }),
    prisma.territory.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Americas" } },
      update: {},
      create: { organizationId: org.id, name: "Americas", region: "North America" },
    }),
  ]);

  const [bu1, bu2] = await Promise.all([
    prisma.businessUnit.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "SAP Consulting" } },
      update: {},
      create: { organizationId: org.id, name: "SAP Consulting", code: "SAP" },
    }),
    prisma.businessUnit.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Digital Engineering" } },
      update: {},
      create: { organizationId: org.id, name: "Digital Engineering", code: "DE" },
    }),
  ]);

  // ----- Users -----
  const passwordHash = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nova.crm" },
    update: { organizationId: org.id, role: "ADMIN" },
    create: {
      email: "admin@nova.crm",
      name: "Aarav Sharma",
      mobile: "+91 98765 00001",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
      emailVerified: new Date(),
      territoryId: india.id,
      businessUnitId: bu1.id,
    },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@nova.crm" },
    update: { organizationId: org.id },
    create: {
      email: "manager@nova.crm",
      name: "Priya Iyer",
      passwordHash,
      role: "SALES_MANAGER",
      organizationId: org.id,
      emailVerified: new Date(),
      territoryId: india.id,
      businessUnitId: bu2.id,
    },
  });
  const exec = await prisma.user.upsert({
    where: { email: "sales@nova.crm" },
    update: { organizationId: org.id },
    create: {
      email: "sales@nova.crm",
      name: "Rohan Mehta",
      passwordHash,
      role: "SALES_EXEC",
      organizationId: org.id,
      emailVerified: new Date(),
      territoryId: mea.id,
      businessUnitId: bu1.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "finance@nova.crm" },
    update: { organizationId: org.id },
    create: {
      email: "finance@nova.crm",
      name: "Anika Verma",
      passwordHash,
      role: "FINANCE",
      organizationId: org.id,
      emailVerified: new Date(),
    },
  });

  // ----- Manpower Rate Cards -----
  await prisma.manpowerRateCard.deleteMany({ where: { organizationId: org.id } });
  await prisma.manpowerRateCard.createMany({
    data: [
      { organizationId: org.id, designation: "Junior Developer", experience: "0-2", grade: "L1", location: "Chennai", hourlyRate: 600, dailyRate: 4800, monthlyRate: 80000 },
      { organizationId: org.id, designation: "Senior Developer", experience: "6-10", grade: "L3", location: "Chennai", hourlyRate: 1500, dailyRate: 12000, monthlyRate: 220000 },
      { organizationId: org.id, designation: "Architect", experience: "10+", grade: "L4", location: "Bangalore", hourlyRate: 2400, dailyRate: 19200, monthlyRate: 380000 },
      { organizationId: org.id, designation: "QA Engineer", experience: "3-5", grade: "L2", location: "Pune", hourlyRate: 900, dailyRate: 7200, monthlyRate: 140000 },
      { organizationId: org.id, designation: "Project Manager", experience: "10+", grade: "L4", location: "Mumbai", hourlyRate: 2200, dailyRate: 17600, monthlyRate: 340000 },
      { organizationId: org.id, designation: "Business Analyst", experience: "3-5", grade: "L2", location: "Chennai", hourlyRate: 1100, dailyRate: 8800, monthlyRate: 170000 },
    ],
  });

  // ----- Non-Manpower Rate Cards -----
  await prisma.nonManpowerRateCard.deleteMany({ where: { organizationId: org.id } });
  await prisma.nonManpowerRateCard.createMany({
    data: [
      { organizationId: org.id, category: "Travel", description: "Domestic flight + hotel", unit: "trip", unitCost: 35000, tax: 5, marginPct: 10 },
      { organizationId: org.id, category: "Infrastructure", description: "On-prem server lease", unit: "month", unitCost: 50000, tax: 18, marginPct: 20 },
      { organizationId: org.id, category: "Cloud", description: "AWS bundle (m5.xlarge equivalent)", unit: "month", unitCost: 28000, tax: 18, marginPct: 20 },
      { organizationId: org.id, category: "Training", description: "1-day SAP S/4HANA workshop", unit: "session", unitCost: 120000, tax: 18, marginPct: 30 },
      { organizationId: org.id, category: "Consulting", description: "Solution architecture review", unit: "engagement", unitCost: 250000, tax: 18, marginPct: 35 },
    ],
  });

  // ----- License Rate Cards -----
  await prisma.licenseRateCard.deleteMany({ where: { organizationId: org.id } });
  await prisma.licenseRateCard.createMany({
    data: [
      { organizationId: org.id, product: "Microsoft 365", edition: "Business Premium", licenseType: "User", duration: "Yearly", cost: 14500, marginPct: 12 },
      { organizationId: org.id, product: "Salesforce", edition: "Enterprise", licenseType: "User", duration: "Yearly", cost: 18000, marginPct: 15 },
      { organizationId: org.id, product: "Jira", edition: "Cloud Standard", licenseType: "User", duration: "Yearly", cost: 7500, marginPct: 12 },
      { organizationId: org.id, product: "Power BI", edition: "Pro", licenseType: "User", duration: "Yearly", cost: 8800, marginPct: 12 },
      { organizationId: org.id, product: "SAP", edition: "S/4HANA Professional", licenseType: "Named User", duration: "Yearly", cost: 220000, marginPct: 18 },
    ],
  });

  // ----- Customers + realistic contacts -----
  const customerDefs: { name: string; industry: string; contacts: { name: string; designation: string; email: string; mobile: string; isPrimary?: boolean }[] }[] = [
    { name: "Aether Pharma", industry: "Pharma & Healthcare", contacts: [
      { name: "Dr. Meera Krishnan", designation: "Chief Information Officer", email: "meera.krishnan@aetherpharma.com", mobile: "+91 99860 14422", isPrimary: true },
      { name: "Sanjay Bhatt", designation: "Head of Procurement", email: "sanjay.bhatt@aetherpharma.com", mobile: "+91 99860 55190" },
    ] },
    { name: "Helios Energy", industry: "Energy & Utilities", contacts: [
      { name: "Vikram Desai", designation: "VP Technology", email: "vikram.desai@helios-energy.com", mobile: "+91 98201 33781", isPrimary: true },
      { name: "Ananya Pillai", designation: "Procurement Lead", email: "ananya.pillai@helios-energy.com", mobile: "+91 98201 77810" },
    ] },
    { name: "Northwind Bank", industry: "Banking & Finance", contacts: [
      { name: "Rahul Khanna", designation: "Chief Digital Officer", email: "rahul.khanna@northwindbank.com", mobile: "+91 99100 22455", isPrimary: true },
      { name: "Pooja Nair", designation: "Head of IT Sourcing", email: "pooja.nair@northwindbank.com", mobile: "+91 99100 88234" },
    ] },
    { name: "BlueCedar Retail", industry: "Retail & E-Commerce", contacts: [
      { name: "Karthik Menon", designation: "Head of Digital", email: "karthik.menon@bluecedar.com", mobile: "+91 97410 56612", isPrimary: true },
      { name: "Sneha Reddy", designation: "Procurement Manager", email: "sneha.reddy@bluecedar.com", mobile: "+91 97410 90021" },
    ] },
    { name: "Indus Manufacturing", industry: "Manufacturing", contacts: [
      { name: "Arjun Reddy", designation: "Director of Operations", email: "arjun.reddy@indusmfg.com", mobile: "+91 90030 41178", isPrimary: true },
      { name: "Divya Shah", designation: "Head of Sourcing", email: "divya.shah@indusmfg.com", mobile: "+91 90030 66520" },
    ] },
  ];

  const customers = await Promise.all(
    customerDefs.map((c) => upsertCustomer(org.id, c.name, c.industry))
  );
  await prisma.contact.deleteMany({ where: { customerId: { in: customers.map((c) => c.id) } } });
  await prisma.contact.createMany({
    data: customers.flatMap((c, i) =>
      customerDefs[i].contacts.map((ct) => ({ customerId: c.id, ...ct }))
    ),
  });

  // ----- Clean slate for transactional records (re-runnable) -----
  await prisma.activity.deleteMany({ where: { organizationId: org.id } });
  await prisma.quotation.deleteMany({ where: { organizationId: org.id } });
  await prisma.rFQ.deleteMany({ where: { organizationId: org.id } });
  await prisma.opportunity.deleteMany({ where: { organizationId: org.id } });
  await prisma.lead.deleteMany({ where: { organizationId: org.id } });

  // ----- Leads (realistic, recent) -----
  const leadDefs: { company: string; person: string; source: LeadSource; industry: string; revenue: number; status: string; ageDays: number; notes: string }[] = [
    { company: "Crescent Capital", person: "Priya Nair", source: "REFERRAL", industry: "Banking & Finance", revenue: 4200000, status: "QUALIFIED", ageDays: 41, notes: "Referred by Northwind Bank. Wants a CRM + analytics revamp; budget signed off for this quarter." },
    { company: "Vertex Logistics", person: "Aditya Rao", source: "WEBSITE", industry: "Logistics & Supply Chain", revenue: 2800000, status: "CONTACTED", ageDays: 33, notes: "Inbound via website. Exploring a TMS integration and fleet analytics." },
    { company: "Lumen Health Systems", person: "Dr. Kavya Rao", source: "EVENT", industry: "Pharma & Healthcare", revenue: 6500000, status: "QUALIFIED", ageDays: 28, notes: "Met at HealthTech Summit. Compliance-heavy; needs S/4HANA + patient portal." },
    { company: "Orbit Fintech", person: "Sameer Khan", source: "PARTNER", industry: "Banking & Finance", revenue: 3600000, status: "NEW", ageDays: 21, notes: "Partner-sourced. Payment gateway modernization on the table." },
    { company: "Greenfield Agritech", person: "Neha Joshi", source: "SOCIAL", industry: "Agriculture", revenue: 1500000, status: "NEW", ageDays: 18, notes: "LinkedIn outreach replied. Early stage — IoT for farm monitoring." },
    { company: "Apex Realty Group", person: "Rohit Saxena", source: "COLD_CALL", industry: "Real Estate", revenue: 2100000, status: "CONTACTED", ageDays: 14, notes: "Cold outreach. Interested in a CRM + lead-routing build." },
    { company: "Skyline Media", person: "Ananya Pillai", source: "WEBSITE", industry: "Media & Entertainment", revenue: 1900000, status: "NEW", ageDays: 9, notes: "Demo requested via website. Content workflow automation." },
    { company: "Ironclad Security", person: "Karthik Menon", source: "REFERRAL", industry: "Software & Technology", revenue: 5200000, status: "QUALIFIED", ageDays: 6, notes: "Strong referral. SOC platform + Power BI dashboards; fast timeline." },
    { company: "Zenith Pharma", person: "Meera Krishnan", source: "EVENT", industry: "Pharma & Healthcare", revenue: 4800000, status: "CONTACTED", ageDays: 3, notes: "Booth lead. Validation + serialization project." },
    { company: "Bluewave Telecom", person: "Suresh Iyer", source: "PARTNER", industry: "Telecom", revenue: 7400000, status: "NEW", ageDays: 1, notes: "Just in from partner. Large BSS/OSS modernization — high potential." },
  ];

  const createdLeads: { id: string; person: string; company: string; ownerId: string }[] = [];
  for (let i = 0; i < leadDefs.length; i++) {
    const d = leadDefs[i];
    const ownerId = i % 3 === 0 ? manager.id : exec.id;
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        leadNumber: `LD-${String(i + 1).padStart(5, "0")}`,
        name: d.person,
        company: d.company,
        contactPerson: d.person,
        email: `${d.person.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${d.company.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
        mobile: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
        source: d.source,
        industry: d.industry,
        expectedRevenue: d.revenue,
        territoryId: i % 2 === 0 ? india.id : mea.id,
        ownerId,
        status: d.status as any,
        notes: d.notes,
        createdAt: daysAgo(d.ageDays),
      },
    });
    createdLeads.push({ id: lead.id, person: d.person, company: d.company, ownerId });
  }

  // ----- Opportunities across stages (recent) -----
  const stages: OpportunityStage[] = [
    "QUALIFICATION", "DISCOVERY", "REQUIREMENT_ANALYSIS", "PROPOSAL_SUBMITTED",
    "RFQ_RECEIVED", "QUOTATION_SENT", "NEGOTIATION", "MANAGEMENT_APPROVAL",
    "VERBAL_CONFIRMATION", "WON", "LOST",
  ];
  const oppNames = [
    "S/4HANA Roll-out", "Digital Storefront Re-platform", "Cloud Migration Wave 2",
    "Salesforce CPQ Implementation", "Data Lake Modernization", "Power BI Center of Excellence",
    "Manufacturing IoT Platform", "Payment Gateway Integration", "Loyalty Engine Refresh",
    "Mobile App Refresh", "Procurement Automation",
  ];
  const createdOpps: { id: string; name: string; ownerId: string; customerId: string; stage: OpportunityStage }[] = [];
  for (let i = 0; i < stages.length; i++) {
    const customer = customers[i % customers.length];
    const stage = stages[i];
    const ownerId = i % 2 === 0 ? exec.id : manager.id;
    const opp = await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        oppNumber: `OPP-${String(i + 1).padStart(5, "0")}`,
        name: `${oppNames[i]} — ${customer.name}`,
        customerId: customer.id,
        ownerId,
        revenueOwnerId: manager.id,
        territoryId: india.id,
        businessUnitId: i % 2 === 0 ? bu1.id : bu2.id,
        expectedRevenue: 1500000 + i * 1250000,
        probability:
          stage === "WON" ? 100 :
          stage === "LOST" ? 0 :
          [10, 20, 30, 40, 50, 60, 70, 80, 90][i] ?? 25,
        expectedCloseDate: daysAhead((i + 2) * 7),
        stage,
        createdAt: daysAgo(60 - i * 4),
        notes: `Currently in ${stage.toLowerCase().replace(/_/g, " ")}. Owned by ${ownerId === exec.id ? "Rohan" : "Priya"}.`,
      },
    });
    createdOpps.push({ id: opp.id, name: opp.name, ownerId, customerId: customer.id, stage });
  }

  // ----- One full RFQ + Quotation chain on the RFQ_RECEIVED opp -----
  const rfqOpp = createdOpps.find((o) => o.stage === "RFQ_RECEIVED");
  if (rfqOpp) {
    const rfq = await prisma.rFQ.create({
      data: {
        organizationId: org.id,
        rfqNumber: "RFQ-00001",
        opportunityId: rfqOpp.id,
        customerId: rfqOpp.customerId,
        status: "RECEIVED",
        dueDate: daysAhead(14),
        currency: "INR",
        terms: "Payment Net-30. Onsite + offshore mix.",
        remarks: "Strategic customer — be aggressive on pricing.",
        lineItems: {
          create: [
            { lineType: "MANPOWER", description: "Senior Developer", quantity: 2, uom: "month", manpowerGrade: "Senior", manpowerExperience: "6-10", position: 0 },
            { lineType: "MANPOWER", description: "Architect", quantity: 1, uom: "month", manpowerGrade: "Architect", manpowerExperience: "10+", position: 1 },
            { lineType: "MANPOWER", description: "QA Engineer", quantity: 1, uom: "month", manpowerGrade: "QA", manpowerExperience: "3-5", position: 2 },
            { lineType: "SOFTWARE_LICENSE", description: "Power BI Pro", quantity: 25, uom: "Yearly", licenseProduct: "Power BI", position: 3 },
            { lineType: "NON_MANPOWER", description: "AWS Cloud Bundle", quantity: 6, uom: "month", position: 4 },
          ],
        },
      },
    });

    const items = [
      { itemType: "MANPOWER" as const, description: "Senior Developer (2× × 6 mo)", quantity: 12, uom: "month", unitCost: 220000, markupPct: 35, discountPct: 0, taxPct: 18, manpowerGrade: "Senior", manpowerExperience: "6-10" },
      { itemType: "MANPOWER" as const, description: "Architect (1× × 6 mo)", quantity: 6, uom: "month", unitCost: 380000, markupPct: 32, discountPct: 0, taxPct: 18, manpowerGrade: "Architect", manpowerExperience: "10+" },
      { itemType: "MANPOWER" as const, description: "QA Engineer (1× × 6 mo)", quantity: 6, uom: "month", unitCost: 140000, markupPct: 35, discountPct: 0, taxPct: 18, manpowerGrade: "QA", manpowerExperience: "3-5" },
      { itemType: "LICENSE" as const, description: "Power BI Pro — yearly", quantity: 25, uom: "Yearly", unitCost: 8800, markupPct: 12, discountPct: 0, taxPct: 18, licenseProduct: "Power BI", licenseDuration: "Yearly" },
      { itemType: "NON_MANPOWER" as const, description: "AWS bundle — 6 months", quantity: 6, uom: "month", unitCost: 28000, markupPct: 20, discountPct: 0, taxPct: 18 },
    ];

    let baseCost = 0, markup = 0, tax = 0, subtotal = 0;
    const computedItems = items.map((it, idx) => {
      const base = it.unitCost * it.quantity;
      const afterMarkup = base * (1 + it.markupPct / 100);
      const lineTax = afterMarkup * (it.taxPct / 100);
      const lineTotal = afterMarkup + lineTax;
      baseCost += base;
      markup += afterMarkup - base;
      tax += lineTax;
      subtotal += lineTotal;
      return { ...it, position: idx, lineTotal };
    });

    await prisma.quotation.create({
      data: {
        organizationId: org.id,
        quotationNumber: "QT-00001",
        version: 1,
        rfqId: rfq.id,
        opportunityId: rfqOpp.id,
        customerId: rfqOpp.customerId,
        status: "PENDING_APPROVAL",
        currency: "INR",
        validUntil: daysAhead(30),
        notes: "Volume-based pricing with onshore-offshore blend.",
        termsAndConditions: "Net 30. Quotation valid 30 days. Taxes extra.",
        baseCost,
        markupAmount: markup,
        discountAmount: 0,
        taxAmount: tax,
        grandTotal: subtotal,
        marginPct: subtotal > 0 ? ((subtotal - baseCost) / subtotal) * 100 : 0,
        profitAmount: subtotal - baseCost,
        items: { create: computedItems },
        positions: {
          create: [
            { designation: "Senior Developer", grade: "Senior", experience: "6-10", headcount: 2, durationMonths: 6, monthlyRate: 220000, monthlyBilling: 220000 * 1.35, cost: 2 * 6 * 220000, revenue: 2 * 6 * 220000 * 1.35, margin: 2 * 6 * 220000 * 0.35, marginPct: 25.9 },
            { designation: "Architect", grade: "Architect", experience: "10+", headcount: 1, durationMonths: 6, monthlyRate: 380000, monthlyBilling: 380000 * 1.32, cost: 6 * 380000, revenue: 6 * 380000 * 1.32, margin: 6 * 380000 * 0.32, marginPct: 24.2 },
            { designation: "QA Engineer", grade: "QA", experience: "3-5", headcount: 1, durationMonths: 6, monthlyRate: 140000, monthlyBilling: 140000 * 1.35, cost: 6 * 140000, revenue: 6 * 140000 * 1.35, margin: 6 * 140000 * 0.35, marginPct: 25.9 },
          ],
        },
        approvalRequest: {
          create: {
            requestedById: exec.id,
            status: "PENDING",
            currentStep: 2,
            steps: {
              create: [
                { stepNumber: 1, label: "Sales Executive", roleRequired: "SALES_EXEC", status: "APPROVED", approverId: exec.id, actedAt: daysAgo(1), comments: "Submitted." },
                { stepNumber: 2, label: "Sales Manager", roleRequired: "SALES_MANAGER", status: "PENDING" },
                { stepNumber: 3, label: "Business Head", roleRequired: "BUSINESS_HEAD", status: "PENDING" },
                { stepNumber: 4, label: "Finance", roleRequired: "FINANCE", status: "PENDING" },
              ],
            },
          },
        },
      },
    });
  }

  // ----- Activities across many leads AND opportunities -----
  type ActSeed = {
    ownerId: string;
    leadId?: string;
    opportunityId?: string;
    type: ActivityType;
    subject: string;
    status: ActivityStatus;
    description?: string;
    completedAt?: Date;
    dueAt?: Date;
    createdAt: Date;
  };
  const activities: ActSeed[] = [];

  // Lead activities — a believable early-funnel cadence on the first several leads.
  const leadPlaybook: { type: ActivityType; subj: (p: string) => string; when: "past" | "future"; done: boolean }[] = [
    { type: "CALL", subj: (p) => `Intro call with ${p}`, when: "past", done: true },
    { type: "EMAIL", subj: () => "Sent capability deck & case studies", when: "past", done: true },
    { type: "FOLLOW_UP", subj: () => "Follow up on budget & timeline", when: "future", done: false },
    { type: "MEETING", subj: () => "Discovery workshop", when: "future", done: false },
  ];
  createdLeads.slice(0, 7).forEach((lead, idx) => {
    const count = (idx % 3) + 1; // 1–3 activities per lead
    for (let k = 0; k < count; k++) {
      const p = leadPlaybook[k % leadPlaybook.length];
      activities.push({
        ownerId: lead.ownerId,
        leadId: lead.id,
        type: p.type,
        subject: p.subj(lead.person),
        status: p.done ? "COMPLETED" : "PLANNED",
        completedAt: p.done ? hoursAgo(6 + idx * 9 + k * 20) : undefined,
        dueAt: p.done ? undefined : daysAhead(1 + idx + k * 2),
        createdAt: hoursAgo(8 + idx * 9 + k * 20),
      });
    }
  });

  // Opportunity activities — deeper, deal-stage cadence on several opps.
  const oppPlaybook: { type: ActivityType; subj: string; when: "past" | "future"; done: boolean }[] = [
    { type: "MEETING", subj: "Solution demo with stakeholders", when: "past", done: true },
    { type: "CALL", subj: "Pricing & commercials discussion", when: "past", done: true },
    { type: "NOTE", subj: "Competing against incumbent — emphasise TCO", when: "past", done: true },
    { type: "TASK", subj: "Get internal margin approval", when: "future", done: false },
    { type: "FOLLOW_UP", subj: "Send revised proposal v2", when: "future", done: false },
  ];
  createdOpps.slice(0, 8).forEach((opp, idx) => {
    const count = (idx % 3) + 2; // 2–4 activities per opp
    for (let k = 0; k < count; k++) {
      const p = oppPlaybook[k % oppPlaybook.length];
      activities.push({
        ownerId: opp.ownerId,
        opportunityId: opp.id,
        type: p.type,
        subject: p.subj,
        status: p.done ? "COMPLETED" : "PLANNED",
        completedAt: p.done ? daysAgo(2 + idx + k) : undefined,
        dueAt: p.done ? undefined : daysAhead(1 + idx % 5 + k),
        createdAt: daysAgo(10 + idx + k),
      });
    }
  });

  await prisma.activity.createMany({
    data: activities.map((a) => ({
      organizationId: org.id,
      ownerId: a.ownerId,
      leadId: a.leadId ?? null,
      opportunityId: a.opportunityId ?? null,
      type: a.type,
      subject: a.subject,
      status: a.status,
      description: a.description ?? null,
      completedAt: a.completedAt ?? null,
      dueAt: a.dueAt ?? null,
      createdAt: a.createdAt,
    })),
  });

  console.log(`✅ Seed complete — ${createdLeads.length} leads, ${createdOpps.length} opportunities, ${activities.length} activities (dates anchored to now).`);
  console.log("   Sign in with: admin@nova.crm / password123");
}

async function upsertCustomer(orgId: string, name: string, industry: string) {
  return prisma.customer.upsert({
    where: { id: `seed-${orgId.slice(0, 6)}-${name.replace(/\s+/g, "-")}` },
    update: {},
    create: {
      id: `seed-${orgId.slice(0, 6)}-${name.replace(/\s+/g, "-")}`,
      organizationId: orgId,
      name,
      industry,
      country: "India",
      region: "APAC",
      gstNumber: "29ABCDE1234F1Z5",
      billingAddress: `${name} HQ, Mumbai, India`,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
