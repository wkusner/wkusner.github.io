# MAT670 notes: typeset draft

First typeset pass (Oct 2026) of the handwritten MAT670 notes (TU Graz, Summer 2016).

- `MAT670_notes.tex`: main file. Build with `latexmk -pdf MAT670_notes.tex`.
- `preamble.tex`: packages, theorem environments, macros, and the editorial markup:
  - `\added{}` (blue): not in the handwritten notes
  - `\fixed{}`: a corrected error (margin note)
  - `\unclear{}`: a doubtful reading or an open step (margin note)
  - `\orig{}`: a note about the original page
  To hide the markup later, redefine `\added` as `#1` and the margin macros as empty.
- New material (black text, all added):
  - `chapters/threads.tex`: "Threads through the notes", a reading map at the front.
  - Interlude A, `chapters/Lie.tex`: Dynkin diagrams → Lie algebras → exponential map, matrix groups, maximal tori; what else a Dynkin diagram knows.
  - Interlude B, `chapters/NT.tex`: lattices, quadratic forms, the Gauss circle problem, Minkowski/Blichfeldt, theta series, Poisson summation → Cohn–Elkies/Viazovska.
  - Interlude C, `chapters/ERG.tex`: shredding the torus, Diophantine approximation, three gaps, Fibonacci points, Sturmian words, cut-and-project, Dynkin folding (Twarock et al.), aperiodic tilings, the space of lattices.
  - Interlude D, `chapters/TOP.tex`: min-max Morse theory, configuration spaces, braids, Artin groups.
  - Interlude E, `chapters/SM.tex` (+ `chapters/tetra.tex`): hard spheres, random packings, jamming, frustration and the 20-tetrahedra argument, Edwards entropy (the channel model solved), information theory and codes.
- `chapters/`: L01–L03 (packing bounds), L04a/b (Lectures 4–6, root systems and lattices), L07 (Lectures 7–8), L09 (Lectures 9–10), L11.

Sources: MAT670_1, _2, _3, _46, _78, _9X, _XI. `MAT670_emsemble` duplicates Lectures 1–3 and
`MAT670_classification` duplicates Lectures 4–5; both were used only as cross-checks.
