"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  requireSession,
  updateUserProfile,
  createSessionCookie,
  shouldUseSecureCookies,
  getSession,
} from "@/lib/auth";

export async function updateProfile(name: string, avatarUrl: string) {
  try {
    const session = await requireSession();

    if (!name.trim()) {
      throw new Error("Name cannot be empty.");
    }

    const secure = process.env.NODE_ENV === "production";

    // Update name in DB
    const updatedUser = await updateUserProfile(session.userId, { name });

    if (!updatedUser) {
      throw new Error("User record not found or update failed.");
    }

    const cookieStore = await cookies();

    // Update session cookie for name
    const { cookie } = createSessionCookie(updatedUser, secure);
    cookieStore.set(cookie);

    // Update avatar cookie
    cookieStore.set({
      name: "lexora_avatar",
      value: avatarUrl,
      httpOnly: false, // Accessible from client
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Bust Next.js cache
    revalidatePath("/");
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Profile update failed:", error);
    throw error instanceof Error ? error : new Error("An unexpected error occurred.");
  }
}
