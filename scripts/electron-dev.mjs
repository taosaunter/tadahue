#!/usr/bin/env node
import { spawn } from "node:child_process";

const vite = spawn("pnpm", ["exec", "vite"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env },
});

let started = false;
let electron = null;

vite.stdout.on("data", (d) => {
  process.stdout.write(d.toString());
  const m = d.toString().match(/Local:\s+(https?:\/\/localhost:\d+)/);
  if (m && !started) {
    started = true;
    electron = spawn(
      "pnpm",
      [
        "exec",
        "electron",
        ".",
        "--ozone-platform=x11",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*",
      ],
      {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: m[1] },
      },
    );
    electron.on("exit", () => {
      vite.kill();
      process.exit();
    });
  }
});

vite.stderr.on("data", (d) => process.stderr.write(d));

// Fallback for missing URL detection
setTimeout(() => {
  if (!started) {
    started = true;
    electron = spawn(
      "pnpm",
      [
        "exec",
        "electron",
        ".",
        "--ozone-platform=x11",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*",
      ],
      {
        stdio: "inherit",
        env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5173" },
      },
    );
    electron.on("exit", () => {
      vite.kill();
      process.exit();
    });
  }
}, 15000);
