"use server";

import { createClient } from "@jordanmgsoftware/languine-supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = await createClient();

  // Sign out from Supabase
  await supabase.auth.signOut();

  // Remove skip-session-refresh cookie
  cookieStore.delete("skip-session-refresh");

  // Redirect to login page
  redirect("/login");
}
