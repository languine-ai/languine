"use client";

import { OutlinedButton } from "@/components/ui/outlined-button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@jordanmgsoftware/languine-supabase/client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FaGoogle } from "react-icons/fa";

export default function GoogleSignIn() {
  const t = useTranslations("login");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
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
      onClick={handleGoogleLogin}
      className="w-full text-center sm:w-auto flex items-center gap-2"
    >
      <div className="flex items-center gap-2 w-full justify-center sm:w-auto sm:justify-start">
        {isLoading ? <Spinner size="sm" /> : <FaGoogle className="h-4 w-4" />}
        {t("google")}
      </div>
    </OutlinedButton>
  );
}
