# Platform support

[繁體中文](PLATFORM_SUPPORT-TW.md)

## Package formats

| Platform | Package |
| --- | --- |
| Linux | AppImage |
| Windows | NSIS installer or portable package |
| macOS | DMG |

## Screen eyedropper

The magnifier samples a still capture from the moment picking starts; it does not continuously sample video. In magnifier mode, left-click or **Enter** picks a color, arrow keys adjust by one captured pixel, and right-click or **Esc** cancels.

### Linux Wayland

- TadaHue requests a still screenshot through the XDG Desktop Portal. The desktop environment controls the permission prompt and whether permission is remembered.
- With one display and matching capture dimensions, a transparent overlay leaves the desktop visible. The magnifier still samples the captured frame. Multiple displays or mismatched dimensions use a fitted screenshot preview.
- If screenshot capture is unavailable, TadaHue offers **Use system picker (without magnifier)** when the portal provides `Screenshot.PickColor`.

### Linux X11, Windows, and macOS

These sessions use Electron's `desktopCapturer`; no external screenshot tool is required. Captures stay in memory and are discarded when picking ends. Multiple displays are matched by display ID, with coordinates mapped to the actual capture size for high-DPI screens.

On macOS, allow TadaHue under **System Settings → Privacy & Security → Screen Recording**. Some macOS versions call this **Screen & System Audio Recording**. Restart the app if macOS asks you to.

## Linux X11 compatibility mode

Open **Desktop settings → X11 compatibility mode**, then choose **Restart and apply**. XWayland must be available. This changes Electron's display backend; when TadaHue is running in a Wayland session, screen picking continues to use the screenshot portal. An explicit `--ozone-platform` command-line option takes precedence over the saved setting.

