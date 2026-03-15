import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      avatar?: string | null;
      bio?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    image?: string | null;
    avatar?: string | null;
    bio?: string | null;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    avatar?: string | null;
    bio?: string | null;
    phone?: string | null;
  }
}
