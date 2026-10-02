// Electron-only desktop settings; the preload bridge owns platform detection and restart.
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/i18n";
import { SettingsIcon } from "../../shared/Icons";

export default function DesktopSettings({
  beforeRestart,
  disabled,
}: {
  beforeRestart: () => boolean;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const details = useRef<HTMLDetailsElement>(null);
  const [mode, setMode] = useState<{
    enabled: boolean;
    available: boolean;
  } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    window.desktopSettings
      ?.getDisplayMode()
      .then((value) => {
        if (!active) return;
        setMode(value);
        setEnabled(value?.enabled ?? false);
      })
      .catch(() => {
        /* Hide desktop-only settings if the bridge is unavailable. */
      });
    const closeOutside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      active = false;
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, []);

  if (!mode) return null;
  async function restart() {
    if (busy || disabled || !window.desktopSettings) return;
    setError(false);
    setBusy(true);
    try {
      if (!beforeRestart()) throw new Error("Could not preserve palette");
      const result = await window.desktopSettings.restartWithX11(enabled);
      if (!result.ok) throw new Error("Could not restart");
    } catch {
      setBusy(false);
      setError(true);
    }
  }
  return (
    <details
      ref={details}
      className="desktop-settings"
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current?.open) {
          event.preventDefault();
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="icon-button"
        aria-label={t("desktopSettings")}
        data-tooltip={t("desktopSettings")}
      >
        <SettingsIcon />
      </summary>
      <div className="display-settings-panel" aria-label={t("desktopSettings")}>
        <label className="display-mode-choice">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy || disabled || (!mode.available && !enabled)}
            onChange={(event) => {
              setEnabled(event.target.checked);
              setError(false);
            }}
          />
          <span>{t("x11Compatibility")}</span>
        </label>
        <p>{t("x11Description")}</p>
        <p>{t("x11CaptureNotice")}</p>
        {!mode.available && <p role="status">{t("x11Unavailable")}</p>}
        {error && (
          <p className="display-settings-error" role="alert">
            {t("displayModeFailed")}
          </p>
        )}
        <button
          type="button"
          className="display-mode-apply"
          disabled={busy || disabled || enabled === mode.enabled}
          onClick={() => void restart()}
        >
          {t(busy ? "restartingApp" : "restartApply")}
        </button>
      </div>
    </details>
  );
}
