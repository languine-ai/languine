import { getOrganizationByUserId } from "@/db/queries/organization";
import { acceptInvitation } from "@/db/queries/organization";
import WelcomeEmail from "@/emails/templates/welcome";
import { resend } from "@/lib/resend";
import { UTCDate } from "@date-fns/utc";
import { createClient } from "@jordanmgsoftware/languine-supabase/server";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { setSkipSessionRefreshCookie } from "@jordanmgsoftware/languine-supabase/utils";
import { waitUntil } from "@vercel/functions";
import { differenceInSeconds } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      const {
        data: { session },
      } = await getSession();

      // Send welcome email if user was created in the last 10 seconds
      if (
        session?.user.created_at &&
        differenceInSeconds(
          new UTCDate(),
          new UTCDate(session.user.created_at),
        ) < 10
      ) {
        waitUntil(
          resend.emails.send({
            from: "Languine <hello@emails.languine.ai>",
            to: session.user.email!,
            subject: "Welcome to Languine",
            react: WelcomeEmail({
              name: session.user.user_metadata.full_name,
            }),
          }),
        );
      }

      // Check for stored invite first
      const storedInviteId = cookieStore.get("invite-id")?.value;
      if (storedInviteId && session) {
        try {
          const result = await acceptInvitation({
            invitationId: storedInviteId,
            userId: session.user.id,
            email: session.user.email ?? "",
          });

          if (result) {
            // Clear the invite cookie
            cookieStore.delete("invite-id");

            const response = NextResponse.redirect(
              `${origin}/${result.invitation.organizationId}/default`,
            );

            // Set cookie to avoid checking remote session for 30 minutes
            setSkipSessionRefreshCookie(response, true);

            return response;
          }
        } catch (error) {
          console.error("Failed to accept invitation:", error);
        }
      }

      const preferenceCookie = cookieStore.get("user-preferences");

      let redirectUrl = `${origin}${next}`;

      if (!preferenceCookie && session) {
        const organization = await getOrganizationByUserId(session.user.id);

        if (organization) {
          redirectUrl = `${origin}/${organization.organization.id}/default`;

          const preferences = {
            lastOrganizationId: organization.organization.id,
            lastProjectSlug: "default",
          };

          cookieStore.set("user-preferences", JSON.stringify(preferences));
        }
      }

      const response = isLocalEnv
        ? NextResponse.redirect(redirectUrl)
        : forwardedHost
          ? NextResponse.redirect(`https://${forwardedHost}${next}`)
          : NextResponse.redirect(redirectUrl);

      // Set cookie to avoid checking remote session for 30 minutes
      setSkipSessionRefreshCookie(response, true);

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`);
}
