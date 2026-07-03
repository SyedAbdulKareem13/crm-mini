import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Manz AI — log an activity from a plain sentence, e.g.
 *   "call Priya at Crescent Capital Mon 3pm"
 *   "meeting with Northwind Bank tomorrow 11am"
 *   "follow up on the Salesforce CPQ deal Friday"
 *
 * Fully deterministic (no LLM key needed): a rule parser extracts the type,
 * subject and due time (IST), and the target lead/opportunity is resolved by
 * scanning the org's records against the sentence.
 */

const schema = z.object({ prompt: z.string().min(4) });

type ActivityTypeKey = "CALL" | "MEETING" | "EMAIL" | "FOLLOW_UP" | "TASK" | "NOTE";

const IST_OFFSET_MS = 5.5 * 3600_000;

/* ------------------------------ type ------------------------------ */
function detectType(t: string): ActivityTypeKey {
  const s = t.toLowerCase();
  if (/\bfollow[\s-]?up\b/.test(s)) return "FOLLOW_UP";
  if (/\b(call|ring|phone|dial)\b/.test(s)) return "CALL";
  if (/\b(meet|meeting|demo|workshop|catch\s?up|sync)\b/.test(s)) return "MEETING";
  if (/\b(email|mail)\b/.test(s)) return "EMAIL";
  if (/\bnote\b/.test(s)) return "NOTE";
  return "TASK";
}

/* --------------------------- date & time --------------------------- */
const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

type ParsedWhen = { dueAt: Date | null; matchedText: string[] };

/** Parse a due time from the sentence, interpreted in IST (UTC+5:30). */
function parseWhen(text: string): ParsedWhen {
  const s = text.toLowerCase();
  const matched: string[] = [];

  // "Now" as an IST wall clock.
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  let day: { y: number; m: number; d: number } | null = null;

  const todayIst = { y: nowIst.getUTCFullYear(), m: nowIst.getUTCMonth(), d: nowIst.getUTCDate() };
  const addDays = (base: typeof todayIst, n: number) => {
    const dt = new Date(Date.UTC(base.y, base.m, base.d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
  };

  const dayAfter = s.match(/\bday after tomorrow\b/);
  const tomorrow = s.match(/\btomorrow\b/);
  const today = s.match(/\btoday\b/);
  const inDays = s.match(/\bin\s+(\d{1,2})\s+days?\b/);
  const nextWd = s.match(/\bnext\s+(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/);
  const wd = s.match(/\b(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/);

  if (dayAfter) {
    day = addDays(todayIst, 2);
    matched.push(dayAfter[0]);
  } else if (tomorrow) {
    day = addDays(todayIst, 1);
    matched.push(tomorrow[0]);
  } else if (today) {
    day = todayIst;
    matched.push(today[0]);
  } else if (inDays) {
    day = addDays(todayIst, parseInt(inDays[1], 10));
    matched.push(inDays[0]);
  } else if (nextWd) {
    const target = WEEKDAYS[nextWd[1]];
    let delta = (target - nowIst.getUTCDay() + 7) % 7;
    if (delta === 0) delta = 7; // "next Mon" = the coming Monday
    day = addDays(todayIst, delta);
    matched.push(nextWd[0]);
  } else if (wd) {
    const target = WEEKDAYS[wd[1]];
    let delta = (target - nowIst.getUTCDay() + 7) % 7;
    if (delta === 0) delta = 7; // bare weekday = the coming one
    day = addDays(todayIst, delta);
    matched.push(wd[0]);
  }

  // Time: "3pm", "3.30 pm", "15:00", "at 3"
  let hour: number | null = null;
  let minute = 0;
  const t12 = s.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/);
  const t24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const atH = s.match(/\bat\s+(\d{1,2})\b(?!\s*(am|pm|:))/);
  if (t12) {
    hour = parseInt(t12[1], 10) % 12;
    if (t12[3] === "pm") hour += 12;
    minute = t12[2] ? parseInt(t12[2], 10) : 0;
    matched.push(t12[0]);
  } else if (t24) {
    hour = parseInt(t24[1], 10);
    minute = parseInt(t24[2], 10);
    matched.push(t24[0]);
  } else if (atH) {
    const h = parseInt(atH[1], 10);
    hour = h <= 7 ? h + 12 : h; // "at 3" → 3pm; "at 10" → 10am (business hours)
    matched.push(atH[0]);
  }

  if (day === null && hour === null) return { dueAt: null, matchedText: matched };
  if (day === null) day = hour !== null && hour <= nowIst.getUTCHours() ? addDays(todayIst, 1) : todayIst;
  if (hour === null) hour = 10; // date without time → 10:00 IST

  const dueUtcMs = Date.UTC(day.y, day.m, day.d, hour, minute) - IST_OFFSET_MS;
  return { dueAt: new Date(dueUtcMs), matchedText: matched };
}

/* ------------------------- entity resolution ------------------------ */
type Target =
  | { kind: "lead"; id: string; label: string }
  | { kind: "opportunity"; id: string; label: string };

function tokens(v: string): string[] {
  return v.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

/** Find the lead/opportunity the sentence talks about by scanning known records. */
async function resolveTarget(orgId: string, text: string): Promise<Target | null> {
  const s = text.toLowerCase();
  const sTokens = new Set(tokens(text));

  const [leads, opps] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, company: true, contactPerson: true, leadNumber: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.opportunity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, oppNumber: true, updatedAt: true, customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
  ]);

  let best: { target: Target; score: number; updatedAt: Date } | null = null;
  const consider = (target: Target, score: number, updatedAt: Date) => {
    if (score <= 0) return;
    if (!best || score > best.score || (score === best.score && updatedAt > best.updatedAt)) {
      best = { target, score, updatedAt };
    }
  };

  for (const l of leads) {
    let score = 0;
    if (l.company && s.includes(l.company.toLowerCase())) score += 100; // full company name in the sentence
    else score += tokens(l.company ?? "").filter((t) => sTokens.has(t)).length * 20;
    for (const nm of [l.name, l.contactPerson ?? ""]) {
      score += tokens(nm).filter((t) => sTokens.has(t)).length * 15; // person mentioned
    }
    consider({ kind: "lead", id: l.id, label: `${l.name} · ${l.company} (${l.leadNumber})` }, score, l.updatedAt);
  }

  for (const o of opps) {
    let score = 0;
    if (s.includes(o.name.toLowerCase())) score += 100;
    else score += tokens(o.name).filter((t) => sTokens.has(t)).length * 12;
    if (o.customer?.name && s.includes(o.customer.name.toLowerCase())) score += 60;
    consider({ kind: "opportunity", id: o.id, label: `${o.name} (${o.oppNumber})` }, score, o.updatedAt);
  }

  const found = best as { target: Target; score: number } | null;
  return found && found.score >= 20 ? found.target : null;
}

/* ------------------------------ subject ----------------------------- */
function buildSubject(raw: string, matchedWhen: string[]): string {
  let s = raw.trim();
  for (const m of matchedWhen) {
    s = s.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  }
  s = s.replace(/\b(on|at)\s*$/i, "").replace(/\s{2,}/g, " ").replace(/[,;.\s]+$/g, "").trim();
  if (!s) s = raw.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------- route ------------------------------ */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tell me what to log." }, { status: 400 });
  const prompt = parsed.data.prompt.trim();

  const type = detectType(prompt);
  const when = parseWhen(prompt);
  const target = await resolveTarget(orgId, prompt);

  if (!target) {
    return NextResponse.json(
      {
        error:
          "I couldn't match that to a lead or opportunity. Mention a company, contact or deal name you have — e.g. \"call Priya at Crescent Capital Mon 3pm\".",
        understood: { type, dueAt: when.dueAt?.toISOString() ?? null },
      },
      { status: 422 }
    );
  }

  const subject = buildSubject(prompt, when.matchedText);

  const activity = await prisma.activity.create({
    data: {
      organizationId: orgId,
      type,
      subject,
      status: "PLANNED",
      dueAt: when.dueAt,
      ownerId: session.user.id,
      leadId: target.kind === "lead" ? target.id : null,
      opportunityId: target.kind === "opportunity" ? target.id : null,
    },
    select: { id: true, type: true, subject: true, dueAt: true },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: target.kind === "lead" ? "LEAD" : "OPPORTUNITY",
    entityId: target.id,
    action: "UPDATED",
    summary: `Manz AI logged ${type.toLowerCase().replace("_", " ")} · ${subject}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({
    activity,
    target: {
      kind: target.kind,
      id: target.id,
      label: target.label,
      href: target.kind === "lead" ? `/app/leads/${target.id}` : `/app/opportunities/${target.id}`,
    },
  });
}
