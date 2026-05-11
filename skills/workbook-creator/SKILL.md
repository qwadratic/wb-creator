---
name: workbook-creator
description: >
  Create printable student workbooks (HTML to PDF). Use this skill for any request
  to create, audit, or edit a workbook. Supports two modes: FULL (multi-block courses)
  and SIMPLE (short courses, single lectures, webinars). Includes pedagogical principles,
  UX standards for fields, print layout rules, a page planning algorithm, overflow auditing,
  and an AI-generated cover illustration workflow via nano-banana.
---

# SKILL: Creating a Printable Student Workbook

## 1. Overview

A workbook is a tool for thinking, not just a set of notes.

**Golden Rule:** 80% of the page area is for the student's work, 20% is for information from the author.

The workbook doesn't just summarize the course material; it creates a structure for understanding it. Each section should answer the question: "What should the student DO with this information?"

This skill supports creating a workbook from scratch from provided content (like a transcript) or auditing an existing workbook draft. The final output is a branded PDF.

## 2. Workbook Mode Selection

**ALWAYS ask the user which mode they want before starting.** If the user doesn't specify, infer from context:

| Mode | When to Use | Typical Size | Structure |
|:-----|:------------|:-------------|:----------|
| **FULL** | Multi-module courses, long programs (3+ topics) | 15–30 pages | Cover → Intro → Block 1 (title + sections + conclusions) → Block 2 → ... → Reflection → Final |
| **SIMPLE** | Single lecture, webinar, short workshop (1–2 topics) | 4–10 pages | Cover → Content pages (flat sections, no block title pages) → Reflection → Final |

**Decision rule:** If the source material covers ≤ 2 distinct topics or is under 30 minutes of content → suggest SIMPLE. Otherwise → suggest FULL.

### FULL Mode Structure

```
Cover
Introduction page (how to use the workbook)
  Block 1:
    Block title page
    Section 1.1
    Section 1.2
    ...
    Block conclusions page
  Block 2: (same pattern)
  Block 3: (same pattern)
Reflection page
Final page
```

- Each block gets its own dark-background title page with block number.
- Each block ends with a conclusions page.
- Sections are numbered hierarchically (1.1, 1.2, 2.1, etc.).
- For detailed structure rules, see `references/full-mode.md`.

### SIMPLE Mode Structure

```
Cover
Content page 1 (Section title + tasks)
Content page 2
...
Content page N
Reflection page
Final page
```

- **No block title pages.** No introduction page. No block conclusions pages.
- Sections are flat-numbered (1, 2, 3...) — no hierarchical numbering.
- **No student data fields** (name, date, city, experience) — these are not included in the workbook.
- Content pages go straight into tasks after the cover.
- Reflection page is simplified: 2–3 prompts instead of 4–5.
- **Minimum 3 content pages, maximum 8** (excluding cover, reflection, final).
- Each content page must have at least 2 different task types.
- For detailed structure rules, see `references/simple-mode.md`.

## 3. Content Structure (Both Modes)

Each section of the workbook should follow this sequence:

1. **Key Idea**: A 1–2 sentence summary. Styled as a callout with a left border.
2. **Structuring Task**: A table, checklist, or flow chart for organizing information.
3. **Reflection Question**: An open-ended question requiring analysis, not "yes/no."
4. **Practical Task**: Application to a concrete situation (case study, algorithm).
5. **Notes Block**: Free-form space for the student's own notes.

In SIMPLE mode, not every section needs all 5 elements — use 3–4 per section to keep it compact. Prioritize: Key Idea → one structuring task → one question → notes.

### Task-Type Variety

Use at least 5 different task types across the workbook. **Do not use the same task type more than twice in a row on the same page.**

| Task Type | Purpose | Visual Style |
|:----------|:--------|:-------------|
| Table | Systematize, compare | Dark header, alternating row colors |
| Checklist | Enumerate, control | Square boxes with lines for text |
| Reasoning Chain | Cause-and-effect | Blocks connected by arrows |
| Reflection Question | Analyze, synthesize, evaluate | Question icon, designated answer space |
| Sketch/Diagram | Visualize concepts | Dotted-line box for drawing |
| Observation Block | Connect theory to practice | Lined space with a prompt |

## 4. UX Standards for Answer Fields

All answer fields fall into four types. Choose based on question character, not available space.

- **SHORT** (1 line, 12mm): word, number, term, date
- **MEDIUM** (3 lines, 36mm): one sentence, short explanation
- **LONG** (5–6 lines, 60–72mm): detailed reasoning, analysis, algorithm
- **SKETCH** (dashed box, min 90mm): drawing, diagram, schema

See `templates/sample-pages.html` for HTML examples of each field type.

### Generous Sizing Defaults

The workbook is a tool for the reader to WRITE in, not just read. Default element sizes must be generous enough for handwriting / pen input:

**Table cells:** Default `td` padding is **4× the CSS base** (i.e., if base CSS sets `5px`, use `20px` top and bottom padding). This creates tall rows that are comfortable to write in. Apply via inline `style="padding: 20px 8px;"` on `<td>` elements, or set a class override. Tables with pre-filled content (not fill-in) can use 2× padding instead.

**Answer lines / write-in areas:** Extend all answer-line blocks to **1.5–2× the baseline count** if total page height allows it. For example:
- A MEDIUM field (baseline 3 lines) → generate **5 lines** if the page has room.
- A LONG field (baseline 5 lines) → generate **8 lines** if the page has room.
- Notes blocks at the end of a page → fill all remaining vertical space with answer lines.

**Decision rule:** After laying out all content blocks on a page, calculate remaining vertical space. If ≥ 40px remains, distribute it by adding lines to the last write-in area on the page. If multiple write-in areas exist, extend the one closest to the bottom.

**Checklists:** When items have a fill-in line (for the student to write next to the checkbox), make the line generous — at least `120px` wide.

**Chain empty blocks:** Default `min-height: 28px` is too small for handwriting. Use `min-height: 44px` for empty chain blocks.

## 5. Cover Creative — AI-Generated Illustrations

The standard cover is pure CSS/HTML (gradient + typography + optional TOC cards). When the user wants a richer visual — a conceptual illustration, abstract shape, or visual metaphor — generate an image.

**Decision flow:**
1. Does the user want a generated image? → If not explicitly requested, use CSS-only cover.
2. If yes → collect ALL inputs (brand colors, light/dark, subject, reference, placement, style).
3. Compose the prompt using the 6-layer framework.
4. **Path A** — `nano-banana` available → auto-generate → embed in HTML.
5. **Path B** — `nano-banana` NOT available → present the prompt to the user → ask them to generate manually and send the image → embed in HTML with text overlay on top.

**Critical rules:**
- NEVER generate without confirming brand colors and light/dark preference first.
- The workbook is NOT locked to Ortobor colors. Ask the user for primary + accent hex values, or read from a design system skill if one exists.
- All text on the cover is added via HTML overlay, never baked into the generated image.
- **Do NOT regenerate the cover image on subsequent workbook iterations** unless the user explicitly asks. Once approved, the image is locked.
- Always **show the image prompt to the user before generating** (for visibility, not for confirmation — do not block on approval).

**Cover image aesthetic (proven style):**
- Background: solid brand color, filled edge-to-edge, zero margins or white borders.
- Object: one large abstract schematic shape (flat vector outline strokes, no 3D rendering, no photorealism, no pencil/hand-drawn feel). Think technical diagram or design system icon.
- The object should be **large** — 60–75% visible, with the remaining portion cleanly cropped off one or two edges as if drifting out of frame.
- A subtle soft radial glow behind the object (same hue family, low opacity) adds depth without breaking the flat aesthetic.
- The upper or lower area (whichever holds the title block) must be **completely empty** — reserved for text overlay.
- No fills, no gradients on the object itself, no text, no labels, no patterns, no grids.
- Do not limit the model's imagination on the shape — it can be a torus, sphere, arc, geodesic, lens, cylinder, or any clean geometric form.

For the complete prompt framework, fallback workflow, color customization, and pitfall table, see `references/cover-creative.md`.

## 6. Print Layout & Branding

### Page Structure

Every A4 page is a separate `<div class="page">`. Plan content for each page manually — do not rely on automatic browser wrapping.

- **Page dimensions**: `width: 794px; height: 1123px` — **FIXED, never use `min-height`**.
- **Content Area**: ~256mm usable height (after headers, footers, padding).
- **Overflow**: Run `audit_overflow.js` before PDF export. Fix any overflow > 5px.
- **Page Breaks**: Use `page-break-inside: avoid` on all content blocks. Never separate a question from its answer field across pages.

### Immutable Page Chrome (SET IN STONE)

The following sizes are **fixed and must never change** to fit content. If content doesn't fit, shrink content element spacing — never the chrome.

| Element | Property | Value | Notes |
|---------|----------|-------|-------|
| `.page` | `height` | `1123px` | Fixed A4. Never `min-height`. |
| `.page` | `width` | `794px` | Fixed A4 at 96 DPI. |
| `.page-header` | `padding` | `10px 38px 8px` | Immutable. `flex-shrink: 0`. |
| `.page-footer` | `padding` | `6px 38px 8px` | Immutable. `flex-shrink: 0`. |
| `.section-title` | `font-size` | `20px` | Fixed. Never scale down. |
| `.section-title` | `font-weight` | `800` | Fixed. |

**Compression rule:** When content overflows a page, reduce spacing on these **content** properties (in this order of priority):

1. `margin-bottom` on task blocks, tables, question blocks (8→6→4px)
2. `padding` on key-idea, question-block, table cells (reduce by 2px increments)
3. `gap` on chains, checklists (reduce by 1-2px)
4. `height` on answer lines (22→20→18px)
5. `min-height` on sketch boxes, chain-empty blocks (reduce proportionally)
6. `font-size` on body content (12→11→10px) — **last resort**

**Never compress:** page dimensions, header/footer, section title size.

### Branding & Custom Colors

The workbook supports any brand palette. Ask the user for **primary** and **accent** colors (hex), then override CSS variables:

```html
<style>
  :root {
    --primary:       #USER_PRIMARY;
    --primary-mid:   #USER_PRIMARY_MID;   /* lighter shade */
    --primary-light: #USER_PRIMARY_LIGHT; /* very light tint */
    --accent:        #USER_ACCENT;
  }
</style>
```

If a design system skill exists for the brand (e.g., `ortobor-design-system`), read tokens from there instead of asking. Default palette is blue (`#0d1b5e` / `#2563eb`).

**Ortobor / Ukrainian workbooks:** Always use the Ortobor green theme from `references/ortobor-design-system/workbook-theme.md`. This overrides the default blue palette with the Ortobor teal/lime color system (ink `#014948`, teal `#008C89`, lime accent `#C6EE68`). Do NOT ask the user for colors — read the theme file automatically when `WORKBOOK_CONFIG.lang === 'uk'` or the content is Ortobor-branded.

**Ortobor / Ukrainian podology content — MANDATORY STYLE GUIDE:** Read `references/ukrainian-medical-style.md` BEFORE writing any content. It codifies recurring expert edits on terminology, risk language, anatomical precision, podologist scope, and the closing-quote template. Skipping this step has historically caused ~30+ avoidable rework edits per workbook.

See `templates/base.css` for the full variable list and default styles.

### Font Scaling

When scaling text sizes across exercise pages, **never use `font-size: inherit` cascade** on `.page *` — it breaks elements with explicit sizes (buttons, badges, popovers). Instead:

1. Append a scoped override block before `</style>`.
2. Override each content class individually under `.page .classname { font-size: Xpx; }`.
3. For inline `style="font-size:Xpx"` attributes, use attribute selectors: `.page [style*="font-size:9px"] { font-size: 11.7px !important; }`.
4. Explicitly exclude headings, pills/badges, page header/footer, and cover from the scaling block.

## 7. Resources

### `scripts/`

- `audit_overflow.js`: Puppeteer script to check page overflows.
  Usage: `node audit_overflow.js /path/to/workbook.html`

- `export_pdf.js`: Puppeteer script to convert HTML → A4 PDF.
  Usage: `node export_pdf.js /path/to/workbook.html /path/to/output.pdf`

### `templates/`

- `base.css`: Complete CSS template with CSS variables for customization.
- `editor.css`: **Codified editor styles.** Inline verbatim into every workbook. Uses `wb-` prefix to avoid conflicts with content styles.
- `editor.js`: **Codified editor logic.** Inline verbatim into every workbook. Self-initializing IIFE — requires `WORKBOOK_CONFIG` set before load. Handles toolbar, block controls, comments (two types), undo, drag-drop, scaling, PDF export, inline editing.
- `sample-pages.html`: Reference HTML showing all content block types.

### `references/`

- `full-mode.md`: Detailed rules for FULL mode workbooks. Read when creating a multi-block workbook.
- `simple-mode.md`: Detailed rules for SIMPLE mode workbooks. Read when creating a short-course workbook.
- `cover-creative.md`: Prompt composition framework for AI-generated cover/interior illustrations via nano-banana. Read when the user wants a generated image.
- `ukrainian-medical-style.md`: **Mandatory style guide for Ortobor / Ukrainian podology workbooks.** Codifies recurring expert edits — forbidden terms, risk-language patterns, podologist scope rules, anatomical precision, closing-quote template. Read BEFORE writing any UA-language podology content.
- `workbook-reference.html`: **Canonical reference implementation.** A complete, production-quality workbook HTML with the full interactive editor system (block handles, action bar, drag-and-drop, page breaks, extend area, remove), comment system (popover, auto-save, counter), copy-all-comments (Markdown output), PDF export button, and print-preview viewport scaling. **Read this file when implementing any of these features.**

## 8. AI Generation Algorithm

Two workflows depending on environment:

### Manus Workflow (default)

1. **Determine mode**: Ask user or infer FULL vs SIMPLE from source material.
2. **Collect cover preferences**: Ask light/dark theme, whether they want a generated illustration, and confirm all proper nouns/titles.
3. **Analyze source material**: Read and understand the provided content.
4. **Plan structure**: Propose sections and page count. Present to user for approval.
5. **Generate cover creative** (if requested): Follow `references/cover-creative.md` — collect inputs, compose prompt, run nano-banana, embed result.
6. **Generate page-by-page**: Calculate vertical space for each element (~256mm available). Follow content structure and task variety rules.
7. **Generate full HTML**: Assemble `workbook.html` with branding and the full interactive editor system (Section 9).
7a. **Language/domain lint** (Ortobor / Ukrainian only): Apply `references/ukrainian-medical-style.md` checklist. Specifically scan for: forbidden terms (Хірургія, плоскостопість, сезамо-, флексори, проліферація, …), absolute risk claims (рецидив неминуче/гарантовано), fixed counts ("Три причини"), Russian-calque adjective placement (великий екзостоз), podologist-orders-imaging phrasing, and gender agreement after noun swaps. Fix inline before delivery.
8. **Audit for overflow**: Run `audit_overflow.js`.
9. **Fix overflows**: If any page has overflow > 5px, edit and re-audit.
10. **Deliver HTML first**: Send the HTML to the user for review. **Do not generate PDF until the user explicitly says it is ready.**
11. **Export to PDF** (when user confirms): Run `export_pdf.js`.
12. **Deliver**: Provide the final PDF.

### Claude Workflow (see Section 10)

1–5. Same as Manus workflow.
6. **Generate JSX artifact** — interactive workbook as a React component rendered in Claude's artifact panel.
7. **Iterate on JSX** — user adds comments, requests edits; Claude updates the artifact.
8. **Export to static HTML** — once approved, convert JSX to a standalone HTML file.
9. **Export to PDF** — user prints or uses the PDF export button in the HTML.

## 9. Interactive Editor System (Codified Module)

The editor is a **codified, reusable module** shipped as two files: `templates/editor.css` and `templates/editor.js`. These are inlined verbatim into every generated workbook HTML. **Do not reimplement the editor from scratch** — always include the canonical module.

The only configuration per workbook is the `WORKBOOK_CONFIG` object and the CSS color variables. Everything else — toolbar, controls, comments, undo, scaling, PDF export — is handled by the module.

### 9.1 Integration

Every workbook HTML must include:

1. The workbook's own CSS (page layout, content styles, color variables).
2. The contents of `templates/editor.css` (inlined in `<head>`).
3. A `WORKBOOK_CONFIG` object before the editor script.
4. The contents of `templates/editor.js` (inlined before `</body>`).

```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- DO NOT add maximum-scale=1 or user-scalable=no -->
  <style>
    :root { --primary: #0d1b5e; --accent: #2563eb; /* ... */ }
    /* workbook content styles */
  </style>
  <style>/* contents of editor.css */</style>
</head>
<body>
  <!-- pages with data-block attributes on content blocks -->
  <script>
    window.WORKBOOK_CONFIG = {
      lang: 'ru',                    // 'ru' | 'uk' | 'en'
      title: 'Workbook Title',
      brand: 'Brand Name',
      handle: '@author_handle',
      blockNames: { 'key1': 'Ключевая идея: определение', /* ... */ }
    };
  </script>
  <script>/* contents of editor.js */</script>
</body>
```

Content blocks need only a `data-block="UNIQUE_ID"` attribute — the JS auto-wraps them with handles, action bars, and comment popovers on load.

### 9.2 Language

All UI strings (toolbar buttons, confirm dialogs, popover labels, cut-line text, export headings) are defined in the `LANG` object inside `editor.js` with keys for `ru`, `uk`, and `en`. The active language is set by `WORKBOOK_CONFIG.lang`.

**All UI text must be in the same language as the workbook content.** No mixing languages.

### 9.3 Mobile & Touch Support

The editor's primary users are on **mobile devices**.

- **Viewport scaling:** Pages (794 × 1123px) scale to fit any screen width (320px+). Listens to `resize` and `orientationchange`. Viewport meta must NOT restrict zoom.
- **Touch controls (Notion-style):** On touch devices (`@media (hover: none), (pointer: coarse)`):
  - Drag handles are **always visible** (reduced opacity).
  - Tapping the handle **toggles** the action bar (no hover).
  - Action bar buttons have **min 36px tap targets**.
  - Comment buttons are **always visible**.
  - Tapping outside closes open action bars.

### 9.4 Widget Types & Standardized Controls

The JS detects what each `[data-block]` element contains and builds the appropriate control set.

**BASE controls (every block):**

| Button | Action |
|--------|--------|
| ↑ / ↓ | Move block up / down |
| ⬆✂ / ⬇✂ | Insert page break above / below |
| 💬 | Open comment popover |
| 🗑 | Remove block (with confirm) |

**ADDITIONAL controls by detected content:**

| Detected inside block | Extra controls |
|-----------------------|----------------|
| `.answer-lines` or `.notes-lines` | ⤢ extend (+3 lines), ⤡ shrink (−3, min 1) |
| `.sketch-box` | ⤢ extend (+40px), ⤡ shrink (−40px, min 50px) |
| `.chain-item-empty` | ⤢ extend (+20px per block), ⤡ shrink (−20px, min 28px) |
| `table tbody` | ＋ add row, － remove row (min 1), ↧ increase row height (+4px padding), ↥ decrease row height (−4px, min 2px) |
| `.checklist` | ＋ add item, － remove item (min 1) |
| Parent is `.two-col` | ← move left, → move right |

**Extend/shrink apply to ALL matching elements inside the block** (not just the first). Chain blocks with 3 empty items → all 3 resize.

**CRITICAL:** Extend/shrink buttons are **MANDATORY** on every block that contains user input. Omitting them makes the workbook non-functional.

### 9.5 Inline Text Editing

All text elements inside blocks get `contenteditable="true"`:
- Section headers, key ideas, question prompts
- Table cells (`th`, `td`), chain labels, checklist text
- Pill labels, highlight boxes, sketch labels, note headings

Edited elements show a subtle indicator (pencil dot) so the reviewer can track manual changes.

### 9.6 Comment System (Two Types)

Every block has a 💬 comment button and a popover with **two modes**:

| Type | Icon | Purpose | Visual indicator on block |
|------|------|---------|--------------------------|
| **Edit** | ✏️ | Concrete change request — apply literally | Accent-color left border + visible badge |
| **Instruction** | 💡 | Explanatory note for AI context | Muted gray left border + visible badge |

**UX rules:**
- Popover has tab buttons to select type before writing.
- Click outside → auto-saves and closes.
- **Ctrl+Enter** → saves. **Esc** → closes without saving.
- Blocks with saved comments get class `.has-comment` → persistent visual indicator (tinted background + colored left border).
- Counter badge in toolbar shows total comment count (both types), animates on new comment.

**Copy-all-comments** exports grouped Markdown:

```markdown
# Comments — Workbook Title
Date: YYYY-MM-DD

## Edits
### [1] Block Name
`block-id`
Comment text...

## Instructions
### [1] Block Name
`block-id`
Comment text...
```

### 9.7 Undo System

Toolbar undo button + **Ctrl+Z / Cmd+Z**. Stack of max 50 entries.

| Tracked action | Undo behavior |
|----------------|---------------|
| Move (up/down/left/right/drag) | Restores original position |
| Insert page break | Removes the marker |
| Extend/shrink (lines, sketch, chain, row, item) | Reverses the change |
| Remove block | Re-inserts at original position |

Button disabled when stack is empty.

### 9.8 PDF Export

Toolbar button injects print CSS → calls `window.print()` → removes CSS after 2s. Print CSS hides all editor chrome, forces A4, forces background colors, adds page breaks.

### 9.9 Page Cut Lines

Red dashed lines between pages with `✂ Page break — p. N / N+1` labels. Hidden in print. Language from `WORKBOOK_CONFIG.lang`.

### 9.10 Replace Cover Image

Toolbar button (🖼 `toolbar_replace_cover` — "Обкладинка" / "Обложка" / "Cover") opens a file picker, reads the chosen image as a data URL, and replaces the first `.page.page-cover` (or `.cover`) with a full-bleed `<img>`. The original cover content (CSS pill, gradient, title overlay) is overwritten.

The replacement is persisted in `localStorage` under `wb-cover:<title>` and restored on every load — so the cover stays swapped across browser sessions on the same device. If the image is too large for the browser's localStorage quota, the warning is logged and the replacement remains in-memory for the session.

The exported PDF picks up whatever cover is currently rendered (data URL or original), so swapping a cover, then clicking "Експорт PDF" produces a PDF with the new cover.

The final/closing-quote page is NOT replaced — only the first cover element. To revert: clear `localStorage` for the key, or reload after deleting the entry in DevTools.

## 10. Claude Artifact Workflow

When running in **Claude** (claude.ai), the workbook is built in three stages:

```
Stage 1: JSX Artifact  →  Stage 2: Static HTML  →  Stage 3: PDF
         (edit here)              (preview)           (final)
```

### Stage 1 — JSX React Artifact (Interactive Editing)

Generate the workbook as a **React component** rendered in Claude's artifact panel. This gives the user a live, interactive preview they can scroll through and comment on without leaving Claude.

**JSX artifact rules:**
- Use a single default-exported React component: `export default function Workbook() { ... }`
- Inline all styles using a `<style>` tag injected via `useEffect` or a `<style dangerouslySetInnerHTML>` block — do not use CSS modules or external stylesheets.
- Use the full Ortobor (or brand) design tokens as CSS variables in a `:root` block inside the injected style.
- Include the **comment system** (Section 9.3) using React `useState` — one state object keyed by block ID.
- Include the **copy-all-comments** button (Section 9.4) using `navigator.clipboard.writeText()`.
- Include **page cut lines** (Section 9.6) between pages.
- Include the **block editor** (Section 9.2) using React state for drag-and-drop and block reordering.
- Do **not** include the PDF export button in the JSX stage — that belongs in Stage 2.
- Pages are fixed `794 × 1123px` with `transform: scale()` viewport scaling (Section 9.1), implemented via `useEffect` + `window.addEventListener('resize', ...)`.
- Cover image: embed as a `<img src="data:image/...;base64,..." />` if the image is available, or as a CSS background color placeholder if not.

**Iteration:** User reviews the artifact, adds comments via the comment system, and requests edits. Claude updates the JSX artifact in place. Repeat until the user approves.

### Stage 2 — Static HTML Export

Once the user says the workbook is ready, convert the JSX to a **standalone HTML file**:

1. Render the React component to a static HTML string (conceptually — in practice, manually translate JSX to equivalent HTML + vanilla JS).
2. Inline all CSS into a `<style>` block in `<head>`.
3. Replace React `useState` comment system with the vanilla JS implementation from `references/workbook-reference.html`.
4. Add the **PDF export button** (Section 9.5) to the toolbar.
5. Deliver the `.html` file as an attachment.

### Stage 3 — PDF Export

The user clicks the PDF export button in the HTML file (or uses browser Print → Save as PDF). The injected `@media print` CSS handles all formatting. No server-side rendering needed.

### Key Differences: JSX vs HTML

| Feature | JSX Artifact | Static HTML |
|---------|-------------|-------------|
| Comment system | React `useState` | Vanilla JS (see reference) |
| Block editor | React state + event handlers | Vanilla JS drag-and-drop |
| PDF export | Not included | ✅ Toolbar button |
| Cover image | Base64 inline or placeholder | File path or base64 |
| Viewport scaling | `useEffect` + resize listener | Vanilla JS (see reference) |
| Deliverable | Claude artifact (live) | `.html` file attachment |
