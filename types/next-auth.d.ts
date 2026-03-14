import type { DefaultSession } from "next-auth";
import "next-auth";

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
    avatar?: string | null;
    bio?: string | null;
    phone?: string | null;
  }
}
