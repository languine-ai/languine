import { getOrganizationByUserId } from "@/db/queries/organization";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const cookieStore = await cookies();
  const {
    data: { session },
  } = await getSession();

  // Delete user preferences cookie
  cookieStore.delete("user-preferences");

  if (session?.user.id) {
    const organization = await getOrganizationByUserId(session.user.id);

    // If user is part of an organization, redirect to the organization's default project
    if (organization) {
      redirect(`/${organization.organization.id}/default`);
    }
  }

  redirect("/login");
}
