import { useLocale } from "../../app/i18n";
import type { ThemeMode } from "../../color/palette";
import { MoonIcon, SunIcon } from "../../shared/Icons";
import DesktopSettings from "./DesktopSettings";

// Toolbar preferences: language, appearance, and Electron-only desktop settings.
export default function AppSettings({
  theme,
  onToggleTheme,
  picking,
  beforeRestart,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  picking: boolean;
  beforeRestart: () => boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  return (
    <>
      <div
        className="border-line bg-surface-raised flex rounded-lg border p-0.5"
        aria-label={t("language")}
      >
        <button
          type="button"
          onClick={() => setLocale("en")}
          aria-pressed={locale === "en"}
          className={`rounded-md px-2 py-1 text-xs ${locale === "en" ? "bg-primary text-on-primary" : "text-ink-muted"}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocale("zh-TW")}
          aria-pressed={locale === "zh-TW"}
          className={`rounded-md px-2 py-1 text-xs ${locale === "zh-TW" ? "bg-primary text-on-primary" : "text-ink-muted"}`}
        >
          繁
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleTheme}
        className="icon-button"
        data-tooltip={t(theme === "dark" ? "switchToLight" : "switchToDark")}
        aria-label={t(theme === "dark" ? "switchToLight" : "switchToDark")}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <DesktopSettings disabled={picking} beforeRestart={beforeRestart} />
    </>
  );
}
