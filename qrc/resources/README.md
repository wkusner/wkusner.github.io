# QRC Resource Directory

An annotated directory of free, vetted quantitative resources for Lawrence students, tutors, faculty, and staff. Version 0.7, October 2026.

Live: `https://wkusner.github.io/qrc/resources/` (self-check: `diagnostic.html`)

## Files

| File | What it is |
|---|---|
| `resources.js` | **The data.** Every section and entry. This is the only file you edit to add or change resources. |
| `index.html` | The page: header, search, filters, footer text. |
| `directory.css` | Styles. Colors and fonts are tokens at the top. |
| `directory.js` | Renders the data. No libraries. |
| `static.html`, `resources.csv` | Generated plain versions (no JavaScript). Rebuild with the export command below. |
| `diagnostic.html`, `diagnostic.js`, `diagnostic-data.js` | The course self-check for MATH 102, 103, 140, and 155. Questions and recommendations live in `diagnostic-data.js`. |
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

## Short guides (v0.4)

Guides are short pieces the QRC writes itself (one to four minutes of reading) that route people into the resources. They live in the `guides` list in `resources.js`.

- `kind: "topic"` guides sit at the top of a topic page, with `section` naming the topic. They use three time horizons: stuck right now (10 minutes), behind on a topic (an evening), and rebuilding a skill (a few weeks).
- `kind: "how"` guides are standalone: first visit, the 10-minute stuck routine, a 10-day exam plan, ALEKS prep, learning from a free textbook, using videos, emailing a professor, a tutor's first shift, and sending students to the QRC. `home` sets their order on the home page; the first four appear above the topic grid. Guides without `home` show up in the audience views that match their `audience`.
- Each guide has an address, `#guide-<id>`, that you can link to directly. The faculty guide is `#guide-faculty-refer`.
- Inside guide text, `[[entry-id]]` becomes a link to that resource, `[[guide:id]]` links another guide, and `[[#section]]` links a topic. Add `|label` to change the link text, like `[[guide:stuck|the 10-minute routine]]`.
- `box` holds text to copy, such as the email template or a syllabus blurb. It gets a Copy button.

To write a new guide, copy one of the same kind and keep it short. A guide should send people to a resource within its first few lines.

## Course self-check (v0.5)

`diagnostic.html` is a 16- to 18-question self-check for each of MATH 102, 103, 140, and 155: eight or nine skill areas with two questions each. It isn't a placement test, and nothing is saved or sent anywhere. Students get the areas to work on, in order, each with QRC worksheets and free resources, plus a review of every question and a summary they can copy for a tutor. `diagnostic.html#140` opens a course's check directly.

- Course names, prerequisites, and summaries come from the department's course descriptions (inside.lawrence.edu/academics/college/mathematics/course-descriptions). Skill areas and section numbers follow the syllabi: MATH 102 W26 (OpenStax *Intermediate Algebra 2e*), MATH 103 F26 (OpenStax *Precalculus 2e*), MATH 140 S27 (OpenStax *Calculus* Vol. 1, worksheets A0–E5), and MATH 155 W26 (Heaton; Lang's *Calculus of Several Variables*, with OpenStax Vol. 3 as the free stand-in). Update the `where` lines when a syllabus changes.
- Edit questions and recommendations in `diagnostic-data.js`. The first option is always the correct one; the page shuffles them. Write fractions as `{{numerator|denominator}}`.
- Areas marked `"ready": true` are prerequisites the course expects, listed as "Coming in". If one of those is a gap, the results point to the previous course's check.
- `worksheets` lists QRC's own worksheets (the MATH 102 guides and the MATH 103 problem sheets). With `"file": null` they show "ask for a printed copy at the QRC desk"; put a PDF path or URL in `file` once you post one.
- The directory home page links here, as does an entry under "Start here" and the ALEKS, basics, precalculus, and calculus guides.

## Going further (v0.6)

Some topics deliberately reach past Lawrence's syllabi: **Geometry and further trig** (MATH 103 rushes trig and skips most geometry), **Multivariable and vector calculus** (past MATH 155: path independence, Green's, Stokes', and the divergence theorem), and **Applied linear algebra** (matrix algebra isn't covered in 155). In the self-check, each course's `further` list adds a "Going further" box to the results.

## Course sequences (v0.7)

Three topics follow Lawrence's course sequences, from the 2026–27 catalog and the department course-description pages:

- **Statistics** (`stats`): STAT 107, STAT 255, MATH/STAT 340, and STAT 445, 450, and 455. Lawrence's own STAT 255 notes are the first pick.
- **Data science** (`datasci`): DASC 110, DASC 210, STAT/CMSC 208, DASC 420, and CMSC/STAT 205 and 405.
- **Computer science** (`cs`): CMSC 140 and 210 (Python), CMSC 150 and 250 (Java), CMSC 270 (C++), CMSC 106 and 225, and the MATH 230 courses beyond.
- **Applied linear algebra** (`applinalg`, MATH 205) replaced the earlier "Calculus for data science" topic. MATH 205 is the data science major's linear algebra course; `linalg` now covers MATH 250 and 350.

Each of these topic guides has one row per course instead of the usual three time horizons, so a student can find their course and go. The how-to guide `#guide-sequences` maps the prerequisites across all three. Entries carry specific course numbers in `courses` (for example `"STAT 255"`), which show as tags and are searchable. When a course changes, update its row in the topic guide and the `courses` tags.

## How visitors move through it (v0.5)

- **Home** shows the "talk to a person" line, a search box, four short guides, and one button per topic in plain student language. The `home` list in `resources.js` sets which topics appear and in what order. `meta.person` sets the drop-in line.
- **A topic page** (`#calculus`, `#stats`, …) opens with its start-here guide, then shows at most three entries marked `pick` under "The QRC's picks". Picks that are also `lu` (used at Lawrence) come first. Everything else in the topic is folded under "More options".
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

- Many entries have `checked: null`. They're standard, well-known URLs, but they couldn't be opened from the build environment. Run `check` once to confirm them.
- Course numbers are tagged for MATH 102–355, STAT, DASC, and CMSC. Science and economics entries still use the department code. Add specific numbers as faculty confirm.
- The DASC courses aren't yet in the online catalog's course listings; their descriptions come from the department's course-description page.
- The Mudd Library entry should point to a data or research-help page once you pick one.
