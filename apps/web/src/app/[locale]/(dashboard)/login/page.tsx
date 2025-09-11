import { ChangeLanguage } from "@/components/change-language";
import Login from "@/components/login";
import { Logo } from "@/components/logo";
import MatrixTextWall from "@/components/matrix";
import { StackedCode } from "@/components/stacked-code";
import { getOrganizationByUserId } from "@/db/queries/organization";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("login.title")} | Languine`,
    description: t("login.description"),
  };
}

export default async function Page() {
  const t = await getTranslations();
  const cookieStore = await cookies();

  const {
    data: { session },
  } = await getSession();

  if (session?.user.id) {
    const preferenceCookie = cookieStore.get("user-preferences");

    if (preferenceCookie) {
      const preferences = JSON.parse(preferenceCookie.value);
      const { lastOrganizationId, lastProjectSlug } = preferences as {
        lastOrganizationId?: string;
        lastProjectSlug?: string;
      };

      if (lastOrganizationId && lastProjectSlug) {
        return redirect(`/${lastOrganizationId}/${lastProjectSlug}`);
      }
    }

    if (session?.user.id) {
      const organization = await getOrganizationByUserId(session.user.id);

      if (organization) {
        return redirect(`/${organization.organization.id}/default`);
      }
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="absolute top-6 left-6 mt-[1px] z-10">
        <Link href="/">
          <Logo />
        </Link>
      </div>

      <div className="hidden lg:flex items-center justify-center border-r border-border relative">
        <MatrixTextWall />

        <div className="w-full text-center">
          <div className="mt-24 w-full relative">
            <div className="w-[80%] mx-auto">
              <StackedCode />
            </div>
          </div>
        </div>

        <div className="absolute bottom-12">
          <h2 className="font-normal text-sm">{t("login.footer")}</h2>
        </div>
      </div>
      <div className="flex items-center justify-center p-4 lg:p-8">
        <div className="absolute top-6 right-6">
          <ChangeLanguage />
        </div>

        <Login />
      </div>
    </div>
  );
}
