# Visual Overhaul Design — Clawd Files

**Date:** 2026-02-23
**Status:** Approved
**Approach:** Clean Rip & Replace (remove shadcn, custom Tailwind-only)

## Problem

The shadcn/ui migration (commit 7d6edd5) and subsequent font/color commits broke the site:
- Fonts don't load (circular CSS variable references in `@theme inline`)
- Elements are oversized with unwanted horizontal scrollbars
- `shadcn/tailwind.css` import injects conflicting base styles
- `@layer base` block competes with explicit body styles

## Goals

1. Fix all rendering/font/sizing breakage
2. Remove shadcn/ui and all Radix dependencies entirely
3. Full visual redesign keeping the Abyssal Terminal theme
4. Dramatic & atmospheric visual quality — bioluminescent glows, depth layers
5. Custom Tailwind-only components with utility classes for buttons

## Architecture Decisions

### Remove These Dependencies
- `shadcn` (dev)
- `radix-ui`
- `class-variance-authority`
- `tw-animate-css` (dev)
- `clsx` (keep — still useful)
- `tailwind-merge` (keep — still useful)

### Remove These Files
- `src/components/ui/card.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/tabs.tsx`
- `components.json` (shadcn config)

### Keep These Files (modified)
- `src/lib/utils.ts` — keep `cn()` utility (clsx + tailwind-merge)

## CSS & Theme Architecture Fix

### globals.css Changes

**Remove:**
- `@import "tw-animate-css"`
- `@import "shadcn/tailwind.css"`
- `@custom-variant dark (&:is(.dark *))` (single theme, not needed)
- All shadcn theme tokens from `:root` (--background, --foreground, --card, etc.)
- All shadcn theme registrations from `@theme inline`
- `@layer base` block (lines 230-237)

**Fix:**
- Font registration in `@theme inline` — replace self-referencing variables with
  actual font stack values or reference the `:root` variables correctly using
  Tailwind v4's `--font-*` namespace

**Keep:**
- `@import "tailwindcss"`
- `@plugin "@tailwindcss/typography"`
- Abyssal palette variables (--bg, --surface, --accent, etc.)
- All custom effects (noise, scanlines, glows, terminal-border)
- Prose/markdown overrides
- Scrollbar styling
- Selection, focus, link styles

**Add:**
- Button utility classes (.btn, .btn-primary, .btn-outline, .btn-ghost, .btn-destructive)

### Resulting `:root` Variables

```css
:root {
  /* Abyssal palette */
  --bg: #06090f;
  --surface: #0d1520;
  --surface-hover: #111d2c;
  --border: #1a2d40;
  --accent: #22d3ee;
  --accent-warm: #f97316;
  --text: #e2e8f0;
  --text-muted: #94a3b8;

  /* Font stacks */
  --font-heading: var(--font-roboto), var(--font-noto-emoji), sans-serif;
  --font-body: var(--font-roboto), var(--font-noto-emoji), sans-serif;
  --font-code: var(--font-jetbrains-mono), var(--font-noto-emoji), monospace;

  /* Radius */
  --radius: 0.5rem;
}
```

### Resulting `@theme inline` Block

```css
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-warm: var(--accent-warm);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);

  --font-heading: var(--font-heading);
  --font-body: var(--font-body);
  --font-code: var(--font-code);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
}
```

## Component Replacements

### Card → Styled `<div>`

No component needed. Each usage applies Tailwind classes directly:

```
bg-surface border border-border rounded-lg
```

Interactive cards add: `transition-colors hover:border-accent/30 hover:bg-surface-hover glow-cyan-hover`

### Button → Utility Classes

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-code);
  transition: all 0.15s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: var(--bg);
}
.btn-primary:hover {
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.3);
  background: color-mix(in oklch, var(--accent) 90%, white);
}

.btn-outline {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-outline:hover {
  border-color: color-mix(in oklch, var(--accent) 30%, transparent);
  background: var(--surface-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
}
.btn-ghost:hover {
  background: var(--surface);
  color: var(--text);
}

.btn-destructive {
  background: #ef4444;
  color: var(--text);
}
.btn-destructive:hover {
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
}
```

### Table → Native HTML + Tailwind

Wrapper: `<div class="overflow-x-auto">`
Table: `<table class="w-full text-sm">`
Header: `<th class="text-left text-xs text-text-muted uppercase font-code px-4 py-2 border-b border-border">`
Row: `<tr class="border-b border-border hover:bg-surface-hover transition-colors">`
Cell: `<td class="px-4 py-2">`

### Badge → `<span>` with Tailwind

Default: `<span class="inline-flex items-center text-xs px-2 py-0.5 rounded bg-surface text-accent font-code">`
Muted: `<span class="inline-flex items-center text-xs px-2 py-0.5 rounded bg-border/30 text-text-muted font-code">`

### Separator → Inline gradient

```html
<div class="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
```

Variants:
- Left: `from-border to-transparent`
- Right: `from-transparent to-border`

### Breadcrumb → `<nav>` with ARIA

```html
<nav aria-label="Breadcrumb" class="overflow-x-auto font-code text-sm">
  <ol class="flex items-center gap-1.5">
    <li><a href="..." class="text-text-muted hover:text-accent">root</a></li>
    <li class="text-text-muted">/</li>
    <li><span class="text-text" aria-current="page">current</span></li>
  </ol>
</nav>
```

### Tabs → Custom Client Component

A minimal `<Tabs>` component (~60 lines) with:
- `role="tablist"`, `role="tab"`, `role="tabpanel"` ARIA
- `aria-selected`, `aria-controls`, `id` bindings
- Arrow key navigation (Left/Right to switch tabs)
- Visual: underline indicator with `border-b-2 border-accent` on active tab
- Styled with Tailwind classes, no external dependencies

## Visual Enhancement

### Glow System

- **Ambient glow orbs**: Radial gradients behind hero and feature sections at 5-7% opacity
- **Interactive glow**: `box-shadow: 0 0 Npx rgba(34,211,238, 0.N)` on hover states
- **Bioluminescent pulses**: Existing `pulse-glow` animation on status indicators

### Surface Depth Hierarchy

| Level | Token           | Hex       | Usage                        |
|-------|-----------------|-----------|------------------------------|
| 0     | `bg`            | `#06090f` | Page background (the void)   |
| 1     | `surface`       | `#0d1520` | Raised containers, cards     |
| 2     | `surface-hover` | `#111d2c` | Active/hover states          |
| -     | `border`        | `#1a2d40` | All borders, dividers        |

### Typography

| Role    | Font          | Sizes            |
|---------|---------------|------------------|
| Heading | Roboto        | 5xl-7xl (hero), 2xl-3xl (sections), lg (cards) |
| Body    | Roboto        | sm-base          |
| Code    | JetBrains Mono| xs-sm            |

### Effects (kept from current)

- SVG fractal noise overlay at 3% opacity (body::before)
- Scanline repeating gradient at 1.5% opacity (body::after)
- `terminal-border` class with gradient mask edge glow
- Custom thin dark scrollbars (webkit + Firefox)
- Cyan selection highlight
- Link hover text-shadow glow

## Files Modified

Every file that imports from `@/components/ui/*` needs updating:

1. `src/app/globals.css` — Theme fix + button utilities
2. `src/app/layout.tsx` — Remove any shadcn-related setup (if any)
3. `src/app/page.tsx` — Replace Card, Button, Separator
4. `src/app/docs/page.tsx` — Replace Badge, Card, Separator
5. `src/app/admin/page.tsx` — Replace Card, Separator
6. `src/app/[bucket]/page.tsx` — Replace Card
7. `src/components/page-shell.tsx` — No changes needed
8. `src/components/footer.tsx` — Replace Separator
9. `src/components/bucket-header.tsx` — Replace Badge, Button, Separator
10. `src/components/file-tree.tsx` — Replace Table, Card, Badge, Breadcrumb
11. `src/components/file-preview.tsx` — Replace Badge, Button, Card, Breadcrumb
12. `src/components/preview/code-preview.tsx` — Replace Card
13. `src/components/preview/markdown-preview.tsx` — Replace Tabs (new custom component)
14. `src/components/preview/image-preview.tsx` — Replace Card
15. `src/components/preview/audio-preview.tsx` — Replace Card
16. `src/components/preview/video-preview.tsx` — Replace Card
17. `src/components/preview/csv-preview.tsx` — Replace Card, Table
18. `src/components/preview/download-preview.tsx` — Replace Card, Button
19. `src/components/admin/stats-cards.tsx` — Replace Card
20. `src/components/admin/buckets-table.tsx` — Replace Button, Badge, Table
21. `src/components/admin/keys-table.tsx` — Replace Button, Table

## Files Deleted

- `src/components/ui/card.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/tabs.tsx`
- `components.json`

## Files Created

- `src/components/tabs.tsx` — Custom accessible tabs component (~60 lines)

## Dependency Changes

**Remove:**
- `radix-ui`
- `class-variance-authority`
- `tw-animate-css` (dev)
- `shadcn` (dev)

**Keep:**
- `clsx`
- `tailwind-merge`
- `lucide-react`
- All other existing deps

## Testing

- Visual inspection of every page: landing, docs, admin, bucket view, file preview
- Font loading verification (Roboto, JetBrains Mono)
- Responsive testing (mobile, tablet, desktop)
- Keyboard navigation on tabs component
- No horizontal overflow on any page at desktop viewport
- Glow effects render correctly
- Noise/scanline overlays visible
