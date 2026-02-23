# Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove shadcn/ui entirely and rebuild the Clawd Files UI with custom Tailwind-only components, fixing all rendering breakage and delivering a dramatic Abyssal Terminal theme.

**Architecture:** Strip shadcn/Radix dependencies, fix broken CSS variable resolution, replace all 7 shadcn components with inline Tailwind styles (Card, Badge, Separator, Breadcrumb, Table) or lightweight custom components (Tabs) plus CSS utility classes (Button). No new abstractions where styled divs suffice.

**Tech Stack:** Next.js 16, Tailwind CSS v4, TypeScript, custom CSS utility classes

**Design doc:** `docs/plans/2026-02-23-visual-overhaul-design.md`

---

## Phase 1: Foundation (CSS + Dependencies)

### Task 1: Fix globals.css — Remove shadcn imports and fix theme

This is the critical fix that resolves font loading and sizing breakage.

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Rewrite globals.css**

Replace the entire file. Key changes:
- Remove `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"`
- Remove `@custom-variant dark`
- Remove all shadcn theme tokens from `:root`
- Remove all shadcn token registrations from `@theme inline`
- Remove `@layer base` block
- Fix `@theme inline` font registration (current `--font-heading: var(--font-heading)` is circular)
- Add button utility classes (.btn, .btn-primary, .btn-outline, .btn-ghost, .btn-destructive, .btn-sm, .btn-xs, .btn-lg)
- Keep all custom effects (noise, scanlines, glows, terminal-border, pulse-glow, sonar)
- Keep prose overrides, scrollbar styling, link styles, selection, focus

The new globals.css contents are specified in the design doc section "CSS & Theme Architecture Fix".

**Key CSS content to write:**

Imports:
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Root variables — only the Abyssal palette, fonts, and radius. No shadcn tokens.

Theme inline block — register color utilities, use `--font-sans: var(--font-body)` to map Tailwind's sans to our body font.

Button utilities — `.btn` base with `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-destructive` variants, plus `.btn-sm`, `.btn-xs`, `.btn-lg` size modifiers.

Keep all existing custom styles: noise overlay, scanlines, glows, terminal-border, prose overrides, scrollbar, focus, selection, links, headings, code blocks.

**Step 2: Verify build compiles**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: rewrite globals.css — remove shadcn, fix font variables, add btn utilities"
```

---

### Task 2: Remove shadcn dependencies and config

**Files:**
- Modify: `package.json`
- Delete: `components.json`

**Step 1: Uninstall packages**

```bash
npm uninstall radix-ui class-variance-authority tw-animate-css shadcn
```

**Step 2: Delete shadcn config**

```bash
rm components.json
```

**Step 3: Commit**

```bash
git add package.json package-lock.json components.json
git commit -m "chore: remove shadcn, radix-ui, CVA, tw-animate-css dependencies"
```

---

### Task 3: Create custom Tabs component

The only component that needs real interactivity (keyboard navigation).

**Files:**
- Create: `src/components/tabs.tsx`

**Step 1: Write the custom Tabs component**

A "use client" component with:
- Props: `tabs: Array<{value, label, content}>`, `defaultValue`, optional `className`
- `useState` for active tab
- `useRef` array for tab button elements
- `role="tablist"` on container, `role="tab"` on triggers, `role="tabpanel"` on content
- `aria-selected`, `aria-controls`, `id` attributes
- Arrow key navigation (Left/Right/Home/End)
- Visual: `border-b-2 border-accent text-accent` on active tab, `text-text-muted hover:text-text` on inactive
- ~60 lines total

**Step 2: Commit**

```bash
git add src/components/tabs.tsx
git commit -m "feat: add custom accessible Tabs component (replaces shadcn Tabs)"
```

---

## Phase 2: Update Preview Components

### Task 4: Update simple preview components — replace Card with div

**Files:**
- Modify: `src/components/preview/code-preview.tsx`
- Modify: `src/components/preview/image-preview.tsx`
- Modify: `src/components/preview/audio-preview.tsx`
- Modify: `src/components/preview/video-preview.tsx`
- Modify: `src/components/preview/download-preview.tsx`

For each file:
- Remove the `import { Card } from "@/components/ui/card"` line
- Replace `<Card className="...">` with `<div className="border border-border ...">`
- For download-preview: also remove `Button` import, replace `<Button asChild size="lg" className="glow-cyan-hover">` with `<a className="btn btn-primary btn-lg glow-cyan-hover">`

**Step 1: Update each file** (5 files, simple find-and-replace pattern)

**Step 2: Commit**

```bash
git add src/components/preview/
git commit -m "refactor: replace shadcn Card in preview components with styled divs"
```

---

### Task 5: Update markdown-preview.tsx — use custom Tabs

**Files:**
- Modify: `src/components/preview/markdown-preview.tsx`

Replace shadcn Tabs import with `import { Tabs } from "@/components/tabs"`. Change from compound component pattern (`<Tabs><TabsList><TabsTrigger>`) to our simpler prop-based pattern:

```tsx
<Tabs
  defaultValue="rendered"
  tabs={[
    { value: "rendered", label: "Rendered", content: <div className="prose ...">...</div> },
    { value: "source", label: "Source", content: <pre>...</pre> },
  ]}
/>
```

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/preview/markdown-preview.tsx
git commit -m "refactor: replace shadcn Tabs with custom Tabs in markdown preview"
```

---

### Task 6: Update csv-preview.tsx — replace Card and Table

**Files:**
- Modify: `src/components/preview/csv-preview.tsx`

Remove `Card` and `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` imports. Replace with:
- `<div className="overflow-x-auto rounded-lg border border-border">` wrapper (was Card)
- `<table className="w-full text-sm">` (was Table)
- `<thead>/<tr>/<th>` with Tailwind classes (was TableHeader/TableRow/TableHead)
- `<tbody>/<tr>/<td>` with Tailwind classes (was TableBody/TableRow/TableCell)

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/preview/csv-preview.tsx
git commit -m "refactor: replace shadcn Card+Table in CSV preview with native HTML"
```

---

## Phase 3: Update Layout Components

### Task 7: Update footer.tsx — replace Separator

**Files:**
- Modify: `src/components/footer.tsx`

Remove `Separator` import. Replace:
- `<Separator variant="gradientRight" className="w-8" />` → `<div className="w-8 h-px bg-gradient-to-r from-transparent to-border" />`
- `<Separator variant="gradientLeft" className="w-8" />` → `<div className="w-8 h-px bg-gradient-to-r from-border to-transparent" />`

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/footer.tsx
git commit -m "refactor: replace shadcn Separator in footer with gradient divs"
```

---

### Task 8: Update bucket-header.tsx — replace Badge, Button, Separator

**Files:**
- Modify: `src/components/bucket-header.tsx`

Remove imports for `Badge`, `Button`, `Separator`. Replace:
- `<Badge className="...">` → `<span className="inline-flex items-center text-xs px-2 py-0.5 rounded border ...">`
- `<Button asChild size="sm" variant="outline">` wrapping `<a>` → `<a className="btn btn-outline btn-sm glow-cyan-hover">`
- `<Separator variant="gradientLeft" className="flex-1" />` → `<div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />`

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/bucket-header.tsx
git commit -m "refactor: replace shadcn Badge/Button/Separator in bucket-header"
```

---

### Task 9: Update file-tree.tsx — replace Table, Card, Badge, Breadcrumb

**Files:**
- Modify: `src/components/file-tree.tsx`

This is the most complex replacement. Remove all 4 shadcn imports. Replace:
- `<Breadcrumb>/<BreadcrumbList>/<BreadcrumbItem>/<BreadcrumbLink>/<BreadcrumbPage>/<BreadcrumbSeparator>` → `<nav aria-label="Breadcrumb"><ol className="flex items-center gap-1.5">` with `<li>` items, `/` separators, and `aria-current="page"` on the last item
- `<Card>` wrapper → `<div className="rounded-lg border border-border overflow-hidden bg-surface/50">`
- `<Table>/<TableHeader>/<TableBody>/<TableRow>/<TableHead>/<TableCell>` → native HTML `<table>/<thead>/<tbody>/<tr>/<th>/<td>` with Tailwind classes
- `<Badge variant="outline" className="...">` → `<span className="inline-flex items-center rounded border px-1.5 py-0.5 ...">`

**Step 1: Rewrite the component** (preserving all business logic: buildTreeEntries, formatSize, formatDate, getExtBadge)

**Step 2: Commit**

```bash
git add src/components/file-tree.tsx
git commit -m "refactor: replace shadcn Table/Card/Badge/Breadcrumb in file-tree"
```

---

### Task 10: Update file-preview.tsx — replace Badge, Button, Card, Breadcrumb

**Files:**
- Modify: `src/components/file-preview.tsx`

Same pattern as file-tree. Remove all 4 shadcn imports. Replace:
- Breadcrumb compound components → `<nav aria-label="Breadcrumb"><ol>` with `/` separators
- `<Badge>` → `<span>` with inline badge styling
- `<Button asChild>` wrapping `<a>` → `<a className="btn btn-outline btn-xs ...">`
- `<Card>` → `<div className="border border-border rounded-lg ...">`

**Step 1: Rewrite the component** (preserving business logic: formatSize, formatTimeRemaining, getExtBadge)

**Step 2: Commit**

```bash
git add src/components/file-preview.tsx
git commit -m "refactor: replace shadcn Badge/Button/Card/Breadcrumb in file-preview"
```

---

## Phase 4: Update Admin Components

### Task 11: Update stats-cards.tsx — replace Card

**Files:**
- Modify: `src/components/admin/stats-cards.tsx`

Remove `Card`/`CardContent` import. Replace:
- `<Card className="...">` → `<div className="rounded-lg border border-border ...">`
- `<CardContent className="p-5">` → `<div className="p-5">`

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/admin/stats-cards.tsx
git commit -m "refactor: replace shadcn Card in stats-cards with styled div"
```

---

### Task 12: Update keys-table.tsx — replace Button, Table

**Files:**
- Modify: `src/components/admin/keys-table.tsx`

Remove `Button` and `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` imports. Replace:
- `<Table>` compound components → native HTML table with Tailwind classes
- `<Button variant="destructive" size="xs">` → `<button className="btn btn-destructive btn-xs">`
- Wrap table in `<div className="overflow-x-auto">`

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/admin/keys-table.tsx
git commit -m "refactor: replace shadcn Button/Table in keys-table with native HTML"
```

---

### Task 13: Update buckets-table.tsx — replace Button, Badge, Table

**Files:**
- Modify: `src/components/admin/buckets-table.tsx`

Same pattern as keys-table plus Badge replacement:
- `<Table>` → native HTML table
- `<Button variant="destructive" size="xs">` → `<button className="btn btn-destructive btn-xs">`
- `<Badge variant="outline" className={...}>` → `<span className="inline-flex items-center rounded-md border ...">`

**Step 1: Rewrite the component**

**Step 2: Commit**

```bash
git add src/components/admin/buckets-table.tsx
git commit -m "refactor: replace shadcn Button/Badge/Table in buckets-table with native HTML"
```

---

## Phase 5: Update Page Components

### Task 14: Update admin page — replace Card, Separator

**Files:**
- Modify: `src/app/admin/page.tsx`

Remove `Card` and `Separator` imports. Replace:
- `<Separator variant="gradientLeft" className="flex-1" />` → `<div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />`
- `<Card className="...">` wrappers → `<div className="border border-border ...">`
- Auth gate Card → `<div className="border border-border rounded-lg bg-surface px-4 py-3">`

**Step 1: Rewrite the page**

**Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "refactor: replace shadcn Card/Separator in admin page with styled divs"
```

---

### Task 15: Update docs page — replace Badge, Card, Separator

**Files:**
- Modify: `src/app/docs/page.tsx`

Remove `Badge`, `Card`, `CardContent`, `CardHeader`, `Separator` imports. Replace:
- `<Badge variant="outline">` → `<span className="inline-flex items-center rounded-md border ...">`
- `<Card>` → `<div className="border border-border ...">`
- `<CardHeader>` → `<div>` with same padding/border classes
- `<CardContent>` → `<div>` with same padding
- `<Separator>` → gradient div

**Step 1: Rewrite the page**

**Step 2: Commit**

```bash
git add src/app/docs/page.tsx
git commit -m "refactor: replace shadcn Badge/Card/Separator in docs page with native HTML"
```

---

### Task 16: Update landing page — replace Card, Button, Separator

**Files:**
- Modify: `src/app/page.tsx`

Remove `Card`, `Button`, `Separator` imports. Replace:
- Feature `<Card>` → `<div className="border border-border rounded-lg bg-surface/80 p-6 ...">`
- Code example `<Card>` → `<div className="border border-border rounded-lg bg-surface overflow-hidden">`
- `<Button asChild>` wrapping `<Link>` → `<Link className="btn btn-primary glow-cyan-hover">`
- `<Button asChild variant="outline">` wrapping `<a>` → `<a className="btn btn-outline">`
- `<Separator variant="gradient">` → `<div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />`

**Step 1: Rewrite the page**

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: replace shadcn Card/Button/Separator in landing page"
```

---

### Task 17: Update bucket page — replace Card

**Files:**
- Modify: `src/app/[bucket]/page.tsx`

Remove `Card` import. Replace the README `<Card>` wrapper:
- `<Card className="mt-8 rounded-lg border-border overflow-hidden p-0 py-0">` → `<div className="mt-8 rounded-lg border border-border overflow-hidden">`

**Step 1: Update the component**

**Step 2: Commit**

```bash
git add src/app/[bucket]/page.tsx
git commit -m "refactor: replace shadcn Card in bucket page with styled div"
```

---

## Phase 6: Cleanup

### Task 18: Delete shadcn UI component files

**Files:**
- Delete: `src/components/ui/card.tsx`
- Delete: `src/components/ui/button.tsx`
- Delete: `src/components/ui/table.tsx`
- Delete: `src/components/ui/badge.tsx`
- Delete: `src/components/ui/separator.tsx`
- Delete: `src/components/ui/breadcrumb.tsx`
- Delete: `src/components/ui/tabs.tsx`

**Step 1: Delete all shadcn UI files**

```bash
rm src/components/ui/card.tsx src/components/ui/button.tsx src/components/ui/table.tsx src/components/ui/badge.tsx src/components/ui/separator.tsx src/components/ui/breadcrumb.tsx src/components/ui/tabs.tsx
rmdir src/components/ui 2>/dev/null || true
```

**Step 2: Commit**

```bash
git add -A src/components/ui/
git commit -m "chore: delete all shadcn UI component files"
```

---

### Task 19: Build and verify

**Step 1: Grep for leftover shadcn imports**

```bash
grep -r "components/ui/" src/
```

Expected: No results.

**Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Run lint**

```bash
npm run lint
```

Expected: No errors.

**Step 4: Run dev server and visually verify every page**

```bash
npm run dev
```

Check:
- `/` — Landing: hero, feature cards, code example, buttons
- `/docs` — API docs: sidebar, badges, code blocks
- `/admin?token=...` — Admin: stats cards, tables, delete buttons
- `/:bucket` — Bucket: breadcrumbs, file tree, README
- `/:bucket/:path` — File preview: breadcrumbs, metadata bar, previews

Verify:
- Fonts load correctly (Roboto body, JetBrains Mono code)
- No horizontal scrollbar on desktop viewport
- Glow effects work on hover
- Noise texture and scanlines visible
- Tabs keyboard navigation works (arrow keys)
- All buttons styled correctly
- All text readable

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address remaining issues from visual overhaul verification"
```

---

## Summary

| Phase | Tasks | What Changes |
|-------|-------|-------------|
| 1: Foundation | 1-3 | Fix CSS, remove deps, create Tabs |
| 2: Previews | 4-6 | Update 7 preview components |
| 3: Layout | 7-10 | Update footer, bucket-header, file-tree, file-preview |
| 4: Admin | 11-13 | Update stats-cards, keys-table, buckets-table |
| 5: Pages | 14-17 | Update admin, docs, landing, bucket pages |
| 6: Cleanup | 18-19 | Delete shadcn files, build, verify |

**Total: 19 tasks across 6 phases**

**Dependencies:**
- Task 1 (CSS fix) runs first
- Task 2 (remove deps) runs after Task 1
- Task 3 (create Tabs) runs before Task 5 (markdown-preview)
- Tasks 4-17 can run in any order after Tasks 1-3
- Task 18 (delete UI files) runs after all component updates (Tasks 4-17)
- Task 19 (verify) runs last
