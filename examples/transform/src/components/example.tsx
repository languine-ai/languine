import React, { useState } from "react";

interface UserProfile {
  name: string;
  notifications: number;
  lastLogin: Date;
  preferences: {
    theme: "light" | "dark";
    language: string;
  };
}

export function UserDashboard() {
  const [user, setUser] = useState<UserProfile>({
    name: "Alice Johnson",
    notifications: 5,
    lastLogin: new Date(),
    preferences: {
      theme: "light",
      language: "en",
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md">
        {/* Welcome message with dynamic name */}
        <h1 className="text-2xl font-bold mb-4">{t("UserDashboard.h1_2", {
            name: user.name
          })}</h1>

        {/* Notification section with pluralization */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            {t("UserDashboard.h2_3")}
          </h2>
          <p>{t("UserDashboard.p_6", {
              notifications: user.notifications
            })}{user.notifications !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t("UserDashboard.button_5")}
          </button>
        </div>

        {/* Preferences section with nested content */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {t("UserDashboard.h2_4")}
          </h2>

          <div className="flex items-center justify-between">
            <span>{t("UserDashboard.span_4")}</span>
            <span className="capitalize">{null}{t("UserDashboard.span_5")}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>{t("UserDashboard.span_6")}</span>
            <span>{null}</span>
          </div>

          <p className="text-sm text-gray-500">
            {t("UserDashboard.p_7")}{user.lastLogin.toLocaleDateString()}
          </p>
        </div>

        {/* Action buttons with different states */}
        <div className="mt-8 space-x-4">
          <button
            type="button"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => setUser({ ...user, notifications: 0 })}
          >
            {t("UserDashboard.button_6")}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            title={t("UserDashboard.button_8")}
          >
            {t("UserDashboard.button_7")}
          </button>
        </div>

        {/* Footer with complex message */}
        <footer className="mt-8 pt-4 border-t text-sm text-gray-500">
          <p>
            {t("UserDashboard.p_8")}
          </p>
          <p className="mt-2">
            {t("UserDashboard.p_9")}
          </p>
        </footer>
      </div>
  );
}
