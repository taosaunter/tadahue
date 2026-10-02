#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  displayModeArgs,
  RESTART_X11,
  RESTART_AUTO,
} from "../electron/platform/display-mode.mjs";

const vite = spawn("pnpm", ["exec", "vite"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env },
});
let started = false;
let electron = null;
let stopping = false;
const initialArgs = [
  "exec",
  "electron",
  ".",
  "--remote-debugging-port=9222",
  "--remote-allow-origins=*",
];

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(fallback);
  electron?.kill();
  vite.kill();
  process.exit(code);
}
function launch(url, args = initialArgs) {
  electron = spawn("pnpm", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: url,
      TADAHUE_DEV_LAUNCHER: "1",
    },
  });
  electron.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  electron.on("exit", (code) => {
    if (stopping) return;
    if (
      process.platform === "linux" &&
      (code === RESTART_X11 || code === RESTART_AUTO)
    ) {
      launch(url, displayModeArgs(initialArgs, code === RESTART_X11));
    } else stop(code ?? 1);
  });
}
vite.stdout.on("data", (data) => {
  process.stdout.write(data);
  const match = data.toString().match(/Local:\s+(https?:\/\/localhost:\d+)/);
  if (match && !started) {
    started = true;
    clearTimeout(fallback);
    launch(match[1]);
  }
});
vite.stderr.on("data", (data) => process.stderr.write(data));
vite.on("error", (error) => {
  console.error(error);
  stop(1);
});
vite.on("exit", (code) => stop(code ?? 1));
const fallback = setTimeout(() => {
  if (!started) {
    started = true;
    launch("http://localhost:5173");
  }
}, 15000);
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
