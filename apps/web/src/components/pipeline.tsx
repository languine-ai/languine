"use client";

import { useI18n } from "@/locales/client";

export function Pipeline() {
  const t = useI18n();

  return (
    <div>
      <h2 className="text-2xl font-medium mb-4">
        {t("pipeline.title")}{" "}
        <span className="text-secondary text-sm relative -top-2">
          {t("pipeline.pro")}
        </span>
      </h2>
      <p className="text-secondary">{t("pipeline.description")}</p>

      <div className="flex flex-col items-center justify-center min-h-screenp-4 mt-10">
        <pre
          style={{
            fontFamily: "monospace",
            whiteSpace: "pre",
            display: "block",
            padding: "1em",
            overflow: "auto",
            textAlign: "left",
            margin: "0 auto",
            fontSize: "14px",
            lineHeight: "1.2",
          }}
        >
          {`
                                  ┌───────────────┐
                                  │   Git Push    │ 
                                  └───────────────┘          
                                          │                                            
                                          ▼                                            
             ┌─────────────────────────────────────────────────────────┐               
             │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│               
             │░░░░░░░░░░░░░░░░░░░░ Languine Engine ░░░░░░░░░░░░░░░░░░░░│               
             │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│               
             └─────────────────────────────────────────────────────────┘   
                                          │                                            
                                          ▼                                            
                                          │                                            
            ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─              
           │                              │                              │             
           ▼                              ▼                              ▼             
 ╔═══════════════════╗          ╔═══════════════════╗          ╔═══════════════════╗   
 ║                   ║          ║                   ║          ║                   ║   
 ║      English      ║          ║      Spanish      ║          ║      Japanese     ║   
 ║    Translation    ║          ║    Translation    ║          ║     Translation   ║   
 ║                   ║          ║                   ║          ║                   ║   
 ║                   ║          ║                   ║          ║                   ║   
 ╚═══════════════════╝          ╚═══════════════════╝          ╚═══════════════════╝   
           │                              │                              │             
           └──────────────────────────────┼──────────────────────────────┘             
                                          ▼                                             
                                  ┌───────────────┐
                                  │     Merge     │
                                  │ Pull Request  │
                                  └───────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │      Completed      │
                              │      (Deploy)       │
                              └─────────────────────┘
`}
        </pre>
      </div>
    </div>
  );
}
