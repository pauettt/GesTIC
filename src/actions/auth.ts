"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  await signIn("google", { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
