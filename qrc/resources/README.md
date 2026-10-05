# QRC Resource Directory

An annotated directory of free, vetted quantitative resources for Lawrence students, tutors, faculty, and staff. Version 0.1, October 2026.

Live (once pushed): `https://wkusner.github.io/qrc/resources/`

## Files

| File | What it is |
|---|---|
| `resources.js` | **The data.** Every section and entry. This is the only file you edit to add or change resources. |
| `index.html` | The page: header, search, filters, footer text. |
| `directory.css` | Styles. Colors and fonts are tokens at the top. |
| `directory.js` | Renders the data. No libraries. |
| `static.html`, `resources.csv` | Generated plain versions (no JavaScript). Rebuild with the export command below. |
| `tools/qrc_directory.py` | `export` (rebuild static.html and the CSV) and `check` (test every link). Python 3, standard library only. |

## Add or edit an entry

Copy an existing entry in `resources.js` and change its fields. Keep it valid JSON: double quotes, a comma between entries, none after the last.

- `section`: one of the section ids listed at the top of the file.
- `audience`: any of `student`, `tutor`, `faculty`, `staff`.
- `pick`: `true` for the one or two you'd try first in its section. It can also be a list of section ids, like `["precalc"]`, to make it a pick only there.
- `also`: optional list of other section ids where the entry should also appear (Paul's cheat sheets and Professor Leonard use this).
- `lu`: `true` if a Lawrence course uses it. This adds the "Used at Lawrence" badge and puts it first among picks.
- `checked`: the date you last confirmed the link works, or `null`.
- `note`: what it is and who it helps, 1–3 sentences. `start`: where to begin (optional).

Then run `python3 tools/qrc_directory.py export` so the plain version matches.

## How visitors move through it (v0.2)

- **Home** shows the "talk to a person" line, a search box, and one button per topic in plain student language. The `home` list in `resources.js` sets which topics appear and in what order. `meta.person` sets the drop-in line.
- **A topic page** (`#calculus`, `#stats`, …) shows at most three entries marked `pick` under "Try these first". Picks that are also `lu` (used at Lawrence) come first. Everything else in the topic is folded under "More options".
- **Browse views** (`#all`, `#tutor`, `#faculty`, `#staff`) list whole sections for people who want everything. Each view's sections and their order come from the `views` list. Faculty sees teaching resources first; Staff hides course help.
- **Search** looks across everything from any screen.

To change what a student sees first in a topic, change which entries have `"pick": true`. Keep it to two or three per topic.

## Each term

Run `python3 tools/qrc_directory.py check` from this folder and fix anything flagged. Update `checked` dates and `meta.updated`.

## Moving it to a Lawrence-hosted site

The page has no build step and no dependencies on this site, so there are three ways to move it:

1. **Lawrence lets you upload files:** copy this whole folder. Delete the block marked `site-specific` in `index.html`. Swap the color tokens in `directory.css` for the Lawrence Communications palette.
2. **The CMS allows embedded HTML but not scripts:** run the export, then paste the contents of `<main>` from `static.html` into the page.
3. **The CMS wants structured content:** give Web Services `resources.csv`. Each row is one entry with all fields.

Official QRC pages should use Lawrence Communications marks, not the informal QRC arms.

## How the categories were chosen

Sections are organized by the need a visitor arrives with ("I'm rusty on algebra", "I need Excel for my thesis"), then grouped into four bands: At Lawrence, Course help, Study and communicate, and For tutors, faculty, and staff. The choice drew on:

- what peer quantitative centers list as their service areas (Carleton, Smith, Dickinson, Hamilton, Williams, Lake Forest): math, statistics, data analysis, Excel, R, coding, calculators, unit conversions, GRE prep, and graph clinics;
- *QMaSC: A Handbook for Directors of Quantitative and Mathematics Support Centers* (2016), ch. 12, which recommends external resources so a center is useful when no tutor is on duty, and warns that links must be re-checked regularly;
- Lawrence's own Q-designated courses, the ALEKS placement thresholds, and the 2025 QSRC proposal's audience (students, faculty, staff, administrators, and symbolic reasoning as well as math).

## Open items

- 33 of 72 entries have `checked: null`. They're standard, well-known URLs, but they couldn't be opened from the build environment. Run `check` once to confirm them.
- Lawrence course numbers are tagged only for MATH 102, 103, and 140 and PHYS 141. Other courses use the department code. Add specific numbers as faculty confirm.
- The Mudd Library entry should point to a data or research-help page once you pick one.
