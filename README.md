# TadaHue

[繁體中文](README-TW.md)

A desktop color toolkit for creating palettes, exploring color harmonies, and previewing themes.

![TadaHue desktop app showing palette tools and a theme preview](assets/tadahue_001.webp)

## Features

- Explore color harmonies with a draggable five-color wheel.
- Generate 50–950 color scales and complementary, analogous, monochromatic, split-complementary, triadic, and shade palettes.
- Tune hue, lightness, and chroma in OKLCH; choose balanced, pastel, or vintage styles.
- Preview light and dark themes in dashboard, landing-page, and form layouts.
- Extract up to five colors from PNG, JPEG, WebP, and GIF images. Image processing stays on your device.
- Save up to 20 palettes locally and copy CSS, Tailwind configuration, or JSON.
- Pick colors from anywhere on screen with the desktop eyedropper.

## Desktop support

| Platform | Package                    | Screen eyedropper                                             |
| -------- | -------------------------- | ------------------------------------------------------------- |
| Linux    | AppImage                   | X11 capture or Wayland screenshot portal                      |
| Windows  | NSIS installer or portable | Electron screen capture                                       |
| macOS    | DMG                        | Electron screen capture; Screen Recording permission required |

See [platform support](docs/PLATFORM_SUPPORT.md) for permission details and Linux display options.

## Privacy

TadaHue has no analytics, telemetry, crash reporting, accounts, or cloud sync. Image extraction and saved palettes stay on your device.

## Development

Requires Node.js and pnpm.

```bash
pnpm install
pnpm dev             # Start the browser development server
pnpm electron:dev    # Launch the desktop app
```

See the [developer guide](docs/DEVELOPMENT.md) for the source layout and implementation notes.

## Build and checks

```bash
pnpm build
pnpm electron:build
pnpm lint
pnpm test
pnpm verify:theme
```

Build Windows and macOS packages on a matching machine or CI runner.

## License

TadaHue is licensed under the MIT License. Linux Wayland support uses `@homebridge/dbus-native`; see [third-party notices](THIRD_PARTY_NOTICES.md) for its dependency licenses.
