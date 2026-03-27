"use server";

import { cookies } from "next/headers";

import {
  requireSession,
  updateUserProfile,
  createSessionCookie,
} from "@/lib/auth";

export async function updateProfile(name: string, avatarUrl: string) {
  try {
    const session = await requireSession();
    
    if (!name.trim()) {
      return { success: false, error: "Name is required." };
    }

    // Update backend (Supabase) with email for ghost accounts
    const updatedUser = await updateUserProfile(session.userId, { 
      name, 
      email: session.email 
    });
    if (!updatedUser) {
      return { success: false, error: "User update failed. Check Supabase columns." };
    }

    const secure = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();

    // Bulletproof session update
    const { cookie } = createSessionCookie(updatedUser, secure);
    
    cookieStore.set(cookie.name, cookie.value, {
      path: "/",
      secure,
      httpOnly: true,
      sameSite: "lax",
      expires: cookie.expires
    });

    // Set avatar cookie
    cookieStore.set("lexora_avatar", avatarUrl, {
      path: "/",
      secure,
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365
    });

    // We do NOT call revalidatePath(root) here as it can crash some Vercel builds
    // Return success and let the client handle the refresh
    return { success: true };
  } catch (error: unknown) {
    console.error("Profile Action Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    };
  }
}
