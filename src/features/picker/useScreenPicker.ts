import { useState, useEffect, useCallback } from "react";
import { useLocale } from "../../app/i18n";
import type { PickerError } from "../../types/electron";

// Renderer-side picker state; capture and portal details stay behind the preload bridge.
export function useScreenPicker(onPicked: (hex: string) => void) {
  const { locale } = useLocale();
  const [nativePickerAvailable, setNativePickerAvailable] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickerError, setPickerError] = useState<PickerError | null>(null);
  useEffect(() => {
    const api = window.colorPicker;
    if (!api) return;
    return api.onDone(({ hex, error }) => {
      setPicking(false);
      setPickerError(error ?? null);
      if (hex) onPicked(hex);
    });
  }, [onPicked]);

  useEffect(() => {
    let active = true;
    window.colorPicker
      ?.nativeAvailable()
      .then((available) => {
        if (active) setNativePickerAvailable(available);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handlePick = useCallback(
    (mode: "magnifier" | "native" = "magnifier") => {
      if (!window.colorPicker) return;
      setPickerError(null);
      window.colorPicker.start(locale, mode);
      setPicking(true);
    },
    [locale],
  );

  return {
    picking,
    error: pickerError,
    nativeAvailable: nativePickerAvailable,
    start: handlePick,
  };
}
