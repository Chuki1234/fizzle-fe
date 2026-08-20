---
version: 1.0.0
name: Snyk-io-design-analysis
description: Snyk.io delivers a high-contrast developer cybersecurity experience with a signature obsidian-purple background (#0e0b16), deep violet surfaces (#161324), electric purple primary accents (#8b5cf6 / #7c3aed), cyber cyan highlights (#00f0ff), and high-visibility vulnerability severity indicators (Critical Red, High Orange, Medium Yellow, Low Blue). Inter and Outfit handle UI copy and headlines, while JetBrains Mono powers terminal commands, CLI vulnerability scans, and security patch outputs.
colors:
  primary: "#7c3aed"
  primary-hover: "#6d28d9"
  primary-glow: "rgba(139, 92, 246, 0.35)"
  brand-purple: "#8b5cf6"
  brand-purple-deep: "#4c1d95"
  brand-purple-soft: "#a855f7"
  brand-cyan: "#00f0ff"
  brand-cyan-soft: "rgba(0, 240, 255, 0.15)"
  brand-pink: "#ec4899"
  severity-critical: "#f43f5e"
  severity-critical-bg: "rgba(244, 63, 94, 0.12)"
  severity-high: "#f97316"
  severity-high-bg: "rgba(249, 115, 22, 0.12)"
  severity-medium: "#eab308"
  severity-medium-bg: "rgba(234, 179, 8, 0.12)"
  severity-low: "#3b82f6"
  severity-low-bg: "rgba(59, 130, 246, 0.12)"
  canvas-dark: "#0e0b16"
  surface-dark: "#161324"
  surface-dark-card: "#1d1838"
  surface-dark-code: "#09070f"
  hairline-dark: "rgba(139, 92, 246, 0.2)"
  hairline-dark-hover: "rgba(139, 92, 246, 0.45)"
  canvas-light: "#f9f8fe"
  surface-light: "#ffffff"
  surface-light-card: "#f3f0fa"
  surface-light-code: "#131022"
  hairline-light: "#e9e5f5"
  hairline-light-hover: "#d4cce8"
  ink-dark: "#f8fafc"
  slate-dark: "#cbd5e1"
  steel-dark: "#94a3b8"
  stone-dark: "#64748b"
  ink-light: "#1e1b4b"
  slate-light: "#334155"
  steel-light: "#475569"
  stone-light: "#64748b"

typography:
  hero-display:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -2px
  display-lg:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: -1.5px
  heading-1:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -1px
  heading-2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  heading-4:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.30
  heading-5:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.40
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  micro-uppercase:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.40
    letterSpacing: 0.75px
  code-md:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 64px
  hero: 100px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    shadow: "0 0 20px rgba(139, 92, 246, 0.4)"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.brand-purple}"
    border: "1px solid {colors.hairline-dark}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card-security:
    backgroundColor: "{colors.surface-dark}"
    border: "1px solid {colors.hairline-dark}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    shadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
  terminal-window:
    backgroundColor: "{colors.surface-dark-code}"
    border: "1px solid {colors.hairline-dark}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  badge-severity-critical:
    backgroundColor: "{colors.severity-critical-bg}"
    textColor: "{colors.severity-critical}"
    rounded: "{rounded.xs}"
    padding: "2px 8px"
---

## Snyk.io Design Overview

Snyk.io is built around a developer-first cybersecurity aesthetic. It combines dark obsidian canvas backgrounds with rich deep purple glassmorphism panels, glowing electric purple CTAs, and neon severity status tags.

### Key Visual Traits:
- **Obsidian & Deep Violet Theme**: Dark theme dominates with rich obsidian background (`#0e0b16`) and deep purple surfaces (`#161324`).
- **Electric Accent Colors**: Electric Purple (`#8b5cf6`), Cyber Cyan (`#00f0ff`), and Magenta (`#ec4899`).
- **Security Scanner Aesthetic**: Terminal windows, vulnerability score badges, continuous integration icons, and glowing mesh grid backdrops.
- **Precision Typography**: Clean sans-serif UI typography paired with sharp monospace code outputs.
