# TadaHue

> A desktop color toolkit for creating harmonious palettes, generating color scales, extracting colors from images, and previewing light and dark themes.

[繁體中文](README-TW.md)

## Features

- Explore complementary, split-complementary, and triadic palettes with a draggable five-color wheel.
- Generate Tailwind-style 50–950 scales, analogous and monochromatic palettes, complementary schemes, and shades.
- Choose balanced, pastel, or vintage styles, then tune hue, lightness, and chroma in OKLCH.
- Preview light and dark themes in dashboard, landing-page, and form layouts.
- Extract up to five colors from PNG, JPEG, WebP, and GIF images, then apply a color as the seed or accent. Image processing stays local; images are not uploaded.
- Save up to 20 palettes locally and copy CSS, Tailwind configuration, or JSON.
- Use the desktop eyedropper to pick a color from the screen.

## Privacy and data

- TadaHue has no usage analytics, telemetry, or crash-reporting feature. It does not send usage logs or color data.
- Image color extraction happens locally; images are not uploaded.
- Saved palettes stay in local browser or desktop-app storage. TadaHue has no accounts or cloud sync.

## Development

Requires Node.js and pnpm.

```bash
pnpm install
pnpm dev             # Start the browser development server
pnpm electron:dev    # Launch the Electron desktop app
```

## Build and checks

```bash
pnpm build
pnpm lint
pnpm test
pnpm verify:theme
pnpm electron:build
```

Electron Builder is configured for Linux AppImage, Windows NSIS and portable packages, and macOS DMG. For Windows and macOS releases, use a matching machine or CI runner.

**Platform note:** The screen eyedropper currently uses Linux's `spectacle` command to capture the screen, so it is available only on Linux desktop environments with `spectacle` installed. Image color extraction runs locally in the renderer.
