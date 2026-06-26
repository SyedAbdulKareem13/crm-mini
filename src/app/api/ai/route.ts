import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { geminiGenerate, geminiJSON, AiError } from "@/lib/ai";
import { getGeminiKey, getGeminiModel } from "@/lib/app-config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BRAND = `You are "Manzil AI", the built-in assistant inside Manzil One — a premium CRM & quotation platform for consulting, staffing, manpower, software-licensing and project businesses. The deal lifecycle is: Lead → Opportunity → RFQ → Quotation → Approval → Won. Quotations are built from rate cards (manpower / non-manpower / license) and a Position Engine (headcount × duration × monthly rate, with billing markup → cost/revenue/margin). Be concise, practical and professional. Use INR (₹) and Crore (Cr) where money is implied. Never invent confidential data; when unsure, say so.`;

const chatSchema = z.object({
  tool: z.literal("chat"),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })).min(1),
  context: z.string().optional(),
});
const parseRfqSchema = z.object({ tool: z.literal("parse-rfq"), text: z.string().min(5) });
const companySchema = z.object({ tool: z.literal("company-overview"), company: z.string().min(1), website: z.string().optional() });
const emailSchema = z.object({
  tool: z.literal("draft-email"),
  context: z.string().min(3),
  tone: z.enum(["Professional", "Friendly", "Concise", "Persuasive"]).optional(),
  purpose: z.string().optional(),
});
const quoteSchema = z.object({ tool: z.literal("draft-quote"), brief: z.string().min(5) });

const bodySchema = z.discriminatedUnion("tool", [
  chatSchema,
  parseRfqSchema,
  companySchema,
  emailSchema,
  quoteSchema,
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const apiKey = await getGeminiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured yet. Add a Gemini API key.", code: "not_configured" },
      { status: 503 }
    );
  }
  const model = await getGeminiModel();
  const gen = (o: { system?: string; prompt: string; temperature?: number }) =>
    geminiGenerate({ apiKey, model, ...o });
  const genJSON = (o: { system?: string; prompt: string; temperature?: number }) =>
    geminiJSON({ apiKey, model, ...o });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = parsed.data;

  try {
    if (data.tool === "chat") {
      const convo = data.messages
        .map((m) => `${m.role === "user" ? "User" : "Manzil AI"}: ${m.text}`)
        .join("\n");
      const prompt = [
        data.context ? `Workspace context (live):\n${data.context}\n` : "",
        `Conversation so far:\n${convo}\n\nReply as Manzil AI (plain text, no markdown headers, short).`,
      ].join("\n");
      const text = await gen({ system: BRAND, prompt, temperature: 0.7 });
      return NextResponse.json({ text });
    }

    if (data.tool === "parse-rfq") {
      const prompt = `Extract a structured RFQ from the text below. Return JSON ONLY with this shape:
{"title": string, "customer": string|null, "summary": string, "currency": string,
 "items": [{"category": "MANPOWER"|"NON_MANPOWER"|"LICENSE"|"HARDWARE"|"SERVICE",
            "role": string, "description": string, "quantity": number, "durationMonths": number|null,
            "location": string|null, "skills": string[]}]}
If a field is unknown use null or an empty array. Infer category sensibly.

RFQ TEXT:
"""${data.text}"""`;
      const json = await genJSON({ system: BRAND, prompt, temperature: 0.2 });
      return NextResponse.json({ result: json });
    }

    if (data.tool === "company-overview") {
      const prompt = `Write a concise sales-intel overview of the company "${data.company}"${
        data.website ? ` (website: ${data.website})` : ""
      } for a B2B account executive at Manzil One. Return JSON ONLY:
{"overview": string (2-3 sentences), "industry": string, "whatTheyDo": string,
 "sizeSignal": string, "talkingPoints": string[3-5], "fitForUs": string,
 "confidence": "high"|"medium"|"low"}
If you are not confident about the specific company, set confidence "low" and keep it generic but useful. Do not fabricate specific figures.`;
      const json = await genJSON({ system: BRAND, prompt, temperature: 0.4 });
      return NextResponse.json({ result: json });
    }

    if (data.tool === "draft-email") {
      const prompt = `Draft a ${data.tone ?? "Professional"} sales email${
        data.purpose ? ` whose purpose is: ${data.purpose}.` : "."
      }
Context about the deal/contact:
"""${data.context}"""
Return JSON ONLY: {"subject": string, "body": string}. The body should be ready to send, with a greeting and sign-off placeholder [Your name]. Keep it tight.`;
      const json = await genJSON({ system: BRAND, prompt, temperature: 0.6 });
      return NextResponse.json({ result: json });
    }

    // draft-quote
    const prompt = `Given this deal brief, produce a quotation draft. Return JSON ONLY:
{"scope": string (a professional scope/approach paragraph),
 "assumptions": string[], "suggestedLineItems": [{"item": string, "basis": string, "estimate": string}],
 "pricingNote": string, "nextSteps": string[]}
Brief:
"""${data.brief}"""`;
    const json = await genJSON({ system: BRAND, prompt, temperature: 0.4 });
    return NextResponse.json({ result: json });
  } catch (e) {
    if (e instanceof AiError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    return NextResponse.json({ error: "AI request failed." }, { status: 500 });
  }
}
