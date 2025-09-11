import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const t = await getTranslations();
  const {
    data: { session },
  } = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <h1 className="text-xl font-medium mb-4">{t("cli.success.title")}</h1>
      <p className="text-center mb-2 text-sm text-secondary">
        {t("cli.success.description")} <span>{session.user.email}</span>
      </p>
      <p className="text-sm text-secondary">{t("cli.success.description_2")}</p>
    </div>
  );
}
