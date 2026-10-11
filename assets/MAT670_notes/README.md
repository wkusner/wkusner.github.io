# MAT670 notes: typeset draft

First typeset pass (Oct 2026) of the handwritten MAT670 notes (TU Graz, Summer 2016).

- `MAT670_notes.tex`: main file. Build with `latexmk -pdf MAT670_notes.tex`.
- `preamble.tex`: packages, theorem environments, macros, and the editorial markup:
  - `\added{}` (blue): not in the handwritten notes
  - `\fixed{}`: a corrected error (margin note)
  - `\unclear{}`: a doubtful reading or an open step (margin note)
  - `\orig{}`: a note about the original page
  To hide the markup later, redefine `\added` as `#1` and the margin macros as empty.
- `chapters/Lie.tex`: new interlude after Lecture 6 (Dynkin diagrams → Lie algebras → exponential map, matrix groups, maximal tori).
- `chapters/`: L01–L03 (packing bounds), L04a/b (Lectures 4–6, root systems and lattices), L07 (Lectures 7–8), L09 (Lectures 9–10), L11.

Sources: MAT670_1, _2, _3, _46, _78, _9X, _XI. `MAT670_emsemble` duplicates Lectures 1–3 and
`MAT670_classification` duplicates Lectures 4–5; both were used only as cross-checks.
