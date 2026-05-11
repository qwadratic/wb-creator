# Ortobor Workbook Theme — Ukrainian Workbooks

All Ukrainian-language workbooks for Ortobor Academy use this theme instead of the default blue palette.

## CSS Variables

```css
:root {
  /* Core palette */
  --primary:       #014948;   /* ink — headers, section titles, table headers */
  --primary-mid:   #328A8A;   /* teal — accents, header-right text */
  --primary-light: #E8F5F3;   /* very light tint — key-idea bg, section bg */
  --accent:        #008C89;   /* button teal — icons, links, active elements */
  --accent-bright: #C6EE68;   /* lime — toolbar badge, cover highlights */

  --text-primary:  #010E0E;   /* body text on light */
  --section-bg:    #E8F5F3;   /* light teal tint for section backgrounds */
  --key-idea-bg:   #E8F5F3;   /* key-idea block background */
  --table-header:  #014948;   /* dark ink for table headers */
  --table-row-alt: #F4FAF8;   /* alternating row */
  --border:        #D0E8E4;   /* borders, dividers */
  --page-bg:       #FFFFFF;   /* page background */

  /* Task pill overrides */
  --label-question-bg:   #E8F5F3;
  --label-question-text: #014948;
  --label-checklist-bg:  #E5F9E0;
  --label-checklist-text:#065F46;
  --label-chain-bg:      #FEF3C7;
  --label-chain-text:    #92400E;
  --label-sketch-bg:     #FCE7F3;
  --label-sketch-text:   #9D174D;
  --label-practice-bg:   #FFF7DB;
  --label-practice-text: #92400E;
}
```

## Cover Page

- Background: `linear-gradient(160deg, #011818 0%, #014948 30%, #013838 60%, #328A8A 100%)`
- Cover pill: `background: rgba(198,238,104,0.15); border: 1px solid rgba(198,238,104,0.3); color: #C6EE68;`
- "WORKBOOK" text: white, 900 weight
- Topic text: white, 600 weight, 0.9 opacity
- Author: white, 0.7 opacity
- Handle: white, 0.5 opacity, `#C6EE68` accent available for emphasis
- Decorative cross or shape: `rgba(255,255,255,0.25)` strokes

## Toolbar

- Background: `#014948` (ink)
- Brand text: white, 0.7 opacity
- Badge: `background: #C6EE68; color: #014948;` (lime on ink)
- Buttons: `background: rgba(255,255,255,0.15)` ghost style

## Page Header

- Left text: `#014948` ink, 700 weight
- Right text: `#008C89` teal accent
- Bottom border: `2px solid #014948`

## Content Elements

- Section title: `#014948`, 800 weight
- Key idea: `background: #E8F5F3; border-left: 4px solid #014948;`
- Key idea label: `color: #328A8A;`
- Question icon: `background: #014948; color: #fff;`
- Chain blocks (filled): `background: #014948; color: #fff;`
- Chain blocks (empty): `border: 2px dashed #008C89; color: #008C89;`
- Checkbox: `border: 2px solid #014948;`
- Answer lines: `border-bottom: 1px dashed #B8D4D0;`
- Sketch box: `border: 2px dashed #008C89; background: #F4FAF8;`
- Callout: `background: rgba(198,238,104,0.08); border-left: 4px solid #C6EE68;`

## Print Overrides

All print-specific color overrides must use the Ortobor palette hardcoded (same as above), not CSS variables, to ensure correct rendering in PDF export.

## Typography

- Font: System stack (-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif) — or Montserrat for consistency with existing workbooks.
- Weight hierarchy: 800 (titles), 700 (sub-headings, labels), 600 (emphasis), 400 (body)

## Brand

- Author: Євгеній Боровський
- Academy: Ортобор Академія
- Handle: @ortobor_academy
- Website: ortobor.com
