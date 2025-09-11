import { routing } from "@/i18n/routing";
import { updateSession } from "@jordanmgsoftware/languine-supabase/middleware";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = await updateSession(request, I18nMiddleware(request));

  // Only proceed with organization check for login path
  if (request.nextUrl.pathname.includes("/login")) {
    const inviteId = request.cookies.get("invite-id")?.value;

    const {
      data: { session },
    } = await getSession();

    if (!session?.user.id) {
      return response;
    }

    if (inviteId) {
      return NextResponse.redirect(new URL("/api/invite/accept", request.url));
    }

    const preferenceCookie = request.cookies.get("user-preferences");

    if (preferenceCookie) {
      const preferences = JSON.parse(preferenceCookie.value);
      const { lastOrganizationId, lastProjectSlug } = preferences as {
        lastOrganizationId?: string;
        lastProjectSlug?: string;
      };

      if (lastOrganizationId && lastProjectSlug) {
        return NextResponse.redirect(
          new URL(`/${lastOrganizationId}/${lastProjectSlug}`, request.url),
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
