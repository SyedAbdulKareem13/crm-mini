-- ============================================================================
-- Manzil One — demo-ready seed for the Supabase SQL Editor
-- ----------------------------------------------------------------------------
-- Paste this whole file into Supabase → SQL Editor → Run.
-- It is wrapped in a single DO block (one transaction): if ANY statement fails,
-- nothing is committed, so it is safe to re-run.
--
-- Assumes the base seed already created the org/users/customers/rate-cards
-- (it looks them up by slug / email / name). It REPLACES the org's leads,
-- opportunities, RFQs, quotations and activities with a fresh demo set whose
-- dates are anchored to now().
-- ============================================================================

DO $$
DECLARE
  v_org   text;
  v_exec  text;  v_mgr text;  v_admin text;  v_fin text;
  v_india text;  v_mea text;
  v_sap   text;  v_de  text;
  v_aether text; v_helios text; v_northwind text; v_bluecedar text; v_indus text;
BEGIN
  -- ---- Resolve existing records by natural keys -------------------------
  SELECT id INTO v_org FROM "Organization" WHERE slug = 'nova-tech';
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organization "nova-tech" not found. Run the base seed (npm run db:seed) once first.';
  END IF;

  SELECT id INTO v_exec  FROM "User" WHERE email = 'sales@nova.crm';
  SELECT id INTO v_mgr   FROM "User" WHERE email = 'manager@nova.crm';
  SELECT id INTO v_admin FROM "User" WHERE email = 'admin@nova.crm';
  SELECT id INTO v_fin   FROM "User" WHERE email = 'finance@nova.crm';

  SELECT id INTO v_india FROM "Territory"    WHERE "organizationId" = v_org AND name = 'India';
  SELECT id INTO v_mea   FROM "Territory"    WHERE "organizationId" = v_org AND name = 'MEA';
  SELECT id INTO v_sap   FROM "BusinessUnit" WHERE "organizationId" = v_org AND name = 'SAP Consulting';
  SELECT id INTO v_de    FROM "BusinessUnit" WHERE "organizationId" = v_org AND name = 'Digital Engineering';

  SELECT id INTO v_aether    FROM "Customer" WHERE "organizationId" = v_org AND name = 'Aether Pharma';
  SELECT id INTO v_helios    FROM "Customer" WHERE "organizationId" = v_org AND name = 'Helios Energy';
  SELECT id INTO v_northwind FROM "Customer" WHERE "organizationId" = v_org AND name = 'Northwind Bank';
  SELECT id INTO v_bluecedar FROM "Customer" WHERE "organizationId" = v_org AND name = 'BlueCedar Retail';
  SELECT id INTO v_indus     FROM "Customer" WHERE "organizationId" = v_org AND name = 'Indus Manufacturing';

  -- ---- Clean slate (FK-safe order) --------------------------------------
  DELETE FROM "Activity"    WHERE "organizationId" = v_org;
  DELETE FROM "Quotation"   WHERE "organizationId" = v_org;  -- cascades items/positions/approval
  DELETE FROM "RFQ"         WHERE "organizationId" = v_org;  -- cascades line items
  DELETE FROM "Opportunity" WHERE "organizationId" = v_org;
  DELETE FROM "Lead"        WHERE "organizationId" = v_org;

  -- ---- Leads ------------------------------------------------------------
  INSERT INTO "Lead"
    (id,"leadNumber","organizationId",name,company,"contactPerson",email,mobile,source,industry,notes,status,"expectedRevenue","territoryId","ownerId","createdAt","updatedAt")
  VALUES
    ('seed_ld_01','LD-00001',v_org,'Priya Nair','Crescent Capital','Priya Nair','priya.nair@crescentcapital.com','+91 98000 10001','REFERRAL'::"LeadSource",'Banking & Finance','Referred by Northwind Bank. Wants a CRM + analytics revamp; budget signed off for this quarter.','QUALIFIED'::"LeadStatus",4200000,v_india,v_mgr, now()-interval '41 days', now()),
    ('seed_ld_02','LD-00002',v_org,'Aditya Rao','Vertex Logistics','Aditya Rao','aditya.rao@vertexlogistics.com','+91 98000 10002','WEBSITE'::"LeadSource",'Logistics & Supply Chain','Inbound via website. Exploring a TMS integration and fleet analytics.','CONTACTED'::"LeadStatus",2800000,v_mea,v_exec, now()-interval '33 days', now()),
    ('seed_ld_03','LD-00003',v_org,'Dr. Kavya Rao','Lumen Health Systems','Dr. Kavya Rao','kavya.rao@lumenhealth.com','+91 98000 10003','EVENT'::"LeadSource",'Pharma & Healthcare','Met at HealthTech Summit. Compliance-heavy; needs S/4HANA + patient portal.','QUALIFIED'::"LeadStatus",6500000,v_india,v_exec, now()-interval '28 days', now()),
    ('seed_ld_04','LD-00004',v_org,'Sameer Khan','Orbit Fintech','Sameer Khan','sameer.khan@orbitfintech.com','+91 98000 10004','PARTNER'::"LeadSource",'Banking & Finance','Partner-sourced. Payment gateway modernization on the table.','NEW'::"LeadStatus",3600000,v_mea,v_mgr, now()-interval '21 days', now()),
    ('seed_ld_05','LD-00005',v_org,'Neha Joshi','Greenfield Agritech','Neha Joshi','neha.joshi@greenfieldagri.com','+91 98000 10005','SOCIAL'::"LeadSource",'Agriculture','LinkedIn outreach replied. Early stage — IoT for farm monitoring.','NEW'::"LeadStatus",1500000,v_india,v_exec, now()-interval '18 days', now()),
    ('seed_ld_06','LD-00006',v_org,'Rohit Saxena','Apex Realty Group','Rohit Saxena','rohit.saxena@apexrealty.com','+91 98000 10006','COLD_CALL'::"LeadSource",'Real Estate','Cold outreach. Interested in a CRM + lead-routing build.','CONTACTED'::"LeadStatus",2100000,v_mea,v_exec, now()-interval '14 days', now()),
    ('seed_ld_07','LD-00007',v_org,'Ananya Pillai','Skyline Media','Ananya Pillai','ananya.pillai@skylinemedia.com','+91 98000 10007','WEBSITE'::"LeadSource",'Media & Entertainment','Demo requested via website. Content workflow automation.','NEW'::"LeadStatus",1900000,v_india,v_mgr, now()-interval '9 days', now()),
    ('seed_ld_08','LD-00008',v_org,'Karthik Menon','Ironclad Security','Karthik Menon','karthik.menon@ironcladsec.com','+91 98000 10008','REFERRAL'::"LeadSource",'Software & Technology','Strong referral. SOC platform + Power BI dashboards; fast timeline.','QUALIFIED'::"LeadStatus",5200000,v_mea,v_exec, now()-interval '6 days', now()),
    ('seed_ld_09','LD-00009',v_org,'Meera Krishnan','Zenith Pharma','Meera Krishnan','meera.krishnan@zenithpharma.com','+91 98000 10009','EVENT'::"LeadSource",'Pharma & Healthcare','Booth lead. Validation + serialization project.','CONTACTED'::"LeadStatus",4800000,v_india,v_exec, now()-interval '3 days', now()),
    ('seed_ld_10','LD-00010',v_org,'Suresh Iyer','Bluewave Telecom','Suresh Iyer','suresh.iyer@bluewavetel.com','+91 98000 10010','PARTNER'::"LeadSource",'Telecom','Just in from partner. Large BSS/OSS modernization — high potential.','NEW'::"LeadStatus",7400000,v_mea,v_mgr, now()-interval '1 days', now());

  -- ---- Opportunities (one per pipeline stage) ---------------------------
  INSERT INTO "Opportunity"
    (id,"oppNumber","organizationId",name,"customerId","ownerId","revenueOwnerId","territoryId","businessUnitId","expectedRevenue",probability,"expectedCloseDate",stage,"stageEnteredAt",notes,"createdAt","updatedAt")
  VALUES
    ('seed_opp_01','OPP-00001',v_org,'S/4HANA Roll-out — Aether Pharma',v_aether,v_exec,v_mgr,v_india,v_sap,1500000,10, now()+interval '14 days','QUALIFICATION'::"OpportunityStage", now()-interval '60 days','Early qualification with Aether Pharma.', now()-interval '60 days', now()),
    ('seed_opp_02','OPP-00002',v_org,'Digital Storefront Re-platform — Helios Energy',v_helios,v_mgr,v_mgr,v_india,v_de,2750000,20, now()+interval '21 days','DISCOVERY'::"OpportunityStage", now()-interval '56 days','Discovery underway on the storefront re-platform.', now()-interval '56 days', now()),
    ('seed_opp_03','OPP-00003',v_org,'Cloud Migration Wave 2 — Northwind Bank',v_northwind,v_exec,v_mgr,v_india,v_sap,4000000,30, now()+interval '28 days','REQUIREMENT_ANALYSIS'::"OpportunityStage", now()-interval '52 days','Capturing requirements for wave 2.', now()-interval '52 days', now()),
    ('seed_opp_04','OPP-00004',v_org,'Salesforce CPQ Implementation — BlueCedar Retail',v_bluecedar,v_mgr,v_mgr,v_india,v_de,5250000,40, now()+interval '35 days','PROPOSAL_SUBMITTED'::"OpportunityStage", now()-interval '48 days','Proposal submitted, awaiting feedback.', now()-interval '48 days', now()),
    ('seed_opp_05','OPP-00005',v_org,'Data Lake Modernization — Indus Manufacturing',v_indus,v_exec,v_mgr,v_india,v_sap,6500000,50, now()+interval '42 days','RFQ_RECEIVED'::"OpportunityStage", now()-interval '44 days','RFQ received — pricing in progress.', now()-interval '44 days', now()),
    ('seed_opp_06','OPP-00006',v_org,'Power BI Center of Excellence — Aether Pharma',v_aether,v_mgr,v_mgr,v_india,v_de,7750000,60, now()+interval '49 days','QUOTATION_SENT'::"OpportunityStage", now()-interval '40 days','Quotation sent; following up.', now()-interval '40 days', now()),
    ('seed_opp_07','OPP-00007',v_org,'Manufacturing IoT Platform — Helios Energy',v_helios,v_exec,v_mgr,v_india,v_sap,9000000,70, now()+interval '56 days','NEGOTIATION'::"OpportunityStage", now()-interval '36 days','In commercial negotiation.', now()-interval '36 days', now()),
    ('seed_opp_08','OPP-00008',v_org,'Payment Gateway Integration — Northwind Bank',v_northwind,v_mgr,v_mgr,v_india,v_de,10250000,80, now()+interval '63 days','MANAGEMENT_APPROVAL'::"OpportunityStage", now()-interval '32 days','Pending internal management approval.', now()-interval '32 days', now()),
    ('seed_opp_09','OPP-00009',v_org,'Loyalty Engine Refresh — BlueCedar Retail',v_bluecedar,v_exec,v_mgr,v_india,v_sap,11500000,90, now()+interval '70 days','VERBAL_CONFIRMATION'::"OpportunityStage", now()-interval '28 days','Verbal go-ahead received.', now()-interval '28 days', now()),
    ('seed_opp_10','OPP-00010',v_org,'Mobile App Refresh — Indus Manufacturing',v_indus,v_mgr,v_mgr,v_india,v_de,12750000,100, now()+interval '77 days','WON'::"OpportunityStage", now()-interval '24 days','Closed won — kickoff scheduled.', now()-interval '24 days', now()),
    ('seed_opp_11','OPP-00011',v_org,'Procurement Automation — Aether Pharma',v_aether,v_exec,v_mgr,v_india,v_sap,14000000,0, now()+interval '84 days','LOST'::"OpportunityStage", now()-interval '20 days','Lost to incumbent vendor on price.', now()-interval '20 days', now());

  -- ---- RFQ + line items (on the RFQ_RECEIVED opportunity) ---------------
  INSERT INTO "RFQ"
    (id,"rfqNumber","organizationId","opportunityId","customerId","rfqDate","dueDate",currency,terms,remarks,status,"createdAt","updatedAt")
  VALUES
    ('seed_rfq_01','RFQ-00001',v_org,'seed_opp_05',v_indus, now()-interval '20 days', now()+interval '14 days','INR','Payment Net-30. Onsite + offshore mix.','Strategic customer — be aggressive on pricing.','RECEIVED'::"RFQStatus", now()-interval '20 days', now());

  INSERT INTO "RFQLineItem"
    (id,"rfqId","lineType",description,quantity,uom,"manpowerGrade","manpowerExperience","licenseProduct",position)
  VALUES
    ('seed_rli_1','seed_rfq_01','MANPOWER'::"RFQLineType",'Senior Developer',2,'month','Senior','6-10',NULL,0),
    ('seed_rli_2','seed_rfq_01','MANPOWER'::"RFQLineType",'Architect',1,'month','Architect','10+',NULL,1),
    ('seed_rli_3','seed_rfq_01','MANPOWER'::"RFQLineType",'QA Engineer',1,'month','QA','3-5',NULL,2),
    ('seed_rli_4','seed_rfq_01','SOFTWARE_LICENSE'::"RFQLineType",'Power BI Pro',25,'Yearly',NULL,NULL,'Power BI',3),
    ('seed_rli_5','seed_rfq_01','NON_MANPOWER'::"RFQLineType",'AWS Cloud Bundle',6,'month',NULL,NULL,NULL,4);

  -- ---- Quotation + items + positions + approval -------------------------
  INSERT INTO "Quotation"
    (id,"quotationNumber",version,"organizationId","rfqId","opportunityId","customerId",status,"draftedByAi",currency,"validUntil",notes,"termsAndConditions","baseCost","markupAmount","discountAmount","taxAmount","grandTotal","marginPct","profitAmount","createdAt","updatedAt")
  VALUES
    ('seed_qt_01','QT-00001',1,v_org,'seed_rfq_01','seed_opp_05',v_indus,'PENDING_APPROVAL'::"QuotationStatus",false,'INR', now()+interval '30 days','Volume-based pricing with onshore-offshore blend.','Net 30. Quotation valid 30 days. Taxes extra.',6148000,2007600,0,1468008,9623608,36.12,3475608, now()-interval '18 days', now());

  INSERT INTO "QuotationItem"
    (id,"quotationId","itemType",description,quantity,uom,"unitCost","markupPct","discountPct","taxPct","lineTotal","manpowerGrade","manpowerExperience","licenseProduct","licenseDuration",position)
  VALUES
    ('seed_qi_1','seed_qt_01','MANPOWER'::"QuotationItemType",'Senior Developer (2x x 6 mo)',12,'month',220000,35,0,18,4205520,'Senior','6-10',NULL,NULL,0),
    ('seed_qi_2','seed_qt_01','MANPOWER'::"QuotationItemType",'Architect (1x x 6 mo)',6,'month',380000,32,0,18,3551328,'Architect','10+',NULL,NULL,1),
    ('seed_qi_3','seed_qt_01','MANPOWER'::"QuotationItemType",'QA Engineer (1x x 6 mo)',6,'month',140000,35,0,18,1338120,'QA','3-5',NULL,NULL,2),
    ('seed_qi_4','seed_qt_01','LICENSE'::"QuotationItemType",'Power BI Pro — yearly',25,'Yearly',8800,12,0,18,290752,NULL,NULL,'Power BI','Yearly',3),
    ('seed_qi_5','seed_qt_01','NON_MANPOWER'::"QuotationItemType",'AWS bundle — 6 months',6,'month',28000,20,0,18,237888,NULL,NULL,NULL,NULL,4);

  INSERT INTO "PositionEstimate"
    (id,"quotationId",designation,grade,experience,headcount,"durationMonths","monthlyRate","monthlyBilling",cost,revenue,margin,"marginPct")
  VALUES
    ('seed_pos_1','seed_qt_01','Senior Developer','Senior','6-10',2,6,220000,297000,2640000,3564000,924000,25.9),
    ('seed_pos_2','seed_qt_01','Architect','Architect','10+',1,6,380000,501600,2280000,3009600,729600,24.2),
    ('seed_pos_3','seed_qt_01','QA Engineer','QA','3-5',1,6,140000,189000,840000,1134000,294000,25.9);

  INSERT INTO "ApprovalRequest"
    (id,"quotationId","requestedById",status,"currentStep","createdAt","updatedAt")
  VALUES
    ('seed_areq_01','seed_qt_01',v_exec,'PENDING'::"ApprovalStatus",2, now()-interval '18 days', now());

  INSERT INTO "ApprovalStep"
    (id,"requestId","stepNumber",label,"roleRequired","approverId",status,comments,"actedAt","createdAt")
  VALUES
    ('seed_astep_1','seed_areq_01',1,'Sales Executive','SALES_EXEC'::"UserRole",v_exec,'APPROVED'::"ApprovalStatus",'Submitted.', now()-interval '17 days', now()-interval '18 days'),
    ('seed_astep_2','seed_areq_01',2,'Sales Manager','SALES_MANAGER'::"UserRole",NULL,'PENDING'::"ApprovalStatus",NULL,NULL, now()-interval '18 days'),
    ('seed_astep_3','seed_areq_01',3,'Business Head','BUSINESS_HEAD'::"UserRole",NULL,'PENDING'::"ApprovalStatus",NULL,NULL, now()-interval '18 days'),
    ('seed_astep_4','seed_areq_01',4,'Finance','FINANCE'::"UserRole",NULL,'PENDING'::"ApprovalStatus",NULL,NULL, now()-interval '18 days');

  -- ---- Activities on leads (1 completed + 1 planned per lead, first 7) ---
  INSERT INTO "Activity"
    (id,"organizationId","ownerId","leadId",type,status,subject,"completedAt","dueAt","createdAt","updatedAt")
  SELECT
    'seed_act_l' || lpad(s.n::text,2,'0') || '_' || g.k,
    v_org,
    ld."ownerId",
    ld.id,
    (ARRAY['CALL','FOLLOW_UP']::"ActivityType"[])[g.k],
    (ARRAY['COMPLETED','PLANNED']::"ActivityStatus"[])[g.k],
    (ARRAY['Intro call with ' || COALESCE(ld."contactPerson", ld.name), 'Follow up on budget & timeline'])[g.k],
    CASE WHEN g.k = 1 THEN now() - ((s.n * 6) || ' hours')::interval ELSE NULL END,
    CASE WHEN g.k = 2 THEN now() + ((s.n + 1) || ' days')::interval ELSE NULL END,
    now() - ((s.n) || ' days')::interval,
    now()
  FROM generate_series(1,7) AS s(n)
  CROSS JOIN generate_series(1,2) AS g(k)
  JOIN "Lead" ld ON ld.id = 'seed_ld_' || lpad(s.n::text,2,'0');

  -- ---- Activities on opportunities (2 completed + 1 planned, first 8) ----
  INSERT INTO "Activity"
    (id,"organizationId","ownerId","opportunityId",type,status,subject,description,"completedAt","dueAt","createdAt","updatedAt")
  SELECT
    'seed_act_o' || lpad(s.n::text,2,'0') || '_' || g.k,
    v_org,
    op."ownerId",
    op.id,
    (ARRAY['MEETING','CALL','TASK']::"ActivityType"[])[g.k],
    (ARRAY['COMPLETED','COMPLETED','PLANNED']::"ActivityStatus"[])[g.k],
    (ARRAY['Solution demo with stakeholders','Pricing & commercials discussion','Get internal margin approval'])[g.k],
    (ARRAY['Walked through architecture and roadmap.','Discussed onshore/offshore blend.',NULL])[g.k],
    CASE WHEN g.k IN (1,2) THEN now() - ((s.n + g.k) || ' days')::interval ELSE NULL END,
    CASE WHEN g.k = 3 THEN now() + (((s.n % 5) + 1) || ' days')::interval ELSE NULL END,
    now() - ((10 + s.n) || ' days')::interval,
    now()
  FROM generate_series(1,8) AS s(n)
  CROSS JOIN generate_series(1,3) AS g(k)
  JOIN "Opportunity" op ON op.id = 'seed_opp_' || lpad(s.n::text,2,'0');

  RAISE NOTICE 'Manzil One demo data seeded: 10 leads, 11 opportunities, RFQ + quotation, ~38 activities.';
END $$;
