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
    else reject(new Error("execCommand copy 失败"));
  });
}

export function useCopy(resetMs = 1200) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    (text: string, key: string = text) => {
      writeClipboard(text).catch(() => {});
      setCopied(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}
