import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { resolveAvatar } from "@/lib/avatar";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!user?.password) {
        return null;
      }

      const isPasswordValid = await comparePassword(parsed.data.password, user.password);

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar ?? undefined,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        phone: user.phone ?? null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id && user.image) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            image: user.image,
            avatar: user.image,
          },
        });
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.avatar = resolveAvatar(user);
        token.picture = token.avatar;
        token.bio = user.bio ?? null;
        token.phone = user.phone ?? null;
      }

      if (trigger === "update" && session) {
        const sessionUser =
          typeof session === "object" &&
          session !== null &&
          "user" in session &&
          typeof session.user === "object" &&
          session.user !== null
            ? session.user
            : session;

        if ("name" in sessionUser && typeof sessionUser.name === "string") {
          token.name = sessionUser.name;
        }

        if ("email" in sessionUser && typeof sessionUser.email === "string") {
          token.email = sessionUser.email;
        }

        if ("avatar" in sessionUser && typeof sessionUser.avatar === "string") {
          token.avatar = sessionUser.avatar;
          token.picture = sessionUser.avatar;
        } else if ("image" in sessionUser && typeof sessionUser.image === "string") {
          token.avatar = sessionUser.image;
          token.picture = sessionUser.image;
        }

        if ("bio" in sessionUser) {
          token.bio = typeof sessionUser.bio === "string" ? sessionUser.bio : null;
        }

        if ("phone" in sessionUser) {
          token.phone = typeof sessionUser.phone === "string" ? sessionUser.phone : null;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : token.sub ?? "";
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? null;
        session.user.email =
          typeof token.email === "string" ? token.email : session.user.email ?? null;
        session.user.avatar = typeof token.avatar === "string" ? token.avatar : null;
        session.user.bio = typeof token.bio === "string" ? token.bio : null;
        session.user.phone = typeof token.phone === "string" ? token.phone : null;
        session.user.image =
          typeof token.avatar === "string"
            ? token.avatar
            : typeof token.picture === "string"
              ? token.picture
              : session.user.image ?? null;
      }

      return session;
    },
  },
});
