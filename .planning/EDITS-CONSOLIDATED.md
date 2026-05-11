# Consolidated Doctor Edits — Ortobor Workbooks

**Scope:** Edits requested by domain expert (podologist/orthopedist) across 4 review sessions covering 8 workbooks: hyperkeratosis-fissures, ingrown-nail, taylor-deformity, haglund, hallux-rigidus, subungual-exostosis, morton-neuroma, metatarsalgia.

**Sessions:** `b8ea6e90` (2026-04-21), `7618b185` (2026-04-24), `f55acade` (2026-04-28 → 2026-05-11).

The patterns below are recurring — each rule was triggered by ≥2 separate edit requests across different topics. They define a Ukrainian medical-content style guide for podology workbooks.

---

## 1. Terminology — Direct Replacements

These are non-negotiable lexical swaps. AI must use the right column on first generation.

| ❌ Wrong / colloquial | ✅ Correct medical Ukrainian | Notes |
|---|---|---|
| Хірургія | Хірургічне лікування | Seen 4× across ingrown-nail, haglund, subungual, morton |
| Операція (as noun for treatment) | Хірургічне лікування | Subungual exostosis section 5 |
| Поперечне плоскостопість | Поперечна розпластаність (стоп) | 3× — morton, metatarsalgia, subungual |
| Флексори | Згиначі | Hallux rigidus |
| Сезамоїдні / сезамоподібні | **Сесамоподібні кістки** | Hallux rigidus, metatarsalgia |
| Артроз хряща | Деформація суглобу | Hallux rigidus |
| Проліферація | Розростання | Subungual (note: agreement: "кістково-хрящове розростання", not "хрящова") |
| Самолікування | Лікування | Taylor — never promote self-treatment |
| В'їдається | Врізається | Ingrown nail |
| Йде (про вісь) | Відхиляється | Ingrown nail |
| Зазор | Проміжок | Taylor |
| Клік (Mulder's test) | Біль при стисканні | Morton |
| Чисте (УЗД "чисте") | Без змін | Morton |
| Біль пройшов | Регрес болю | Metatarsalgia |
| Точковий біль при пальпації стовбура | Локальний біль в ділянці пошкодження плеснової кістки | Metatarsalgia |
| Устілки з пелотом / метатарзальним пелотом | Індивідуальні ортопедичні устілки | Morton — do not prescribe design |
| Підногтьовий | **Піднігтьовий** | Spelling — was wrong everywhere in subungual workbook |

---

## 2. Risk Language — Never Say "Certain", Always Say "High Risk"

The doctor consistently softens absolute claims. **AI default tone for adverse outcomes must be probabilistic.**

| ❌ Absolute | ✅ Probabilistic |
|---|---|
| Рецидив неминуче | Високий ризик рецидиву |
| Рецидив гарантовано | Високий ризик рецидиву |
| Біль = X (causal equals) | Біль → ризик X |

**Rule:** When describing complications, outcomes, or progression — use "ризик / може / часто" rather than "= / завжди / гарантовано / неминуче".

---

## 3. Don't Lock to Specific Numbers / Degrees

| ❌ | ✅ |
|---|---|
| "Три ключові причини…" | "Одні з ключових (ортопедичних) причин…" |
| "Три основні біомеханічні причини…" | "Одні з основних біомеханічних причин…" |
| "Кількість груп: 4" | "Поділяються на:" (no count) |
| "Вальгусне відхилення 8°" | "Вальгусна деформація стоп" (no precise degree) |
| "1-й промінь втрачає 35–40% навантаження" | "Перша плеснова кістка втрачає стабільність" |

**Rule:** Don't fix a count when the underlying reality is "more, but we highlight these". Don't invent precise measurements when the source didn't give them.

---

## 4. Anatomical Precision — Full Names

| ❌ Short | ✅ Full anatomical phrasing |
|---|---|
| Голівка (generic) | Голівка 5-ї плеснової кістки (specify which) |
| Запалення під 1-ю головкою | Запалення сесамоподібних кісток |
| Перший промінь | Перша плеснова кістка |
| 2–4 плеснові | 2–4 плеснові кістки |
| Жир (тканина) | Підшкірна жирова клітковина |

**Rule:** When the source says "head" → ask "of what?" and write the full name. Generic shortcuts are wrong in medical text.

---

## 5. Adjective Placement — Ukrainian Medical Idiom

Russian-style "great exostosis / small exostosis" reads wrong. Ukrainian medical text places the size qualifier after the noun.

| ❌ Russian-calque | ✅ Ukrainian medical |
|---|---|
| Великий екзостоз | Екзостоз великого розміру |
| Малий екзостоз | Екзостоз малого розміру |

Applies to size qualifiers in general (великий / малий / середній + medical noun).

---

## 6. Scope of Podology — Refer, Don't Order

Podologists in Ukraine **do not order imaging directly**. They refer to a specialist who decides on imaging.

| ❌ "Podologist orders" | ✅ "Podologist refers" |
|---|---|
| Направити на рентген / УЗД / МРТ | Направити на консультацію до ортопеда або невролога |
| Призначити рентген для виключення… | (омит — це не до подолога) |
| Прописати ортопедичні устілки з пелотом | Скерувати на виготовлення індивідуальних устілок до ортопеда / спеціаліста |

**Rule:** AI must NOT generate algorithms that put podologist in the "orders imaging / prescribes orthotics" role. Always frame as referral to ortho/neuro/dermo specialist.

---

## 7. Don't Promote Risky Self-Care or Single Causes

| ❌ Remove or rephrase | Why |
|---|---|
| Самолікування | Promotes self-treatment |
| "В домашніх умовах" | Implies medical procedure at home |
| "Опік" (as casual side effect) | Exaggerated, removed by doctor in Taylor |
| "Операція прибирає причину" | Surgery doesn't remove the cause — false framing |

---

## 8. Anatomy of Pain Generation — "Any Layer Can Be the Source"

For metatarsalgia (and likely other multi-cause syndromes), use **inclusive layered phrasing**:

> "Причиною болю може бути пошкодження та запалення в будь-якому із шарів тканини: шкіра → підшкірна жирова клітковина → фасція → капсула суглоба → плеснові кістки."

**Not:** "Біль генерує …" (one-shot causal claim). The workbook should frame pain syndromes as multi-source.

---

## 9. Cause Lists — Inclusive, Not Exclusive

For any "causes of X" list:
- Lead with **"Одні з основних…"** not **"Три / Чотири…"**
- Don't include rare/unverified causes (e.g. "оніміння 1-го пальця 10 років → radiculopathy L5/S1" was removed)
- Don't invent clinical examples — keep only those drawn from the source transcript
- For gender/age prevalence: hedge ("частіше у дівчат 12–15 років, у хлопців теж може бути")

---

## 10. Section Title Hygiene

Some titles were too narrow or implied wrong scope:

| ❌ Original | ✅ Doctor-corrected |
|---|---|
| СИСТЕМНІ ТА РЕФЕРОВАНІ ПРИЧИНИ | ІНШІ ПРИЧИНИ МЕТАТАРЗАЛГІЇ |
| (метатарзалгія "не з стопи") | (просто: "Метатарзалгія може бути: вертеброгенна…") |

**Rule:** Avoid clinical jargon ("рефероване") in section titles when a simple Ukrainian word ("інші") works. Don't pre-claim "not from foot" when the section discusses non-orthopedic foot causes too.

---

## 11. Clinical Cases — Doctor Must Provide

Several clinical-case "Ситуації" had to be rewritten because they were fabricated. **Rule for AI:** Only invent clinical cases if explicitly authorized. Otherwise, mark case sections as `[REQUIRES CLINICAL CASE FROM EXPERT]` and leave space.

Example rewrite for morton-neuroma: original case had "ознаки фіброзу підошовного нерва на УЗД" — doctor changed to "**відсутні зміни** підошовного нерва" (key teaching point: imaging-negative + wart found on inspection = remove wart, symptoms regress).

---

## 12. Closing Quotes — Specific Phrasing

Each workbook ends with a quote (attributed to Євгеній Боровський). Doctor rewrote these to focus on **mechanism + actionable insight**, not metaphor:

| ❌ Generic / metaphor-heavy | ✅ Mechanism-oriented |
|---|---|
| "Екзостоз — це не хвороба кістки. Це відповідь кістки на втрату захисту. Поверніть захист — і кістка заспокоїться." | "Піднігтьовий екзостоз — це сигнал організму про травматизацію пальця. Прибрати травматизацію — це перший крок до вирішення проблеми." |

**Rule:** Final quote should name the condition, identify the trigger, and point to the first treatment step. Avoid poetic abstractions.

---

## 13. Misc. Patterns

- Remove "по стовбуру" when listing locations of metatarsal pain (doctor said this is anatomically imprecise).
- Hyperkeratosis: causes are not strictly grouped — drop count, use "поділяються на".
- Hallux rigidus: list of biomechanical causes simplified to just **"гіперпронація"** rather than enumerating multiple.

---

## Appendix A — Frequency Heatmap

Rules sorted by how often they were triggered in review:

| Rule | Hits | Topics |
|---|---|---|
| Хірургія → Хірургічне лікування | 4 | ingrown, haglund, subungual, morton |
| Рецидив неминуче → високий ризик | 3 | ingrown, haglund, subungual |
| Поперечна розпластаність (not плоскостопість) | 3 | morton, metatarsalgia, subungual |
| Don't lock to count ("Три → одні з") | 3 | hyperkeratosis, ingrown, metatarsalgia |
| Refer to ortho/neuro instead of order imaging | 2 | morton, subungual |
| Сесамоподібні (not сезамоподібні) | 2 | hallux-rigidus, metatarsalgia |
| Individual orthotics, not "pelot" prescription | 2 | morton, hallux-rigidus |
| Adjective-after for size | 2 | subungual (used 2×) |

The top 3 rules account for ~50% of all edits — they are the highest-value fixes for a pre-generation lint.
