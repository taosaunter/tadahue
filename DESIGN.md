---
name: TadaHue
description: Desktop color toolkit with a neutral palette proofing workspace.
colors:
  paper: "#f5f4f0"
  surface: "#ffffff"
  surface-raised: "#eeefe8"
  ink: "#202522"
  ink-muted: "#626b65"
  line: "#dcddd6"
  accent: "#386957"
  primary-muted: "#e5e9e3"
  success: "#386957"
  warning: "#865f23"
  danger: "#ab3c32"
  info: "#305d7c"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: "34px"
    letterSpacing: "-0.8px"
  headline:
    fontFamily: "Noto Sans TC Variable, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.5px"
  body:
    fontFamily: "Noto Sans TC Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Noto Sans TC Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "20px"
  code:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 16px"
  input-color:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px 0 58px"
  palette-swatch:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "76px"
---

# Design System: TadaHue

## Overview

**Creative North Star: "The Palette Proofing Desk"**

The editor is a neutral workspace for inspecting generated palettes. The app shell uses warm paper, white surfaces, graphite text, and fine borders; generated colors are shown in swatches and in the scoped sample preview. The desktop layout places controls beside results, while the compact layout switches between editor and preview tabs.

**Key Characteristics:**
- Neutral light and dark app themes
- Generated colors stay within palette output and its preview
- Color values use monospaced text

## Colors

The light app theme uses warm neutral surfaces, graphite text, a muted green accent, and semantic status colors. Exact values are in the frontmatter and `src/styles/theme.css`; the dark theme has separate values in that stylesheet. Generated palette colors are computed at runtime and are not a fixed part of this system.

**The Neutral Shell Rule.** Keep generated palette colors in the swatches and preview, not the editor chrome.

## Typography

**Display Font:** Manrope Variable (sans-serif)
**Body Font:** Noto Sans TC Variable (sans-serif)
**Label/Mono Font:** IBM Plex Mono (monospace)

The wordmark uses Manrope; interface copy uses Noto Sans TC; hex values and code use IBM Plex Mono. The measured roles and sizes are listed in the frontmatter.

## Layout

The desktop header is 80px high. The workspace has a 272px color editor, a flexible preview, and a 272px tuning column, with 24px gaps and page padding. At desktop heights of 800px or less, gaps and padding reduce to 20px. At 1100px and below, the header is 72px and editor, preview, and library use tabs; the editor keeps color and tuning controls side by side until 680px, then stacks them. The mobile bottom action bar preserves access to save and export. See `src/features/workspace/workspace.css`.

Color-code and image sources share a fixed-height area so switching sources does not move the wheel or preview. Advanced tuning stays visible. The style dropdown and single light/dark preview toggle sit together in the preview toolbar; fixed-background mode belongs beside the base-color input.

## Elevation & Depth

Ordinary surfaces use borders and tonal differences. Shadows appear on the side sheet, color popover, and transient save feedback.

## Shapes

Common control radii are 7–8px. Swatches and preview surfaces use 10–12px corners. Fields and cards use thin neutral borders.

## Components

### Buttons
- The filled button uses the app primary color; outline and ghost variants serve secondary actions.
- Buttons are 40px high by default. Focus uses a visible outline; reduced-motion preferences remove transitions.

### Inputs / Fields
- Color fields are 44px high with a monospaced value and a leading color chip.
- Invalid values show an inline error while retaining the last valid preview; save and export are disabled.

### Navigation
- Desktop navigation is in the header. At compact widths, editor and preview use tabs.
- Tabs support arrow keys, Home, and End.

### Palette Swatches
- Five generated colors appear as equal columns with color blocks and hex values.
- Selecting a swatch copies its value and gives visible feedback.

### Preview Action
- The sample interface's primary action sizes to its content, with a 36px height and 12px text. The website sample uses two flexible columns so its project panel remains visible at the default desktop size and on narrow previews.

## Do's and Don'ts

### Do:
- **Do** keep app chrome neutral and scope generated theme colors to the preview.
- **Do** show computed contrast results and their foreground/background pair.
- **Do** retain keyboard focus visibility and modal focus restoration.

### Don't:
- **Don't** use mock palette colors or contrast ratios as generated output.
- **Don't** hide save and export access on compact screens.
- **Don't** add decorative gradients outside color editing.
