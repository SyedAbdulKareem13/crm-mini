import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      organizationId?: string | null;
    } & DefaultSession["user"];
  }
}

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const otpSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().min(4).max(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Google is only registered when credentials are present, so the app
    // builds and runs fine without OAuth configured.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const parsed = credsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    Credentials({
      id: "otp",
      name: "One-Time Password",
      credentials: {
        identifier: { label: "Email or Mobile", type: "text" },
        code: { label: "OTP", type: "text" },
      },
      async authorize(creds) {
        const parsed = otpSchema.safeParse(creds);
        if (!parsed.success) return null;
        const token = await prisma.otpToken.findFirst({
          where: {
            identifier: parsed.data.identifier,
            consumed: false,
            expires: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!token) return null;
        const ok = await bcrypt.compare(parsed.data.code, token.code);
        if (!ok) return null;
        await prisma.otpToken.update({
          where: { id: token.id },
          data: { consumed: true },
        });
        const user =
          (await prisma.user.findFirst({
            where: {
              OR: [
                { email: parsed.data.identifier },
                { mobile: parsed.data.identifier },
              ],
            },
          })) ?? null;
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organizationId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = token.role as string | undefined;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
      }
      return session;
    },
  },
});
