import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail, emailConfigured, otpEmailHtml } from "@/lib/email";
import { sendSms, smsConfigured } from "@/lib/sms";

const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type Purpose = "verify your email" | "reset your password" | "sign in";

export async function issueOtp(opts: {
  identifier: string;
  channel: "EMAIL" | "SMS";
  userId?: string | null;
  purpose?: Purpose;
}) {
  const code = generateOtp();
  const hashed = await bcrypt.hash(code, 8);
  await prisma.otpToken.create({
    data: {
      identifier: opts.identifier,
      channel: opts.channel,
      code: hashed,
      expires: new Date(Date.now() + OTP_TTL_MS),
      userId: opts.userId ?? undefined,
    },
  });

  let delivered = false;
  if (opts.channel === "EMAIL" && opts.identifier.includes("@") && emailConfigured()) {
    const r = await sendMail({
      to: opts.identifier,
      subject: "Your Manzil One verification code",
      html: otpEmailHtml(code, opts.purpose ?? "verify your email"),
      text: `Your Manzil One verification code is ${code}. It expires in 5 minutes.`,
    });
    delivered = r.ok;
  } else if (opts.channel === "SMS" && smsConfigured()) {
    delivered = await sendSms({
      to: opts.identifier,
      body: `Your Manzil One verification code is ${code}. It expires in 5 minutes.`,
    });
  }

  // Expose the code in the response only when we could NOT actually deliver it
  // (no provider configured, or the send failed) — this keeps signup / reset
  // unblocked. When delivery succeeds, the code is returned to email/SMS only.
  const expose = !delivered;
  return { code: expose ? code : null, mock: expose, delivered };
}
