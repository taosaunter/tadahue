import type { ThemeMode, ThemePalette } from "../../color/palette";
import { useLocale } from "../../app/i18n";

export default function ContrastPanel({
  palette,
  theme,
}: {
  palette: ThemePalette;
  theme: ThemeMode;
}) {
  const { t } = useLocale();
  const checks = [...palette.checks[theme]].sort(
    (a, b) => Number(a.ok) - Number(b.ok),
  );
  const colors = Object.fromEntries(
    palette[theme].map((role) => [role.name, role.hex]),
  );
  return (
    <div className="contrast-panel">
      <h2 className="text-sm font-medium">
        {t("contrastSummary", {
          passed: String(checks.filter((check) => check.ok).length),
          total: String(checks.length),
        })}
      </h2>
      <p className="text-ink-muted mt-2 text-xs leading-relaxed">
        {t("contrastHint")}
      </p>
      <table className="contrast-table">
        <caption className="sr-only">
          {t("contrastTab")} · {t(theme)}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t("contrastPair")}</th>
            <th scope="col">{t("contrastRatio")}</th>
            <th scope="col">{t("contrastMinimum")}</th>
            <th scope="col">{t("contrastResult")}</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={`${check.fg}/${check.bg}`}>
              <th scope="row">
                {[check.fg, check.bg].map((name) => (
                  <span
                    key={name}
                    className="contrast-color"
                    title={colors[name]}
                  >
                    <span
                      className="contrast-chip"
                      style={{ backgroundColor: colors[name] }}
                      aria-hidden="true"
                    />
                    <span>{name}</span>
                  </span>
                ))}
              </th>
              <td>{check.ratio.toFixed(2)}:1</td>
              <td>{check.min}:1</td>
              <td>
                <span className={check.ok ? "text-success" : "text-danger"}>
                  {t(check.ok ? "contrastPass" : "contrastFail")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
