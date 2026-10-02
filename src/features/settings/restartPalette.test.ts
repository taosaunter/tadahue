import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  readRestartPalette,
  rememberRestartPalette,
  RESTART_PALETTE_KEY,
} from "./restartPalette.ts";
import { createSnapshot } from "../library/savedPalettes.ts";
import { generateThemePalette, DEFAULT_TUNING } from "../../color/palette.ts";

function mockStorage(t: TestContext, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
}

test("restart drafts preserve unsaved palette tokens, tuning, harmony, and the active saved palette", (t) => {
  const values = new Map<string, string>();
  mockStorage(t, {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as unknown as Storage);
  const tuning = { ...DEFAULT_TUNING, hueShift: 12 };
  const palette = generateThemePalette("#123456", "pastel", tuning, "#abcdef")!;
  const snapshot = {
    ...createSnapshot("restart", "Draft", "", "pastel", tuning, palette),
    wheel: { mode: "triad" as const, accent: "#abcdef" },
  };
  assert.equal(rememberRestartPalette(snapshot, "saved-123"), true);
  assert.deepEqual(readRestartPalette(), { snapshot, activeId: "saved-123" });
});

test("damaged restart data is ignored", (t) => {
  let raw = "{broken";
  mockStorage(t, {
    getItem: (key: string) => (key === RESTART_PALETTE_KEY ? raw : null),
  } as Storage);
  assert.equal(readRestartPalette(), null);
  raw = JSON.stringify({ snapshot: { seed: "not-a-color" }, activeId: null });
  assert.equal(readRestartPalette(), null);
});

test("blocked storage prevents restart from silently losing the current palette", (t) => {
  mockStorage(t, {
    setItem: () => {
      throw new Error("Storage full");
    },
  } as unknown as Storage);
  const palette = generateThemePalette("#123456", "balanced", DEFAULT_TUNING)!;
  assert.equal(
    rememberRestartPalette(
      createSnapshot(
        "restart",
        "Draft",
        "",
        "balanced",
        DEFAULT_TUNING,
        palette,
      ),
      null,
    ),
    false,
  );
});
