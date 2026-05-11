# workbooks/

One folder per workbook topic. Each topic is self-contained: source material on the way in, deliverables on the way out.

## Layout

```
workbooks/
├── README.md          ← you are here
├── _index.md          ← table of all topics + status
└── <topic-slug>/
    ├── in/            ← INPUTS — raw source material from the expert
    │   └── *.{txt,pdf,pptx,mp3}
    └── out/           ← OUTPUTS — generated deliverables
        ├── cover*.{jpeg,jpg}    ← cover image(s) for the workbook
        ├── workbook*.html       ← interactive HTML workbook
        └── workbook*.pdf        ← (optional) exported PDF
```

The HTML in `out/` references the cover image by its filename (no path), so cover and HTML must live in the same folder. The reorg preserved original filenames to keep these references intact.

## Inputs — `in/` contract

| Format | Used for | Typical size | Notes |
|---|---|---|---|
| `.txt` | Transcripts (lecture, mp3 transcription, manual notes) | 100–300 KB | UTF-8, Ukrainian or Russian |
| `.pdf` | Slide decks already converted, scanned documents | 0.5–50 MB | OCR'd or text-native |
| `.pptx` | Source slide decks before conversion | 5–25 MB | Convert to PDF or extract text first |
| `.mp3.txt` | Speech-to-text output | similar to .txt | Naming convention preserves origin |

The filename is intentionally left in its original Ukrainian/Russian form — it carries provenance (e.g. `ОНИХОЛИЗИС ДЕНЬ 1-2.pdf` makes it obvious this is the day-1–2 lecture from the Russian-language onycholysis course). If a topic has multiple sources, all of them go in `in/`.

## Outputs — `out/` contract

| File | Role | Required? |
|---|---|---|
| `cover-<slug>.jpeg` | Cover image. Embedded into the HTML's first page as `<img src="cover-<slug>.jpeg">`. | When the workbook has a designed cover |
| `cover-<slug>-new.jpeg`, `-1.jpg`, etc. | Alternate cover versions kept for comparison | No |
| `workbook-<slug>.html` | The interactive workbook. Self-contained — embedded CSS + JS, no external assets except the cover. Open in any browser. | Yes |
| `workbook-<slug>-v2.html`, `-uk.html`, `-13-causes.html` | Alternate variants (revision, language, content scope) | When applicable |
| `workbook-<slug>.pdf` | PDF export. Generated via the HTML's "Експорт PDF" button or `scripts/export_pdf.js` from the skill. | Only after final approval |

### Why HTML lives in `out/` even though it's "the source of truth"

The HTML is generated from `in/` material via the `workbook-creator` skill. From the project's perspective, the source of truth is **the source transcript in `in/`** — the HTML is the artifact. Re-running the skill on the same input should reproduce an equivalent HTML; the HTML in `out/` is just the latest checkpoint.

## How to add a new topic

1. Pick a slug — kebab-case, English, no punctuation (`morton-neuroma`, not `Morton's Neuroma`).
2. `mkdir -p workbooks/<slug>/{in,out}`
3. Drop the source material into `in/`.
4. Add a row to `_index.md` with status `source-only`.
5. Generate the workbook via the `workbook-creator` skill — output goes into `out/`.
6. Update `_index.md` to `draft` or `shipped`.

## Status vocabulary (used in `_index.md`)

- **`source-only`** — only the input exists, no workbook generated yet
- **`draft`** — workbook HTML generated, awaiting expert review
- **`review`** — expert is providing edits (session logs in `.sessions/` capture the feedback)
- **`shipped`** — expert has signed off, PDF exported, distributed
- **`needs-rework`** — expert flagged structural issues; re-generation needed

## Cross-references

- Source-material conventions for the `workbook-creator` skill: `skills/workbook-creator/SKILL.md`
- Expert-feedback patterns extracted from past reviews: `.planning/EDITS-CONSOLIDATED.md`
- Session log mirror for this project: `.sessions/` (auto-populated — see `scripts/README.md`)
