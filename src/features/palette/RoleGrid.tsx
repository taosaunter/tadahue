import type { ThemeRole } from "../../color/palette";
import { useLocale } from "../../app/i18n";

// Shared token swatches for the All color tokens and Tuning panels.
interface RoleGridProps {
  title: string;
  roles: ThemeRole[];
  copied: string | null;
  error?: string | null;
  onCopy: (hex: string, key: string) => void;
}

export default function RoleGrid({
  title,
  roles,
  copied,
  error,
  onCopy,
}: RoleGridProps) {
  const { t } = useLocale();
  return (
    <div className="rounded-lg p-2">
      <h2 className="text-ink-muted mb-2 text-xs">{title}</h2>
      <div
        className={
          roles.length === 28 ? "token-grid" : "grid grid-cols-5 gap-2"
        }
      >
        {roles.map((role) => {
          const key = `${title}:${role.name}`;
          const label = `${role.name} · ${role.hex} · ${error === key ? t("copyFailed") : copied === key ? t("copied") : t("copyHex", { hex: role.hex })}`;
          return (
            <button
              key={role.name}
              type="button"
              onClick={() => onCopy(role.hex, key)}
              aria-label={label}
              data-tooltip={label}
              className="swatch-button rounded-lg"
              style={{ backgroundColor: role.hex }}
            />
          );
        })}
      </div>
      <p role="status" className="sr-only">
        {error ? t("copyFailed") : copied ? t("copied") : ""}
      </p>
    </div>
  );
}
