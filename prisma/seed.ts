import { PrismaClient, OpportunityStage, LeadSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Manzil One…");

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

  // ----- Customers -----
  const customers = await Promise.all([
    upsertCustomer(org.id, "Aether Pharma", "Pharma & Healthcare"),
    upsertCustomer(org.id, "Helios Energy", "Energy & Utilities"),
    upsertCustomer(org.id, "Northwind Bank", "Banking & Finance"),
    upsertCustomer(org.id, "BlueCedar Retail", "Retail & E-Commerce"),
    upsertCustomer(org.id, "Indus Manufacturing", "Manufacturing"),
  ]);

  await prisma.contact.deleteMany({ where: { customerId: { in: customers.map((c) => c.id) } } });
  await prisma.contact.createMany({
    data: customers.flatMap((c) => [
      {
        customerId: c.id,
        name: `${c.name.split(" ")[0]} CIO`,
        designation: "Chief Information Officer",
        email: `cio@${c.name.toLowerCase().split(" ")[0]}.com`,
        mobile: "+91 99000 11111",
        isPrimary: true,
      },
      {
        customerId: c.id,
        name: `${c.name.split(" ")[0]} Procurement`,
        designation: "Head of Procurement",
        email: `procurement@${c.name.toLowerCase().split(" ")[0]}.com`,
        mobile: "+91 99000 22222",
      },
    ]),
  });

  // ----- Leads -----
  await prisma.lead.deleteMany({ where: { organizationId: org.id } });
  const sources: LeadSource[] = ["WEBSITE", "REFERRAL", "EVENT", "PARTNER", "COLD_CALL", "SOCIAL"];
  for (let i = 1; i <= 8; i++) {
    await prisma.lead.create({
      data: {
        organizationId: org.id,
        leadNumber: `LD-${String(i).padStart(5, "0")}`,
        name: `Lead Contact ${i}`,
        company: `Prospect ${i} Pvt Ltd`,
        contactPerson: `Decision Maker ${i}`,
        email: `lead${i}@prospect${i}.com`,
        mobile: `+91 9876${String(100000 + i)}`,
        source: sources[i % sources.length],
        industry: ["Software & Technology", "Banking & Finance", "Manufacturing", "Pharma & Healthcare"][i % 4],
        expectedRevenue: 500000 + i * 250000,
        territoryId: i % 2 === 0 ? india.id : mea.id,
        ownerId: i % 3 === 0 ? manager.id : exec.id,
        status: i > 6 ? "QUALIFIED" : "NEW",
        notes: `Initial interest from ${`Prospect ${i}`}. Spoke to ${`Decision Maker ${i}`} about consulting needs.`,
      },
    });
  }

  // ----- Opportunities across stages -----
  await prisma.opportunity.deleteMany({ where: { organizationId: org.id } });
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
  for (let i = 0; i < stages.length; i++) {
    const customer = customers[i % customers.length];
    const stage = stages[i];
    await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        oppNumber: `OPP-${String(i + 1).padStart(5, "0")}`,
        name: `${oppNames[i]} — ${customer.name}`,
        customerId: customer.id,
        ownerId: i % 2 === 0 ? exec.id : manager.id,
        revenueOwnerId: manager.id,
        territoryId: india.id,
        businessUnitId: i % 2 === 0 ? bu1.id : bu2.id,
        expectedRevenue: 1500000 + i * 1250000,
        probability:
          stage === "WON" ? 100 :
          stage === "LOST" ? 0 :
          [10, 20, 30, 40, 50, 60, 70, 80, 90][i] ?? 25,
        expectedCloseDate: new Date(Date.now() + (i + 2) * 7 * 86400000),
        stage,
        notes: `Driven through ${stage.toLowerCase().replace("_", " ")}.`,
      },
    });
  }

  // ----- One full RFQ + Quotation chain -----
  const rfqOpp = await prisma.opportunity.findFirst({
    where: { organizationId: org.id, stage: "RFQ_RECEIVED" },
  });
  if (rfqOpp) {
    const rfq = await prisma.rFQ.create({
      data: {
        organizationId: org.id,
        rfqNumber: "RFQ-00001",
        opportunityId: rfqOpp.id,
        customerId: rfqOpp.customerId,
        status: "RECEIVED",
        dueDate: new Date(Date.now() + 14 * 86400000),
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
    const computedItems = items.map((i, idx) => {
      const base = i.unitCost * i.quantity;
      const afterMarkup = base * (1 + i.markupPct / 100);
      const lineTax = afterMarkup * (i.taxPct / 100);
      const lineTotal = afterMarkup + lineTax;
      baseCost += base;
      markup += afterMarkup - base;
      tax += lineTax;
      subtotal += lineTotal;
      return { ...i, position: idx, lineTotal };
    });

    const quotation = await prisma.quotation.create({
      data: {
        organizationId: org.id,
        quotationNumber: "QT-00001",
        version: 1,
        rfqId: rfq.id,
        opportunityId: rfqOpp.id,
        customerId: rfqOpp.customerId,
        status: "PENDING_APPROVAL",
        currency: "INR",
        validUntil: new Date(Date.now() + 30 * 86400000),
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
                { stepNumber: 1, label: "Sales Executive", roleRequired: "SALES_EXEC", status: "APPROVED", approverId: exec.id, actedAt: new Date(Date.now() - 86400000), comments: "Submitted." },
                { stepNumber: 2, label: "Sales Manager", roleRequired: "SALES_MANAGER", status: "PENDING" },
                { stepNumber: 3, label: "Business Head", roleRequired: "BUSINESS_HEAD", status: "PENDING" },
                { stepNumber: 4, label: "Finance", roleRequired: "FINANCE", status: "PENDING" },
              ],
            },
          },
        },
      },
    });

    // ----- Sample activities -----
    await prisma.activity.createMany({
      data: [
        { organizationId: org.id, ownerId: exec.id, opportunityId: rfqOpp.id, type: "CALL", subject: "Discovery call with CIO", status: "COMPLETED", completedAt: new Date(Date.now() - 7 * 86400000) },
        { organizationId: org.id, ownerId: manager.id, opportunityId: rfqOpp.id, type: "MEETING", subject: "Pricing alignment with procurement", status: "COMPLETED", completedAt: new Date(Date.now() - 3 * 86400000) },
        { organizationId: org.id, ownerId: exec.id, opportunityId: rfqOpp.id, type: "FOLLOW_UP", subject: "Send revised quote v2", status: "PLANNED", dueAt: new Date(Date.now() + 2 * 86400000) },
        { organizationId: org.id, ownerId: manager.id, opportunityId: rfqOpp.id, type: "TASK", subject: "Get internal margin approval", status: "PLANNED", dueAt: new Date(Date.now() + 4 * 86400000) },
      ],
    });
  }

  console.log("✅ Seed complete.");
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
