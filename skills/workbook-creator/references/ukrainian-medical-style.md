# Ukrainian Medical Workbook Style Guide (Ortobor / Podology)

This guide codifies recurring edits from domain experts (podologist + orthopedist) across 8 reviewed workbooks. Apply BEFORE first delivery for any Ortobor / Ukrainian-language podology workbook. If `WORKBOOK_CONFIG.lang === 'uk'` and the topic is foot pathology, this file is **mandatory reading**.

> Source: `/.planning/EDITS-CONSOLIDATED.md`

## A. Pre-Generation Lint Checklist (run mentally before writing each page)

- [ ] No occurrences of forbidden terms (Section B) — used the correct medical term
- [ ] No absolute claims about recurrence/outcomes — used "ризик" framing (Section C)
- [ ] No fixed counts ("Три причини"). Default to "Одні з основних" (Section D)
- [ ] Anatomy uses full names — "5-та плеснова кістка", not "5-та головка" (Section E)
- [ ] Size adjectives placed AFTER the noun for medical idioms (Section F)
- [ ] Podologist actions are referrals, not imaging orders or specific device prescriptions (Section G)
- [ ] No self-treatment or "вдома" framing; no exaggerated burn warnings (Section H)
- [ ] Pain-source phrasing inclusive of all tissue layers, not single-cause (Section I)
- [ ] No fabricated clinical cases — placeholder if no source case (Section J)
- [ ] Closing quote names condition + trigger + first treatment step (Section K)

## B. Forbidden / Replace Terms

| ❌ Never write | ✅ Always write | Notes |
|---|---|---|
| Хірургія | Хірургічне лікування | Both as noun and in titles |
| Операція (treatment noun) | Хірургічне лікування | "Показання до операції" → "Показання до хірургічного лікування" |
| Поперечне плоскостопість / поперечна плоскостопість | Поперечна розпластаність (стоп) | The condition name has changed in modern UA medical literature |
| Сезамоподібні / сезамоїдні | Сесамоподібні (кістки) | Spelling: "С**Е**САМО-" |
| Флексори | Згиначі | |
| Артроз хряща | Деформація суглобу | |
| Проліферація (general) | Розростання | And update adjective agreement: "кістково-хрящове розростання" (neuter), NOT "кістково-хрящова" (feminine) |
| Самолікування | Лікування | |
| В'їдається | Врізається | (about nail) |
| Йде (про вісь) | Відхиляється | (about anatomical axis) |
| Зазор | Проміжок | |
| Клік (Mulder's) | Біль при стисканні | |
| УЗД "чисте" | УЗД без змін | |
| Біль пройшов | Регрес болю | |
| Устілки з пелотом | Індивідуальні ортопедичні устілки | Don't prescribe specific device design |
| Підногтьовий | **Піднігтьовий** | Spelling — "піднігтьовий" is correct |

## C. Risk Language

Never use:
- `=` between intervention and certain outcome (e.g. "Видалення кератозу = біль пройшов")
- "Гарантовано", "неминуче", "обов'язково" (about clinical outcomes)
- "Завжди призводить до…"

Always use:
- "Високий ризик…"
- "Може спровокувати…"
- "Частіше виникає при…"
- "→ регрес симптомів" (event → outcome, not equality)

**Hard rule:** Recurrence statements use **"Високий ризик рецидиву"** — never "рецидив гарантовано" / "рецидив неминуче".

## D. Avoid Fixed Counts

Patterns to refuse on first generation:
- ❌ "Три ключові причини", "Чотири фактори ризику", "П'ять стадій"
- ❌ "Хвороба має 5 стадій" — unless the source explicitly states it
- ✅ "Одні з основних причин", "Ключові фактори ризику", "Стадії перебігу"
- ✅ "Поділяються на:" (list without count)

Also avoid invented precise numbers:
- ❌ "Вальгусне відхилення 8°" (unless source gives this exact number)
- ❌ "1-й промінь втрачає 35–40% навантаження" (likely fabricated)
- ✅ "Перша плеснова кістка втрачає стабільність → перевантаження 2–4 плеснових кісток"

## E. Anatomy — Full Names

When referencing bones, joints, soft tissue — always use the full anatomical name:

| Generic shorthand | Full name |
|---|---|
| Голівка (in lists) | Голівка N-ї плеснової кістки |
| Перший промінь | Перша плеснова кістка |
| 2–4 плеснові | 2–4 плеснові кістки |
| Жир (tissue layer) | Підшкірна жирова клітковина |
| Кістка (in tissue layer list) | Плеснові кістки |
| Запалення під 1-ю головкою | Запалення сесамоподібних кісток |

**Heuristic:** If the source transcript names a bone, write the full form; do not shorten to fit.

## F. Adjective-After for Size Qualifiers

Russian-calque syntax reads wrong in Ukrainian medical text. Apply size as a postpositive descriptor:

| ❌ | ✅ |
|---|---|
| Великий екзостоз | Екзостоз великого розміру |
| Малий екзостоз | Екзостоз малого розміру |
| Великий вогнище | Вогнище великого розміру |

Applies to: великий / малий / середній / значний + medical entity.

## G. Podologist Scope — Refer, Don't Order

Podologists in Ukraine refer to specialists; they don't directly order imaging or prescribe specific orthotic designs. Generated text must respect this scope.

**Forbidden in podologist algorithms:**
- "Направити на рентген / УЗД / МРТ"
- "Призначити рентгенографію для виключення кісткової патології"
- "Прописати устілки з метатарзальним пелотом, точне розташування критичне!"

**Required framing:**
- "Направити на консультацію до ортопеда (або невролога, дерматолога — залежно від підозри)"
- "Скерувати на виготовлення індивідуальних ортопедичних устілок до спеціаліста"
- "При підозрі на N — консультація профільного спеціаліста"

The specialist (orthopedist) is the one who decides on imaging and orthotic design.

## H. Self-Care & Risk Framing

Never include in workbook:
- "Самолікування…"
- "В домашніх умовах…"
- Exaggerated burn warnings ("Опік" як побочна дія простих процедур)
- "Операція прибирає причину" (surgery doesn't remove the cause — it removes the consequence)

If a section discusses home care or risks, frame it as **professional guidance**, never as instructions to the patient.

## I. Pain-Source Phrasing (Multi-Cause Syndromes)

For metatarsalgia, plantar fasciitis, and other multi-cause syndromes, default to layered framing:

> "Причиною болю може бути пошкодження та запалення в будь-якому із шарів тканини: шкіра → підшкірна жирова клітковина → фасція → капсула суглоба → плеснові кістки."

Don't write "Біль генерує X" — instead: "Біль може походити з …".

## J. Clinical Cases — Don't Fabricate

Workbooks include "Клінічний кейс" callouts. AI must NOT invent these.

**Default behavior:**
- If the source transcript contains a clinical case → use it verbatim or condensed
- If the source has no case → write the section header + placeholder text:
  > `[Простір для клінічного кейсу — потребує наповнення від експерта]`
- Never invent diagnoses, ages, lab values, imaging findings

## K. Closing Quote Pattern

Every workbook closes with a quote attributed to Євгеній Боровський. Template:

```
"<Condition> — це <mechanism/trigger>. <First treatment action> — це <step toward solution>."
```

Examples (doctor-approved):
- "Піднігтьовий екзостоз — це сигнал організму про травматизацію пальця. Прибрати травматизацію — це перший крок до вирішення проблеми."

Avoid: poetic metaphor without actionable content ("кістка заспокоїться", "стопа подає сигнали тиші").

## L. Section Title Hygiene

| ❌ Jargon-heavy | ✅ Plain Ukrainian |
|---|---|
| СИСТЕМНІ ТА РЕФЕРОВАНІ ПРИЧИНИ | ІНШІ ПРИЧИНИ N |
| ОРТОПЕДИЧНИЙ OVERLAY | ОРТОПЕДИЧНІ ОЗНАКИ |
| ПАТОМЕХАНІЗМ + АНГЛІЙСЬКІ ТЕРМІНИ | МЕХАНІЗМ ФОРМУВАННЯ N |

Section titles must be readable for a working podologist without a medical dictionary.

## M. Adjective Gender Agreement After Term Swap

When swapping a noun (e.g. "проліферація" → "розростання"), check adjective gender agreement:
- проліферація (feminine) — "кістково-хрящова проліферація"
- розростання (neuter) — "кістково-хрящов**е** розростання"

This is a common silent error. Always re-read the sentence after a term swap.

---

## Application Order

1. Draft the workbook normally.
2. Run mental lint pass (Section A checklist).
3. Specifically scan for forbidden terms (Section B) — global find/replace.
4. Scan for absolute claims (Section C) — replace with risk framing.
5. Scan for fixed counts (Section D) — replace with "Одні з основних".
6. Final read for adjective agreement (Section M) after any noun swap.
