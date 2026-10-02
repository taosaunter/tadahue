import { useLocale } from "../../app/i18n";
import { EyedropperIcon } from "../../shared/Icons";
import type { useScreenPicker } from "./useScreenPicker";

type Props = { picker: ReturnType<typeof useScreenPicker> };

const PICKER_ERROR_MESSAGES = {
  "screenshot-unavailable": "pickerScreenshotUnavailable",
  "screen-permission": "pickerPermission",
  "capture-failed": "pickerFailed",
  "native-unavailable": "pickerNativeUnavailable",
  "native-failed": "pickerNativeFailed",
} as const;

// Toolbar action is separate from the status below the workspace.
export function ScreenPickerButton({ picker }: Props) {
  const { t } = useLocale();
  if (!window.colorPicker) return null;
  return (
    <button
      type="button"
      onClick={() => picker.start()}
      className="icon-button"
      aria-label={t("eyedropper")}
      disabled={picker.picking}
      data-tooltip={t("eyedropper")}
      title={t("eyedropper")}
    >
      <EyedropperIcon />
    </button>
  );
}

export function ScreenPickerStatus({ picker }: Props) {
  const { t } = useLocale();
  return (
    <>
      {picker.picking && (
        <p className="text-accent mt-2 text-xs">{t("picking")}</p>
      )}
      {picker.error && (
        <div className="mt-2">
          <p role="alert" className="text-accent text-xs">
            {t(PICKER_ERROR_MESSAGES[picker.error])}
          </p>
          {picker.nativeAvailable &&
            picker.error === "screenshot-unavailable" && (
              <button
                className="quiet-button mt-2"
                type="button"
                onClick={() => picker.start("native")}
              >
                {t("pickerUseNative")}
              </button>
            )}
        </div>
      )}
    </>
  );
}
