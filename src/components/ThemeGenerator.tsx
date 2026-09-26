import { useMemo, useState, type ReactNode } from "react";
import {
  generateThemePalette,
  allChecksPass,
  type ContrastCheck,
  type ThemeMode,
  type ThemeRole,
  type PaletteStyle,
  PALETTE_STYLES,
} from "../palette";
import { useCopy } from "../useCopy";
import ColorInput from "./ColorInput";
import ThemePreview, { type PreviewMode } from "./ThemePreview";
import { useLocale, type MessageKey } from "../i18n";

const THEMES: ThemeMode[] = ["light", "dark"];
const CHECK_LABEL_KEYS: Record<string, MessageKey> = {
  "正文/背景": "bodyBackground",
  "次要文字/背景": "mutedTextBackground",
  "主色/背景(元件)": "primaryBackground",
  "主色上的文字/主色": "onPrimary",
  "強調色/背景(組件)": "accentBackground",
  "成功色/背景(組件)": "semanticBackground",
  "成功色上的文字/成功色": "onSemantic",
  "成功色文字/成功淺底": "semanticMuted",
  "警告色/背景(組件)": "warningBackground",
  "警告色上的文字/警告色": "onWarning",
  "警告色文字/警告淺底": "warningMuted",
  "危險色/背景(組件)": "dangerBackground",
  "危險色上的文字/危險色": "onDanger",
  "危險色文字/危險淺底": "dangerMuted",
};
const MODES: Array<{ id: PreviewMode; key: "light" | "dark" | "both" }> = [
  { id: "light", key: "light" },
  { id: "dark", key: "dark" },
  { id: "both", key: "both" },
];

interface RoleGridProps {
  title: string;
  roles: ThemeRole[];
  copied: string | null;
  onCopy: (hex: string, key: string) => void;
}

function RoleGrid({ title, roles, copied, onCopy }: RoleGridProps) {
  const { t } = useLocale();
  return (
    <div>
      <span className="mb-1 block text-[9px] uppercase tracking-widest text-ink-muted">
        {title}
      </span>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
      >
        {roles.map((r) => {
          const key = `${title}:${r.name}`;
          const isCopied = copied === key;
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => onCopy(r.hex, key)}
              title={t("copyHex", { hex: r.hex })}
              className="group/sw flex flex-col items-center gap-0.5 focus:outline-none"
            >
              <div
                className="h-6 w-full rounded border border-line transition-transform group-hover/sw:scale-105
                  group-hover/sw:ring-2 group-hover/sw:ring-ink-muted group-active/sw:scale-95"
                style={{ backgroundColor: r.hex }}
              />
              <span className="w-full truncate text-center font-mono text-[9px] text-ink-muted">
                {r.name}
              </span>
              <span
                className={`font-mono text-[9px] ${isCopied ? "font-semibold text-success" : "text-ink-muted"}`}
              >
                {isCopied ? t("copied") : r.hex}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckList({
  theme,
  checks,
}: {
  theme: string;
  checks: ContrastCheck[];
}) {
  const { t } = useLocale();
  const allOk = checks.every((c) => c.ok);
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-line p-2">
      <span
        className={`mb-1 text-[10px] font-semibold ${allOk ? "text-success" : "text-danger"}`}
      >
        {theme} WCAG {allOk ? t("wcagPass") : t("wcagFail")}
      </span>
      {checks.map((c) => (
        <span
          key={c.label}
          className={`font-mono text-[10px] ${c.ok ? "text-ink-muted" : "text-danger"}`}
        >
          {c.ok ? "✔" : "✘"} {t(CHECK_LABEL_KEYS[c.label] ?? "bodyBackground")}{" "}
          {c.ratio.toFixed(2)}:1
          {c.ok ? "" : ` ${t("needsRatio", { ratio: c.min })}`}
        </span>
      ))}
    </div>
  );
}

interface ThemeGeneratorProps {
  seed: string;
  onSeedChange: (hex: string) => void;
  style: PaletteStyle;
  onStyleChange: (style: PaletteStyle) => void;
  actions?: ReactNode;
}

export default function ThemeGenerator({
  seed,
  onSeedChange,
  style,
  onStyleChange,
  actions,
}: ThemeGeneratorProps) {
  const [mode, setMode] = useState<PreviewMode>("both");
  const { copied, copy } = useCopy();
  const { t } = useLocale();

  const palette = useMemo(
    () => generateThemePalette(seed, style),
    [seed, style],
  );
  const cssCopied = copied === "css";

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ColorInput value={seed} onChange={onSeedChange} />
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>{t("style")}</span>
          <select
            value={style}
            onChange={(e) => onStyleChange(e.target.value as PaletteStyle)}
            className="rounded-lg border border-line bg-surface-raised px-2 py-2 text-xs text-ink outline-none focus:border-primary"
          >
            {PALETTE_STYLES.map((value) => (
              <option key={value} value={value}>
                {t(
                  `style${value[0].toUpperCase()}${value.slice(1)}` as MessageKey,
                )}
              </option>
            ))}
          </select>
        </label>
        {actions}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t("previewTheme")}
            className="flex rounded-lg border border-line bg-surface-raised p-0.5"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`rounded-md px-2.5 py-1 text-[10px] uppercase tracking-widest transition-colors ${
                  mode === m.id
                    ? "bg-primary text-on-primary"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t(m.key)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => palette && copy(palette.css, "css")}
            disabled={!palette}
            className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs text-ink-muted
              transition-colors hover:border-primary hover:text-ink active:scale-95 disabled:opacity-40"
          >
            {cssCopied ? t("copiedCss") : t("copyCss")}
          </button>
        </div>
      </div>

      {palette ? (
        <>
          {!allChecksPass(palette) && (
            <p className="mb-3 text-xs text-danger">{t("contrastWarning")}</p>
          )}

          <ThemePreview palette={palette} mode={mode} />

          <details className="mt-4 rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-widest text-ink-muted">
              {t("colorSwatches")}
            </summary>
            <div className="flex flex-wrap items-start gap-3 border-t border-line p-3 xl:flex-nowrap">
              <div className="min-w-[26rem] flex-1 space-y-2">
                {THEMES.map((theme) => (
                  <RoleGrid
                    key={theme}
                    title={
                      theme === "light" ? t("lightPalette") : t("darkPalette")
                    }
                    roles={palette[theme]}
                    copied={copied}
                    onCopy={copy}
                  />
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-2 xl:w-56 xl:flex-none">
                {THEMES.map((theme) => (
                  <CheckList
                    key={theme}
                    theme={theme}
                    checks={palette.checks[theme]}
                  />
                ))}
              </div>
            </div>
          </details>
        </>
      ) : (
        <p className="text-xs text-danger">
          {t("invalidHex", { value: seed || "empty" })}
        </p>
      )}
    </section>
  );
}
