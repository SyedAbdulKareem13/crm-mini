-- Manzil One · Localization (i18n) framework — schema + seed
-- Idempotent; additive. Run in Supabase SQL Editor.
-- English = APPROVED source. Urdu = owner-shipped beside-heading strings
-- (APPROVED where already in the app, else machine draft). Arabic general UI
-- = MACHINE_DRAFT and the Arabic language ships GATED (productionReady=false)
-- until native-linguist + scholarly review. The 'faith' namespace is left
-- EMPTY for authoritative religious content only — never machine-authored.

-- enums
DO $$ BEGIN CREATE TYPE "TextDirection" AS ENUM ('LTR','RTL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TranslationStatus" AS ENUM ('MISSING','MACHINE_DRAFT','PENDING_REVIEW','APPROVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- user preference columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uiLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bilingualSecondary" TEXT NOT NULL DEFAULT 'none';

-- tables
CREATE TABLE IF NOT EXISTS "Language" (
  "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "nativeName" TEXT NOT NULL,
  "direction" "TextDirection" NOT NULL DEFAULT 'LTR', "locale" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isFallback" BOOLEAN NOT NULL DEFAULT false, "canBeSecondary" BOOLEAN NOT NULL DEFAULT false,
  "canBePrimary" BOOLEAN NOT NULL DEFAULT false, "productionReady" BOOLEAN NOT NULL DEFAULT false,
  "reviewStatus" "TranslationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "version" INTEGER NOT NULL DEFAULT 1, "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "Language_code_key" ON "Language"("code");

CREATE TABLE IF NOT EXISTS "TranslationNamespace" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT,
  "sensitive" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1);
CREATE UNIQUE INDEX IF NOT EXISTS "TranslationNamespace_name_key" ON "TranslationNamespace"("name");

CREATE TABLE IF NOT EXISTS "TranslationKey" (
  "id" TEXT PRIMARY KEY, "namespaceId" TEXT NOT NULL, "key" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL, "description" TEXT, "sensitive" BOOLEAN NOT NULL DEFAULT false);
CREATE UNIQUE INDEX IF NOT EXISTS "TranslationKey_namespaceId_key_key" ON "TranslationKey"("namespaceId","key");

CREATE TABLE IF NOT EXISTS "TranslationValue" (
  "id" TEXT PRIMARY KEY, "keyId" TEXT NOT NULL, "languageCode" TEXT NOT NULL, "value" TEXT NOT NULL,
  "status" "TranslationStatus" NOT NULL DEFAULT 'MACHINE_DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "TranslationValue_keyId_languageCode_key" ON "TranslationValue"("keyId","languageCode");
CREATE INDEX IF NOT EXISTS "TranslationValue_languageCode_idx" ON "TranslationValue"("languageCode");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranslationKey_namespaceId_fkey') THEN
    ALTER TABLE "TranslationKey" ADD CONSTRAINT "TranslationKey_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "TranslationNamespace"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TranslationValue_keyId_fkey') THEN
    ALTER TABLE "TranslationValue" ADD CONSTRAINT "TranslationValue_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "TranslationKey"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- seed: languages
INSERT INTO "Language" ("id","code","name","nativeName","direction","locale","enabled","isDefault","isFallback","canBeSecondary","canBePrimary","productionReady","reviewStatus","position") VALUES ('lng_en','en','English','English','LTR','en-US',true,true,true,false,true,true','APPROVED',0) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Language" ("id","code","name","nativeName","direction","locale","enabled","isDefault","isFallback","canBeSecondary","canBePrimary","productionReady","reviewStatus","position") VALUES ('lng_ar','ar','Arabic','العربية','RTL','ar-SA',true,false,false,true,true,false','PENDING_REVIEW',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Language" ("id","code","name","nativeName","direction","locale","enabled","isDefault","isFallback","canBeSecondary","canBePrimary","productionReady","reviewStatus","position") VALUES ('lng_ur','ur','Urdu','اردو','RTL','ur-PK',true,false,false,true,false,false','APPROVED',2) ON CONFLICT ("id") DO NOTHING;

-- seed: namespaces
INSERT INTO "TranslationNamespace" ("id","name","description","sensitive") VALUES ('ns_common','common','Shared UI chrome — buttons, generic labels, states',false) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationNamespace" ("id","name","description","sensitive") VALUES ('ns_nav','nav','Navigation labels',false) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationNamespace" ("id","name","description","sensitive") VALUES ('ns_settings','settings','Settings & preferences',false) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationNamespace" ("id","name","description","sensitive") VALUES ('ns_faith','faith','Faith / religious / culturally-sensitive content — AUTHORITATIVE IMPORTS ONLY, never machine-authored',true) ON CONFLICT ("id") DO NOTHING;

-- seed: keys + values
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_dashboard','ns_nav','dashboard','Dashboard') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_dashboard_en','tk_nav_dashboard','en','Dashboard','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_dashboard_ur','tk_nav_dashboard','ur','ڈیش بورڈ','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_dashboard_ar','tk_nav_dashboard','ar','لوحة التحكم','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_leads','ns_nav','leads','Leads') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_leads_en','tk_nav_leads','en','Leads','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_leads_ur','tk_nav_leads','ur','لیڈز','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_leads_ar','tk_nav_leads','ar','العملاء المحتملون','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_opportunities','ns_nav','opportunities','Opportunities') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_opportunities_en','tk_nav_opportunities','en','Opportunities','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_opportunities_ur','tk_nav_opportunities','ur','مواقع','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_opportunities_ar','tk_nav_opportunities','ar','الفرص','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_pipeline','ns_nav','pipeline','Pipeline') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_pipeline_en','tk_nav_pipeline','en','Pipeline','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_pipeline_ur','tk_nav_pipeline','ur','پائپ لائن','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_pipeline_ar','tk_nav_pipeline','ar','مسار الصفقات','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_rfqs','ns_nav','rfqs','RFQs') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rfqs_en','tk_nav_rfqs','en','RFQs','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rfqs_ur','tk_nav_rfqs','ur','آر ایف کیو','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rfqs_ar','tk_nav_rfqs','ar','طلبات عروض الأسعار','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_quotations','ns_nav','quotations','Quotations') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_quotations_en','tk_nav_quotations','en','Quotations','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_quotations_ur','tk_nav_quotations','ur','کوٹیشنز','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_quotations_ar','tk_nav_quotations','ar','عروض الأسعار','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_projects','ns_nav','projects','Projects') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_projects_en','tk_nav_projects','en','Projects','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_projects_ur','tk_nav_projects','ur','پروجیکٹس','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_projects_ar','tk_nav_projects','ar','المشاريع','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_customers','ns_nav','customers','Customers') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_customers_en','tk_nav_customers','en','Customers','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_customers_ur','tk_nav_customers','ur','گاہک','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_customers_ar','tk_nav_customers','ar','العملاء','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_activities','ns_nav','activities','Activities') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_activities_en','tk_nav_activities','en','Activities','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_activities_ur','tk_nav_activities','ur','سرگرمیاں','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_activities_ar','tk_nav_activities','ar','الأنشطة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_rateCards','ns_nav','rateCards','Rate Cards') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rateCards_en','tk_nav_rateCards','en','Rate Cards','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rateCards_ur','tk_nav_rateCards','ur','ریٹ کارڈز','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_rateCards_ar','tk_nav_rateCards','ar','بطاقات الأسعار','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_approvals','ns_nav','approvals','Approvals') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_approvals_en','tk_nav_approvals','en','Approvals','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_approvals_ur','tk_nav_approvals','ur','منظوریاں','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_approvals_ar','tk_nav_approvals','ar','الموافقات','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_reports','ns_nav','reports','Reports') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_reports_en','tk_nav_reports','en','Reports','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_reports_ur','tk_nav_reports','ur','رپورٹس','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_reports_ar','tk_nav_reports','ar','التقارير','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_audit','ns_nav','audit','Audit Log') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_audit_en','tk_nav_audit','en','Audit Log','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_audit_ur','tk_nav_audit','ur','آڈٹ لاگ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_audit_ar','tk_nav_audit','ar','سجل التدقيق','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_releases','ns_nav','releases','What''s New') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_releases_en','tk_nav_releases','en','What''s New','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_releases_ur','tk_nav_releases','ur','نیا کیا ہے','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_releases_ar','tk_nav_releases','ar','ما الجديد','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_admin','ns_nav','admin','Admin') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_admin_en','tk_nav_admin','en','Admin','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_admin_ur','tk_nav_admin','ur','ایڈمن','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_admin_ar','tk_nav_admin','ar','الإدارة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_workload','ns_nav','workload','Workload') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_workload_en','tk_nav_workload','en','Workload','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_workload_ur','tk_nav_workload','ur','ورک لوڈ','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_workload_ar','tk_nav_workload','ar','عبء العمل','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_more','ns_nav','more','More') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_more_en','tk_nav_more','en','More','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_more_ur','tk_nav_more','ur','مزید','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_more_ar','tk_nav_more','ar','المزيد','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_nav_home','ns_nav','home','Home') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_home_en','tk_nav_home','en','Home','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_home_ur','tk_nav_home','ur','ہوم','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_nav_home_ar','tk_nav_home','ar','الرئيسية','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_save','ns_common','save','Save') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_save_en','tk_common_save','en','Save','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_save_ur','tk_common_save','ur','محفوظ کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_save_ar','tk_common_save','ar','حفظ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_cancel','ns_common','cancel','Cancel') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_cancel_en','tk_common_cancel','en','Cancel','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_cancel_ur','tk_common_cancel','ur','منسوخ کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_cancel_ar','tk_common_cancel','ar','إلغاء','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_delete','ns_common','delete','Delete') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_delete_en','tk_common_delete','en','Delete','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_delete_ur','tk_common_delete','ur','حذف کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_delete_ar','tk_common_delete','ar','حذف','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_edit','ns_common','edit','Edit') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_edit_en','tk_common_edit','en','Edit','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_edit_ur','tk_common_edit','ur','ترمیم','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_edit_ar','tk_common_edit','ar','تعديل','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_create','ns_common','create','Create') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_create_en','tk_common_create','en','Create','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_create_ur','tk_common_create','ur','بنائیں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_create_ar','tk_common_create','ar','إنشاء','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_add','ns_common','add','Add') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_add_en','tk_common_add','en','Add','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_add_ur','tk_common_add','ur','شامل کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_add_ar','tk_common_add','ar','إضافة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_search','ns_common','search','Search') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_search_en','tk_common_search','en','Search','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_search_ur','tk_common_search','ur','تلاش','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_search_ar','tk_common_search','ar','بحث','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_close','ns_common','close','Close') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_close_en','tk_common_close','en','Close','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_close_ur','tk_common_close','ur','بند کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_close_ar','tk_common_close','ar','إغلاق','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_confirm','ns_common','confirm','Confirm') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_confirm_en','tk_common_confirm','en','Confirm','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_confirm_ur','tk_common_confirm','ur','تصدیق کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_confirm_ar','tk_common_confirm','ar','تأكيد','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_loading','ns_common','loading','Loading…') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_loading_en','tk_common_loading','en','Loading…','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_loading_ur','tk_common_loading','ur','لوڈ ہو رہا ہے…','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_loading_ar','tk_common_loading','ar','جارٍ التحميل…','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_back','ns_common','back','Back') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_back_en','tk_common_back','en','Back','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_back_ur','tk_common_back','ur','واپس','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_back_ar','tk_common_back','ar','رجوع','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_next','ns_common','next','Next') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_next_en','tk_common_next','en','Next','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_next_ur','tk_common_next','ur','اگلا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_next_ar','tk_common_next','ar','التالي','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_previous','ns_common','previous','Previous') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_previous_en','tk_common_previous','en','Previous','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_previous_ur','tk_common_previous','ur','پچھلا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_previous_ar','tk_common_previous','ar','السابق','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_yes','ns_common','yes','Yes') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_yes_en','tk_common_yes','en','Yes','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_yes_ur','tk_common_yes','ur','ہاں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_yes_ar','tk_common_yes','ar','نعم','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_no','ns_common','no','No') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_no_en','tk_common_no','en','No','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_no_ur','tk_common_no','ur','نہیں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_no_ar','tk_common_no','ar','لا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_signOut','ns_common','signOut','Sign out') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_signOut_en','tk_common_signOut','en','Sign out','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_signOut_ur','tk_common_signOut','ur','سائن آؤٹ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_signOut_ar','tk_common_signOut','ar','تسجيل الخروج','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_profile','ns_common','profile','Profile') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_profile_en','tk_common_profile','en','Profile','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_profile_ur','tk_common_profile','ur','پروفائل','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_profile_ar','tk_common_profile','ar','الملف الشخصي','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_settings','ns_common','settings','Settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_settings_en','tk_common_settings','en','Settings','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_settings_ur','tk_common_settings','ur','ترتیبات','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_settings_ar','tk_common_settings','ar','الإعدادات','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_language','ns_common','language','Language') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_language_en','tk_common_language','en','Language','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_language_ur','tk_common_language','ur','زبان','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_language_ar','tk_common_language','ar','اللغة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_myAccount','ns_common','myAccount','My account') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_myAccount_en','tk_common_myAccount','en','My account','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_myAccount_ur','tk_common_myAccount','ur','میرا اکاؤنٹ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_myAccount_ar','tk_common_myAccount','ar','حسابي','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_noResults','ns_common','noResults','No results') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_noResults_en','tk_common_noResults','en','No results','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_noResults_ur','tk_common_noResults','ur','کوئی نتیجہ نہیں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_noResults_ar','tk_common_noResults','ar','لا توجد نتائج','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_saved','ns_common','saved','Saved') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_saved_en','tk_common_saved','en','Saved','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_saved_ur','tk_common_saved','ur','محفوظ ہو گیا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_saved_ar','tk_common_saved','ar','تم الحفظ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_none','ns_common','none','None') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_none_en','tk_common_none','en','None','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_none_ur','tk_common_none','ur','کوئی نہیں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_none_ar','tk_common_none','ar','بلا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_change','ns_common','change','Change') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_change_en','tk_common_change','en','Change','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_change_ur','tk_common_change','ur','تبدیل کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_change_ar','tk_common_change','ar','تغيير','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_common_error','ns_common','error','Something went wrong') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_error_en','tk_common_error','en','Something went wrong','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_error_ur','tk_common_error','ur','کچھ غلط ہو گیا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_common_error_ar','tk_common_error','ar','حدث خطأ ما','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_title','ns_settings','title','Settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_title_en','tk_settings_title','en','Settings','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_title_ur','tk_settings_title','ur','ترتیبات','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_title_ar','tk_settings_title','ar','الإعدادات','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_systemSettings','ns_settings','systemSettings','System Settings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettings_en','tk_settings_systemSettings','en','System Settings','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettings_ur','tk_settings_systemSettings','ur','نظام کی ترتیبات','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettings_ar','tk_settings_systemSettings','ar','إعدادات النظام','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_themeAndAccent','ns_settings','themeAndAccent','Theme & Accent') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeAndAccent_en','tk_settings_themeAndAccent','en','Theme & Accent','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeAndAccent_ur','tk_settings_themeAndAccent','ur','تھیم اور رنگ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeAndAccent_ar','tk_settings_themeAndAccent','ar','السمة واللون','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_themeDesc','ns_settings','themeDesc','Choose your workspace look and accent colour.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeDesc_en','tk_settings_themeDesc','en','Choose your workspace look and accent colour.','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeDesc_ur','tk_settings_themeDesc','ur','اپنے ورک اسپیس کی شکل اور رنگ منتخب کریں۔','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_themeDesc_ar','tk_settings_themeDesc','ar','اختر مظهر مساحة العمل واللون المميز.','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_language','ns_settings','language','Language') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_language_en','tk_settings_language','en','Language','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_language_ur','tk_settings_language','ur','زبان','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_language_ar','tk_settings_language','ar','اللغة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_languageDesc','ns_settings','languageDesc','Choose your interface language. Your choice syncs across your devices.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageDesc_en','tk_settings_languageDesc','en','Choose your interface language. Your choice syncs across your devices.','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageDesc_ur','tk_settings_languageDesc','ur','اپنی انٹرفیس زبان منتخب کریں۔ آپ کا انتخاب آپ کے تمام آلات پر ہم آہنگ رہے گا۔','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageDesc_ar','tk_settings_languageDesc','ar','اختر لغة الواجهة. سيتم مزامنة اختيارك عبر جميع أجهزتك.','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_chooseLanguage','ns_settings','chooseLanguage','Choose language') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_chooseLanguage_en','tk_settings_chooseLanguage','en','Choose language','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_chooseLanguage_ur','tk_settings_chooseLanguage','ur','زبان منتخب کریں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_chooseLanguage_ar','tk_settings_chooseLanguage','ar','اختر اللغة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_security','ns_settings','security','Security') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_security_en','tk_settings_security','en','Security','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_security_ur','tk_settings_security','ur','سیکیورٹی','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_security_ar','tk_settings_security','ar','الأمان','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_systemSettingsDesc','ns_settings','systemSettingsDesc','Workspace-wide preferences.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettingsDesc_en','tk_settings_systemSettingsDesc','en','Workspace-wide preferences.','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettingsDesc_ur','tk_settings_systemSettingsDesc','ur','ورک اسپیس کی ترجیحات۔','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_systemSettingsDesc_ar','tk_settings_systemSettingsDesc','ar','تفضيلات مساحة العمل.','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_interfaceLanguageDesc','ns_settings','interfaceLanguageDesc','The full interface language.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_interfaceLanguageDesc_en','tk_settings_interfaceLanguageDesc','en','The full interface language.','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_interfaceLanguageDesc_ur','tk_settings_interfaceLanguageDesc','ur','مکمل انٹرفیس زبان۔','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_interfaceLanguageDesc_ar','tk_settings_interfaceLanguageDesc','ar','لغة الواجهة الكاملة.','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_secondScript','ns_settings','secondScript','Second script beside headings') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScript_en','tk_settings_secondScript','en','Second script beside headings','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScript_ur','tk_settings_secondScript','ur','عنوانات کے ساتھ دوسری رسم الخط','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScript_ar','tk_settings_secondScript','ar','نص ثانٍ بجانب العناوين','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_secondScriptDesc','ns_settings','secondScriptDesc','Show a second script alongside English headings and navigation.') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScriptDesc_en','tk_settings_secondScriptDesc','en','Show a second script alongside English headings and navigation.','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScriptDesc_ur','tk_settings_secondScriptDesc','ur','انگریزی عنوانات اور نیویگیشن کے ساتھ دوسری رسم الخط دکھائیں۔','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_secondScriptDesc_ar','tk_settings_secondScriptDesc','ar','اعرض نصًا ثانيًا بجانب العناوين والتنقل الإنجليزية.','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_noSecondScript','ns_settings','noSecondScript','None') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_noSecondScript_en','tk_settings_noSecondScript','en','None','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_noSecondScript_ur','tk_settings_noSecondScript','ur','کوئی نہیں','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_noSecondScript_ar','tk_settings_noSecondScript','ar','بلا','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_rtl','ns_settings','rtl','RTL') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_rtl_en','tk_settings_rtl','en','RTL','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_rtl_ur','tk_settings_rtl','ur','آر ٹی ایل','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_rtl_ar','tk_settings_rtl','ar','من اليمين لليسار','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_preview','ns_settings','preview','Preview') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_preview_en','tk_settings_preview','en','Preview','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_preview_ur','tk_settings_preview','ur','پیش نظارہ','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_preview_ar','tk_settings_preview','ar','معاينة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationKey" ("id","namespaceId","key","sourceText") VALUES ('tk_settings_languageSaved','ns_settings','languageSaved','Language updated') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageSaved_en','tk_settings_languageSaved','en','Language updated','APPROVED') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageSaved_ur','tk_settings_languageSaved','ur','زبان اپ ڈیٹ ہو گئی','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status") VALUES ('tv_settings_languageSaved_ar','tk_settings_languageSaved','ar','تم تحديث اللغة','MACHINE_DRAFT') ON CONFLICT ("id") DO NOTHING;
