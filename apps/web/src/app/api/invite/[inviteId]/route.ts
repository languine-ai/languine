import { acceptInvitation } from "@/db/queries/organization";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(
  _: Request,
  { params }: { params: { inviteId: string } },
) {
  try {
    const { inviteId } = await params;
    const cookieStore = await cookies();

    // Check if user is logged in
    const {
      data: { session },
    } = await getSession();

    if (!session) {
      // Store invitation ID in cookie and redirect to login
      cookieStore.set("invite-id", inviteId);
      redirect("/login");
    }

    // User is logged in, try to accept the invitation
    const storedInviteId = cookieStore.get("invite-id")?.value;
    const inviteIdToUse = storedInviteId || inviteId;

    const result = await acceptInvitation({
      invitationId: inviteIdToUse,
      userId: session.user.id,
      email: session.user.email,
    });

    if (!result) {
      redirect("/login");
    }

    // Clear any stored invitation cookie
    if (storedInviteId) {
      cookieStore.delete("invite-id");
    }

    // Redirect to organization dashboard
    redirect(`/${result.invitation.organizationId}/default`);
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    redirect("/login");
  }
}
