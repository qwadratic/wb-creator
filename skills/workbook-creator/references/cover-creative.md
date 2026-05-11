# Cover Creative — AI-Generated Illustration Workflow

Use this reference when the workbook cover or interior pages need an AI-generated illustration.

## When to Use

- The user explicitly requests a generated image for the cover or an interior page.
- The content includes a concept that benefits from a visual metaphor (funnel, pyramid, cycle, abstract shape, etc.).
- A pure CSS/HTML illustration (SVG, CSS shapes) would look too simplistic for the concept.

**Do NOT generate images by default.** The standard cover is pure CSS/HTML (gradient + typography). Only use image generation when the user asks for it or when you propose it and the user agrees.

## Generation Path — nano-banana vs Manual Fallback

```
User wants a generated image
  │
  ├─ nano-banana CLI available? ──► YES ──► Path A: Auto-generate
  │
  └─ NO (tool not available) ──► Path B: Manual fallback
```

### Path A: Auto-Generate (nano-banana available)

1. Complete the Pre-Generation Checklist (below).
2. Compose the prompt using the 6-Layer Framework (below).
3. Run `nano-banana` CLI to generate the image.
4. Proceed to Post-Generation Integration.

### Path B: Manual Fallback (nano-banana NOT available)

When `nano-banana` is not available in the current environment:

1. Complete the Pre-Generation Checklist (below).
2. Compose the prompt using the 6-Layer Framework (below).
3. **Present the ready-made prompt to the user** with clear instructions:
   ```
   Я подготовил промпт для генерации обложки. Nano-banana сейчас недоступна,
   поэтому сгенерируй изображение вручную — в ChatGPT (DALL-E), Midjourney,
   или любом другом генераторе — и отправь мне результат.

   Промпт:
   [FULL PROMPT HERE]

   Требования к файлу:
   - Формат: PNG или JPG
   - Минимальное разрешение: 1200px по ширине
   - Без текста на изображении (текст добавлю поверх в HTML)
   ```
4. **Wait for the user to send the image.**
5. When the user sends the image, proceed to Post-Generation Integration.

**Important:** In Path B, the image will NOT contain any text — all text (title, subtitle, author, labels) is added as HTML overlay on top of the image. This avoids garbled AI-generated text and gives full control over typography.

## Custom Brand Colors

The workbook is not locked to Ortobor colors. Before generating, determine the brand palette:

1. **Check if a design system skill exists** for the brand (e.g., `ortobor-design-system`). If yes, read tokens from there.
2. **If no design system exists**, ask the user for:
   - **Primary color** (used for main structure, headings, dark backgrounds)
   - **Accent color** (used for highlights, buttons, decorative elements)
   - **Light variant** (used for light backgrounds, card fills — derive from primary if not provided)

Then set CSS variables in the workbook HTML:

```html
<style>
  :root {
    --primary:       #[USER_PRIMARY];
    --primary-mid:   #[USER_PRIMARY_MID];   /* lighter shade */
    --primary-light: #[USER_PRIMARY_LIGHT]; /* very light tint */
    --accent:        #[USER_ACCENT];
  }
</style>
```

When composing the image generation prompt, use the **same hex values** from the user's palette — not hardcoded Ortobor colors.

### Preset Palettes (quick reference)

| Brand | Primary | Accent | Light |
|:------|:--------|:-------|:------|
| Ortobor Academy | `#014948` | `#A8D44A` | `#D6EEE8` |
| Default (blue) | `#0d1b5e` | `#2563eb` | `#dbeafe` |

To add a new brand, the user just provides 2–3 hex values.

## Pre-Generation Checklist

Before writing any prompt, you MUST collect and confirm all of the following. Missing any of these was the #1 cause of wasted re-generations in past projects.

| # | Item | What to Confirm | Why |
|:--|:-----|:----------------|:----|
| 1 | **Brand colors** | Read design system tokens OR ask user for primary + accent hex values | Wrong colors = instant re-do |
| 2 | **Light or dark theme** | Ask: "Светлый или тёмный фон?" | User preference varies; don't assume |
| 3 | **Subject description** | What exactly should the image depict? Get a concrete noun + composition | "Something cool" → bad. "Abstract 3D geometric shape symbolizing transformation" → good |
| 4 | **Reference image** | Ask: "Есть ли референс или пример?" | A reference eliminates 80% of ambiguity |
| 5 | **Proper nouns & labels** | Confirm exact spelling of any text near the image | Spelling errors caused multiple re-generations in past projects |
| 6 | **Placement** | Cover background? Interior illustration? Full-width or inset? | Determines aspect ratio and composition |
| 7 | **Style preference** | Isometric 3D? Flat? Abstract? Minimalist? | If no preference, default to "clean abstract 3D" |

## Prompt Composition — 6-Layer Framework

Build the prompt using these 6 layers, in this order:

### Layer 1: Style & Medium
Start with the visual style. Be specific — "illustration" is too vague.

Good examples:
- `Clean abstract 3D render`
- `Flat vector infographic style`
- `Minimalist geometric composition`
- `Soft isometric 3D illustration`

### Layer 2: Subject & Composition
Describe what the image shows. Use concrete, spatial language.

Good: `An abstract geometric shape — a smooth, flowing ribbon that twists upward, symbolizing transformation and growth. The ribbon has faceted surfaces that catch light.`
Bad: `A concept about medical education and growth.`

**Key insight from past projects:** Abstract objects (geometric shapes, ribbons, crystals, flowing forms) work better for professional/medical workbook covers than literal depictions of the subject matter. They look premium and don't risk being inaccurate.

### Layer 3: Color Palette
Explicitly state the colors using the user's brand hex values.

```
Color palette: [PRIMARY HEX] for the main form,
[ACCENT HEX] for highlights and light reflections,
[LIGHT HEX] for subtle secondary elements
```

### Layer 4: Background
State the background explicitly. This prevents unwanted busy backgrounds.

- `Clean white background` (for light-theme workbooks)
- `Transparent background` (if compositing over a gradient)
- `Dark [PRIMARY HEX] background` (for dark-theme covers)

### Layer 5: Negative Constraints
State what should NOT appear:

```
No text, no letters, no watermarks, no photographic elements,
no busy patterns, no gradients in the background,
no people's faces, no medical instruments (unless specifically requested)
```

**Critical:** Always include `No text, no letters` — AI-generated text is always garbled. All text is added via HTML overlay.

### Layer 6: Technical Specs
End with output requirements:

```
High resolution, sharp edges, suitable for print at 300 DPI,
aspect ratio 16:9 (for full-width interior) / 1:1 (for inset) /
210:297 (for full-page cover background)
```

## Complete Prompt Template

```
[STYLE]: [Specific visual style, e.g., "Clean abstract 3D render"]
[SUBJECT]: [Concrete description with spatial layout and symbolism]
[COLORS]: Main form in [PRIMARY HEX], highlights in [ACCENT HEX], secondary in [LIGHT HEX]
[BACKGROUND]: [Specific background color or "transparent"]
[EXCLUDE]: No text, no letters, no watermarks, no photographic elements, no busy backgrounds
[SPECS]: High resolution, sharp clean edges, print-ready, aspect ratio [RATIO]
```

## Post-Generation Integration

After receiving the image (from nano-banana OR from the user):

1. **Save** the image to the workbook directory: `cover_image.png`
2. **Embed** in HTML using base64 to keep the workbook self-contained:
   ```bash
   base64 -w0 cover_image.png > cover_b64.txt
   ```
3. **Build the cover page** with the image as background and text as HTML overlay:
   ```html
   <div class="page cover" style="position: relative; overflow: hidden;">
     <!-- Background image -->
     <img src="data:image/png;base64,..."
          alt=""
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                 object-fit: cover; z-index: 0;">
     <!-- Dark overlay for text readability (adjust opacity as needed) -->
     <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                 background: rgba(0,0,0,0.35); z-index: 1;"></div>
     <!-- Text content on top -->
     <div style="position: relative; z-index: 2; color: #fff; padding: 40mm 20mm;">
       <div class="pill-label">ПРАКТИЧНИЙ ВОРКБУК</div>
       <h1>[WORKBOOK TITLE]</h1>
       <p class="subtitle">[Subtitle]</p>
       <p class="author">від [Author Name]</p>
     </div>
   </div>
   ```
   Alternatively, if the image is an interior illustration (not full-cover):
   ```html
   <img src="data:image/png;base64,..."
        alt="[Descriptive alt text]"
        style="width: 100%; max-width: 600px; height: auto;
               border-radius: 8px; margin-bottom: 10px;">
   ```
4. **Never use box-shadow** on `<img>` elements — it renders as a solid rectangle in Puppeteer PDF export. Use `border` instead.
5. **Audit** the page with the embedded image for overflow (`audit_overflow.js`).

## Common Pitfalls & Fixes

| Pitfall | What Happens | Fix |
|:--------|:-------------|:----|
| No brand colors in prompt | Image uses random colors, doesn't match workbook | Always include hex values from user's palette |
| Vague subject description | Generic stock-art result | Use concrete spatial language; prefer abstract geometric forms for professional covers |
| No background specified | Busy gradient or patterned background | Always state "clean white background" or "transparent" |
| Text in generated image | Garbled/misspelled text baked into image | Always add "no text, no letters" to prompt; add all text via HTML overlay |
| Wrong aspect ratio | Image gets cropped or distorted | Specify exact ratio for placement context |
| box-shadow on img | Solid colored rectangle behind image in PDF | Never use box-shadow on img; use border instead |
| Image too large for page | Page overflow | Set max-width and check with audit_overflow.js |
| Literal medical imagery | Looks unprofessional or inaccurate | Use abstract shapes/forms instead of literal depictions |
| Hardcoded Ortobor colors | Wrong brand for non-Ortobor workbooks | Always read colors from user input or design system, never hardcode |
