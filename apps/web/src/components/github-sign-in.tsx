"use client";

import { OutlinedButton } from "@/components/ui/outlined-button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@jordanmgsoftware/languine-supabase/client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";

export default function GithubSignIn() {
  const t = useTranslations("login");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGithubLogin = async () => {
    setIsLoading(true);

    try {
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

  return (
    <OutlinedButton
      variant="secondary"
      onClick={handleGithubLogin}
      className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-start"
    >
      <div className="flex items-center gap-2">
        {isLoading ? <Spinner size="sm" /> : <FaGithub className="h-4 w-4" />}

        {t("github")}
      </div>
    </OutlinedButton>
  );
}
