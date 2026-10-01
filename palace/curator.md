---
layout: page
permalink: /palace/curator/
title: The Curator's Guide
shorttitle:
---

## The Curator's Guide to the Palace

The [Palace](/palace/) is one engine plus one data file. To add a room, a door, a book, or a riddle, you edit one file, `_data/palace.yml`, then commit and push. Nothing else needs to change.

### Where things live

| File | What it is | Do you edit it? |
|---|---|---|
| `_data/palace.yml` | every room, door, object, wing, and rank | **yes, this is the palace** |
| `palace/data.js` | three lines that hand the YAML to the page | no |
| `palace/palace.js` | the engine: drawing, walking, the map, the widgets | only to add a new kind of thing |
| `palace/index.html` | the page and its styles | rarely |
| `palace/curator.md` | this guide | when the palace learns new tricks |

### The curator's office

Visit [/palace/#curator](/palace/#curator) to open the office. It is a checker and a skeleton key:

- **Problems** lists doors that go nowhere and rooms you can't reach. Fix these before pushing.
- **Notes** lists one-way doors and doors whose turns don't undo each other. These are often deliberate; mark them with `oneway: true` or `twist: true` to quiet them.
- **Holonomy** lists the twisted loops, one for each corridor outside a spanning tree from the Foyer, with the element of D₄ the loop leaves you turned by.
- **Show all doors and objects** opens every lock and ignores every clock, so you can inspect everything.
- **Testing time:** put `?hour=22` or `?date=2026-12-25` before the `#` in the address to pretend it is another time.

Visitors never see the office unless they type `#curator`.

### A room

```yaml
- id: 27                      # the room number (also its address: /palace/#27)
  name: The Map Room
  wing: instruments           # one of the keys under wings:
  shape: hex                  # square (default), hex, oct, or round
  decor: [shelves, lamp, window]
  at: [9, 4]                  # where it sits on the map grid (any integers)
  text: >-
    First paragraph.

    Second paragraph. <i>HTML is fine.</i>
  again: Shown in italics on every visit after the first.
  mirror: Shown only when the visitor arrives mirrored.
  notes:
    - {when: night, text: "Shown only at night."}
  widget: pendulum            # optional, see Widgets
  secret: true                # optional: not counted, never a random destination
  doors: [...]
  objects: [...]
```

**Decor** (any combination): `shelves`, `lamp`, `window` (shows the real sun or the real moon phase), `stars`, `rug`, `stair` (a spiral well), `pool` (lily pads in a hexagonal packing), `pendulum`, `clockface` (shows the visitor's time), `glacier` (ice and icicles).

### A door

```yaml
doors:
  - to: 12                    # a room number
    wall: left                # left, back, right, or front (front means "behind you")
    title: "a door of silvered glass"   # shown in the door list
    turn: s                   # holonomy, see below
    say: "You step through the glass."  # a message as you pass
    when: night               # if false, the door isn't there at all
    needs: "has:golden-key"   # if false, the door is there but locked
    hint: "A small gold lock with a φ on it."   # shown while locked
    label: "?"                # the plaque, if not the room number
    oneway: true              # quiets the one-way note in the office
    twist: true               # quiets the turns-don't-undo note
```

Special destinations:

- `to: [18, 19, 21, 23]` is a **turning door**. It leads to the hour mod 4th room in the list, so it changes every hour. Any length works; use 12 entries for a true clock.
- `to: random` leads anywhere that isn't secret (the folded shelves of L-space).
- `to: back` leads to the previous room on the visitor's walk.

**Riddle doors** stay locked until answered:

```yaml
    riddle:
      id: galois              # remembered once solved, usable as "solved:galois"
      q: "How many arrangements will the lock ever reach?"
      a: ["8", "eight"]       # any of these, ignoring case
      yes: "The door swings open."
      no: "The dials stick."
```

### Conditions (`when` and `needs`)

A condition is a word, a word with a value, or a list (all must hold). Use `|` for "or" and `not:` for "not."

| Condition | True when |
|---|---|
| `night`, `dawn`, `day`, `dusk` | the visitor's local hour is 21–5, 5–8, 8–18, 18–21 |
| `hours:9-17` | the hour is in that range (wraps past midnight, e.g. `hours:22-3`) |
| `weekend`, `weekday` | as named |
| `month:12` | December |
| `moon:full`, `moon:new` | the actual moon, within about two days |
| `mirror`, `upright` | the visitor is (or isn't) reflected |
| `frame:r2` | the visitor's frame is exactly that element |
| `visited:15` | the visitor has been in room 15 |
| `visits:3` | the visitor has been in *this* room at least 3 times |
| `seen:10` | the visitor remembers at least 10 rooms |
| `rank:3` | the visitor's rank index is at least 3 (counting from 0) |
| `has:golden-key` | the item is in the visitor's pockets |
| `solved:galois` | that riddle has been answered |

Examples: `when: "night|dusk"`, `needs: ["rank:2", "has:golden-key"]`, `when: "not:mirror"`.

### Holonomy: the turns

Each visitor carries a **frame**, an element of D₄, the eight symmetries of a square. It is drawn as the small F in the top bar. A door's `turn` multiplies the frame on the right as you pass through. Elements are written in r (a quarter turn) and s (a mirror): `e`, `r`, `r2`, `r3`, `s`, `rs`, `r2s`, `r3s`. Strings like `sr` are multiplied out for you.

The frame changes what the visitor sees:

- Doors move to the walls the frame sends them to. A quarter turn puts the left door ahead, and so on.
- A mirrored frame reverses the room's name, plaques, and labels, and shows the room's `mirror:` text.
- Doors and objects with `when: mirror` (or `frame:…`) exist only in that frame. That is how a hidden door works: it is reachable only by walking a loop whose holonomy is a reflection.

A door and its return should usually carry inverse turns (`r` and `r3`, or `s` and `s`). A loop of doors whose turns multiply to something other than `e` is a twisted loop. The office lists them all.

When a visitor jumps by memory instead (the map, the back button, or a typed address), the frame resets to the one they had the last time they stood in that room.

### An object

```yaml
objects:
  - kind: device              # device, book, paper, ref, talk, notes, figure, model, page, unwritten, note, link, key
    icon: rule                # see the list below; defaults by kind
    title: "Slide Rule Cabinet"
    short: "Rules"            # optional shorter label for the picture
    href: "/slide-rules/"     # where clicking it goes
    by: "Author"              # for books and references
    note: "One line about it. HTML is fine."
    when: night               # optional condition
    hide: true                # optional: leave it out of the catalogue
```

Special objects:

- `kind: unwritten` is a book or device that doesn't exist yet. It sits on the shelf with a dashed outline. This is the palace's to-do list.
- `kind: link` with `to: 1` is a Myst linking book: clicking it carries the visitor to room 1 (with an optional `turn` and `say`).
- `kind: key` with `item: golden-key` can be picked up. Name items under `items:` at the top of the file.
- `action: map`, `action: catalogue`, or `action: ranks` opens that view.

Icons: `rule`, `net`, `planimeter`, `cross`, `plant`, `turns`, `cards`, `lock`, `tiles`, `crystal`, `tree`, `book`, `books`, `unwritten`, `scroll`, `lectern`, `clock`, `key`, `pond`, `fraction`, `note`, `map`, `pendulum`, `hex`, `door`, `box`.

A room draws at most six objects in its picture; the rest are listed beside it ("+N more on the shelves").

### Widgets

A room can hold one working instrument under its text:

| Widget | What it does | Options |
|---|---|---|
| `pendulum` | Foucault's pendulum at the palace's latitude, turning in real time | `latitude` |
| `funes` | Funes's wall of names, the visitor's own number names, and their whole walk | `names: [{n, name}]` |
| `euclid` | Euclid's algorithm as squares cut from a rectangle, with Lamé's bounds | `a`, `b`, `award` (an item), `awardText` |
| `clock` | the time in dozenal, in grosses and great grosses | — |
| `babel` | a page from the Library of Babel, and a search that always succeeds | — |
| `center` | the visitor's path length against the shortest one | — |
| `rank` | the table of ranks | — |

Write widgets as `widget: clock` or `widget: {type: euclid, a: 89, b: 34}`.

### Wings and ranks

```yaml
wings:
  instruments: {name: "The Instrument Gallery", color: "#8C6A2E"}
ranks:
  - {name: "Visitor", at: 0, color: "#D9D2C0"}
  - {name: "Reader",  at: 4, color: "#7A9E7E"}
```

A rank is earned by the number of distinct rooms remembered. Its index (0, 1, 2, …) is what `rank:` conditions test.

### Time and light

The palace uses the visitor's clock. Light runs dawn, day, dusk, night, and the Lamps button overrides it. The window shows the sun by day and the actual phase of the moon by night. The Clock Room's door changes each hour, and the Observatory's trapdoor opens at dusk.

### The look

The pictures are drawn like woodcuts: black hatching on paper, with a rough cut to every line. At night they turn into white-line engravings. The windows around them are HyperCard's: striped title bars, square close boxes, hard shadows, and a dithered desktop.

Color is a second block, printed over the black. Each wing's `color` is its spot color, and it shows up on the room number, the drop cap, the rug, the lamp shade, the sky in the window, the water, and the darkest fills of the objects. Keep wing colors muted and few; the palace looks best with four or five. The **Ink** button switches any visitor to pure 1-bit black and white.

### What visitors' browsers remember

Visits, the walk, the frame in each room, pockets, solved riddles, Funes names, and the lamp and ink settings are all kept in the visitor's own browser (`localStorage`, key `palace-v1`). Nothing is sent anywhere. "Forget my walk" in *How to walk* clears it.

### Recipes

- **Add a new device page.** Put the device in its own folder, as with the others. Then add an object with `href: "/its-folder/"` to the room where it belongs, and add a line to `puzzles.md` and the header menu.
- **Add a talk or paper from `assets/`.** Add `{kind: talk, icon: scroll, title: "Venue, Month Year", href: "/assets/file.pdf"}` to the Lecture Hall (24), or `kind: paper` to the Seminar Room (25).
- **Hide a room behind a mirror.** Give one door on a loop `turn: s`, then give the hidden door `when: mirror`. Check the office: the loop should show up under Holonomy with a reflection.
- **A door that only opens on a full moon:** `needs: "moon:full"` with a hint.
- **Retire an unwritten book once it exists.** Change `kind: unwritten` to `kind: device` and add its `href`.
- **Ask Claude.** "Add a room for X to the palace" is enough. The data file and this guide are in the QRC project notes too.

### Sources of the idea

Frances Yates's *The Art of Memory*; Borges's Library of Babel and Funes; Eco's labyrinthine library and Foucault's pendulum; Christopher Manson's *Maze*, with its numbered rooms and shortest path; the Myst linking books and HyperCard stacks; Garth Nix's Great Library of the Clayr, with its ranked librarians and stacks carved into a glacier; and Pratchett's L-space, where all libraries are connected.
