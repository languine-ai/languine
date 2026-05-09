"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function CodeBlock({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn("group relative", className)}>
      {label ? (
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          {label}
        </div>
      ) : null}
      <div className="flex items-stretch border border-border bg-card font-mono text-sm">
        <pre className="flex-1 overflow-x-auto p-3">
          <code>{value}</code>
        </pre>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy"
          className="border-l border-border px-3 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
