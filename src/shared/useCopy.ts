// Clipboard adapter with request-safe, timed success/error feedback.
import { useCallback, useEffect, useRef, useState } from "react";

function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) resolve();
    else reject(new Error("execCommand copy failed"));
  });
}

export function useCopy(resetMs = 1200) {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key: string = text) => {
      const current = ++request.current;
      setError(null);
      setCopied(null);
      window.clearTimeout(timer.current);
      try {
        await writeClipboard(text);
        if (current !== request.current) return;
        setCopied(key);
        timer.current = window.setTimeout(() => setCopied(null), resetMs);
      } catch {
        if (current === request.current) setError(key);
      }
    },
    [resetMs],
  );

  return { copied, copy, error };
}
