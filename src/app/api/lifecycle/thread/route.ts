import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLifecycleThread, getThreadAudit, type ThreadEntry } from "@/lib/lifecycle";
import type { LifecycleEntity } from "@/lib/lifecycle-status";

const TYPES: LifecycleEntity[] = ["LEAD", "OPPORTUNITY", "RFQ", "QUOTATION", "PROJECT"];

/** GET ?type=OPPORTUNITY&id=… — the full lifecycle thread for a record plus
 *  its milestone timeline and merged activity history (audit-derived). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "") as LifecycleEntity;
  const id = url.searchParams.get("id") ?? "";
  if (!TYPES.includes(type) || !id) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const thread = await getLifecycleThread(session.user.organizationId, { type, id } as ThreadEntry);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { milestones, history } = await getThreadAudit(session.user.organizationId, thread);
  return NextResponse.json({ thread, milestones, history });
}
