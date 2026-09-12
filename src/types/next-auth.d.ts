import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isTutor: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isTutor: boolean;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: Role;
    isTutor: boolean;
  }
}
