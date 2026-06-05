import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY!,
      from: "no-reply@yourdomain.com",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    async createUser({ user }) {
      await prisma.subscription.create({
        data: { userId: user.id! },
      });
    },
  },
});
