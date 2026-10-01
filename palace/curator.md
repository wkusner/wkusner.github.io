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
  shape: hex                  # square (default), hex, oct, round, or corridor
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

**Shapes** are drawn as they're named. A `hex` room shows one face of a hexagon ahead, two faces angling away at 60°, and slivers of the next two; `oct` does the same with 45°. A `round` room has a bowed back wall, and a `corridor` is long and narrow, with floorboards spaced in true perspective. Doors on the left and right go on the angled faces.

**Fittings** that match particular rooms: `cases` (glass cases of rules), `bench` (a drafting bench), `glasshouse` (panes and palms), `cardtables`, `tilefloor` (a fifteen puzzle in the floor), `dial` (the parity dial), `lattice` (a crystal with a dislocation and its Burgers circuit), `bigtree` (a 3-adic tree), `gloom`, `cot`, `names` (Funes's names on the wall), `fibfloor` (a golden rectangle cut into squares, inlaid in the floor), `woodcut` (Kepler's cannonballs, framed), `chalkboard`, `desks`, `workbench`, `tiers` and `screen` (a lecture hall), `longtable`, `polytope` (a hanging icosahedron), `sand`, `sea`, `alethiometer`, `lowshelves`.

When you write a room's text, give it the fittings it describes. If the text says there are tables, put `cardtables` or `longtable` in its decor.

**Decor** (any combination): `shelves`, `lamp` (lit at dusk and night), `window` (shows the real sun or moon if it's in front of you, and casts a beam on the floor), `sky` (the real sky as a dome on the back wall), `stars`, `rug`, `stair` (a spiral well), `pool` (lily pads in a hexagonal packing), `pendulum`, `clockface` (shows the visitor's time), `glacier` (ice and icicles).

### Rooms that change with the time

Every room already changes on its own. The light follows the visitor's clock, lamps light at dusk, and a window shows the sun or moon when it is really in that direction. The sun also lays a beam across the floor, long in the morning and evening and short at noon, and objects cast shadows away from it. A full moon does the same at night.

To change a room's *contents* with the time, give it `phases`. Each phase has a condition and adds to the room while the condition holds:

```yaml
  phases:
    - when: "hours:0-1"
      text: "It is past midnight. A door that isn't there by day stands open."
      doors: [{to: 23, wall: front, oneway: true, title: "the midnight door"}]
    - {when: "night|dusk", text: "The lilies close.", decor: [stars], drop: [window]}
    - {when: ["weekday", "hours:8-17"], text: "Class is in session."}
```

A phase can add `text`, `doors`, `objects`, `notes`, and `decor`. It can remove decor with `drop`, rename the room with `name`, or swap its `widget`. Add `replace: true` to replace the text instead of adding to it.

The top of the file sets where the palace is and which way it faces:

```yaml
latitude: 44.26
longitude: -88.41
facing: 180      # in frame e a visitor faces south, so the windows catch the sun
```

The visitor's frame turns this too: a quarter turn faces them west, and so on.

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
    look: mirror              # mirror, bars, dials, gold, or shelves: what the door itself looks like
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


### Version 2: walking like Myst

**Facings and close-ups.** Each room is seen one wall at a time. Click the left or right edge of the picture (or press ← →) to turn, and press ↓ to turn around. Click a desk or bookcase to look closer, and ↓ or "step back" to return. Every view has its own address: `#13` is room 13 facing its first wall, `#13/e` faces east, and `#13/n/ahead` is the close-up of what's ahead.

**Where things stand.** Give an object a `wall:` (left, back, right, front) to put it on that side of the room. Without one, a room with up to three objects keeps them all ahead, and a room with more spreads them around the walls. Wall-mounted fittings (window, clockface, chalkboard, thermometer, and the like) hang on the back wall.

**Floors and ceilings.** `floor: checker` or `floor: stone` lays a floor in true perspective. `ceiling: coffers`, `ceiling: vault`, or `ceiling: open` (the real sky, for courtyards) replace the default beams.

**The console.** The tally bar shows your level and xp, your frame and sheets, the palace's date and time, the weather, your save code, and your mode. The bag holds what you carry; click an item to use it. With a map in the bag, a live minimap sits in the top-right corner. With the Primer, a hint sits in the bottom-left.

**Modes.** The porter's desk at the Entry (room 0) offers three ways to walk:
- *guided:* master key, plan, finding aid, compass, lantern, and hourglass;
- *wanderer:* map, compass, and lantern;
- *hardcore:* nothing.

In hardcore, the plan is in the Gallery of Rules, the finding aid in the Archive, the compass in the Turning Room, the lantern in Funes's room, and the hourglass in the Clock Room. Use `mode:guided` and the like as conditions. A door marked `hardlock: true` ignores the master key.

**Experience.** First visits, close looks, items, riddles, island puzzles, and new sheets all give xp. Ranks are set by `xp:` thresholds and can carry a `gift:` line, shown when the visitor reaches that rank.

**Save codes and warp words.** The tally bar's ⌘ button shows a save code that carries a visitor's walk to another browser. Warp words are listed under `warps:` at the top of the data file:

```yaml
warps:
  LAME: {room: 16, say: "The corridor narrows around you."}
```

**Monodromy: sheets.** Some loops change *where you are*, not just which way you face. Name the sheets at the top of the file (`sheets: {sqrt: {mod: 2}, log: {}}`). Then give a door a `lift`, such as `lift: {log: -1}`. Conditions like `sheet:log=-3` or `sheet:sqrt!=0` can then show doors, objects, and text. In room text, `{sheet:log}` prints the current value.

- The Great Spiral is a log stair: each loop through 15, 17, and 16 goes down a landing, and at landing −3 a hidden door opens.
- The Branch Cut (rooms 30 to 33) is a square root: once around the pillar puts you on the other sheet, and twice brings you back.

**Live world.** The weather comes from Open-Meteo, for the palace's latitude and longitude. It shows in the windows and on the `thermo` fitting, and it can hide the sun. The hourglass (and the clock chip in the tally bar) sets the palace's date, time, and speed. The sky, sun, sundial, pendulum, light, and timed doors all follow it. The `sundial` fitting and widget show the real shadow.

**Combining things.** An object with `action: combine`, `uses: [a, b]`, and `gives: c` turns two carried things into one. The torn page in the Branch Cut works this way.


### Version 3: the engraved view

On any browser with WebGL, the Palace builds each room in three dimensions and prints it through an engraving pass:
- hatching that follows the surfaces: floors across, walls up, curved things around;
- ink outlines where depth jumps;
- paper grain and a vignette;
- muted color.

Lettering, the window skies, and the sky ceiling print on top, so they stay legible. The menu's **View** button switches between the engraved 3D view and the flat woodcut drawings, which are also the fallback when WebGL is missing.

- **Built from the same data.** Walls come from `shape`, floors and ceilings from `floor` and `ceiling`, doors and plates from `doors`, and furniture from `decor`. Objects become small models on a desk or a low bookcase against their wall.
- **Light is real.** The sun comes in through the windows from its actual direction and casts real shadows, the sundial's shadow among them. Clouds dim it, and above about 85% cover there's no shadow at all. After dark, the moon does the same from its real position, as bright as its phase and the clouds allow; a bright moon throws shadows of its own. Lamps light at dusk and flicker. The lantern follows you. Night prints as a white-line engraving.
- **Looking around.** Click the left or right edge (or ← →) to turn; the camera swings round, as in Myst. Click near the top to look up and near the bottom to look down. Click furniture to look closer, and click a thing to open its own card, where the object turns slowly on a plinth.
- **The cursor shows what a click will do:**
  - an arrow for a door, a padlock for a locked one;
  - turning arrows at the edges, up and down arrows at the top and bottom;
  - a magnifier for furniture;
  - an open hand for things you can take, a pointing hand for things that open.

  A HyperCard-style label names whatever is under the cursor.
- **Animation.**
  - The pendulum swings, and its plane turns at Appleton's rate on palace time.
  - The lily pads bob.
  - The lamps flicker.
  - The icosahedron in the model room turns.
  - The alethiometer's needle wanders.
  - Funes's cigarette glows.
- **Icons become models.** Each `icon` name (carriage, orrery, rule, net, lock, cards, tiles, crystal, tree, book, books, scroll, lectern, clock, hourglass, compass, lamp, key, bell, astrolabe, pond, fraction, note, map, pendulum, hex, plant, turns, cross, planimeter) has a matching 3D model. Unknown icons get a plain box.
- **For checking the light,** `?raw=1` in the address shows the room without the engraving pass.

The 3D code lives in `palace/palace3d.js`. It uses three.js (MIT license), vendored in `palace/lib/` so the site doesn't depend on a CDN.

### The Entry: a launch page

The Entry (room 0) is the front door and a working launch page. No porter; a letter on the desk opens on a visitor's first arrival (edit it under `letter:` in `_data/palace.yml`; it's signed "W. K." for now). What's in the room:
- **The desk.** The ring of keys and the full plan make you a *guided* walker. The folded map and compass make you a *wanderer*. Take nothing and you're *hardcore*. The tray puts everything back. The walking style is read from what you carry, so it's never a menu.
- **The guest book and the bell.** The guest book keeps a reader's name in their own browser; the Primer uses it. The bell does nothing, mostly.
- **The notice board** (left wall) carries the problem of the week, the month's calendar, the news, and a "wanted" list. The puzzle changes on Mondays by ISO week, drawn in turn from `puzzles:` (each has `q`, `a`, and `source`; last week's answer is shown). Calendar entries come from `events:`: `{date: "2026-10-14", time: "4:30 pm", title: "...", where: "...", href: "..."}` (quote the date and times). News is `news:`, a list of `{date, text, href}`; the board sorts it by date.
- **The link board** (right wall) is the launch page. The site's own tiles come from `links:` in the data. Visitors can add their own tiles, kept only in their own browser (`palace-links`), and can export or import them as a file. Bookmark `/palace/#0/links` to land on it, or tick "open the palace straight onto this board."
- **The almanac** (right wall) shows the weather now, a four-day forecast, sunrise and sunset, and the moon and planets at 9 p.m.
- **The codes ledger** writes and reads save codes, and takes warp words.
- **Search.** Press `/` anywhere, or use "/ go" in the tally, to jump to a room, thing, link, or warp. The ★ in the tally pins the current room to the top of search and the link board.

Mounted boards are ordinary objects with `mount: board`; they hang on their wall instead of sitting on a desk, and shelves leave room for them.

### The Office: office hours

Room 35 is off the Entry, through the front door. For now it's a sketch, waiting to be measured and modeled from the real one. Its door plate says *open* or *closed*, as does any room with `hours: true`. Post the hours in the data:

```yaml
office:
  where: "Briggs Hall 4xx"
  note: "Or by appointment: write to me."
  unset: "Office hours will be posted here."
office_hours:
  - {days: [Mon, Wed], start: "14:00", end: "15:30", where: "Briggs 4xx"}
  - {days: Fri, start: "10:00", end: "11:00", note: "QRC drop-in"}
```

Times are on the palace's clock, so the hourglass can test them.

### The Sundial Court and the open sky

Room 34 has `ceiling: open`. Any room with an open ceiling gets the real sky over it, drawn as a dome:
- by day, a sky coloured by the sun's height, with the sun where it is;
- at twilight, a warm horizon toward the sun;
- at night, the stars to about magnitude 4.7, the constellation figures and names, the brightest stars' names, and the planets;
- the moon in its true phase, its lit edge turned toward the sun;
- clouds in proportion to the cloud cover, drifting slowly;
- rain and snow falling into the court.

Click near the top to look up; in an open court the camera tips nearly to the zenith.

The **sundial** is laid out for the latitude the palace stands at, on a baluster pedestal with two round steps, and reads from IIII in the morning to VIII at night. Click the dial to bring its reading forward. Nothing on it is corrected: it reads the sun's own time, straight off the plate, and the note beside it says why that differs from the clock (longitude, the equation of time, daylight saving). On a clear night with the moon more than about a sixth lit, it reads by moonlight instead, and that too is read straight off the plate: moon time, which runs about 48 minutes later each night. Under heavy cloud, or with the sun put out in the storm glass, it says so and waits. South of the equator, the style turns to point at the south pole.

The positions behind it are good to about a hundredth of a degree for the sun and a few tenths for the moon. They include the moon's parallax and atmospheric refraction, so the sun is seen a little above where geometry alone would put it near the horizon, just as a real shadow sees it. The moon's phase comes from its real elongation from the sun, not from a mean month.

The court is a cloister: a Tuscan colonnade on every side, whose lean-to roof throws a hard line of shadow, two stone benches, and four terracotta urns of clipped box. The paving rings the dial.

### The astrolabe: place, day, and weather

The astrolabe hangs in the Sundial Court; take it and it rides in the bag (its save-code bit comes after the mended page). It can:
- **Carry the palace somewhere else.** Choose from a list (Reykjavík, Tromsø, Quito, Alexandria, Kyoto, Sydney, the South Pole), type a latitude and longitude, or press "Where I am", which asks the browser once. Weather, the sky, the sun's light, the sundial, the pendulum's rate, and the almanac all follow. Away from home, light (dawn, day, dusk, night) follows the sun's real height instead of the clock. "Home to Appleton" undoes it.
- **Set the day and hour.** This is the same control as the hourglass.
- **Set the weather.** The storm glass can fix clear, broken cloud, overcast, fog, rain, snow, or a storm, or go back to live weather. "Clear the sky" sets it clear in one press, which keeps the sundial and the stars working whatever the real weather is doing.
- **Put out the sun or the moon.** With the sun out, the court's sky goes dark, so the stars, planets, and their tracks show by day; there's no sunlight and no shadow. With the moon out, its glare and its shadows go too.

The home place is `latitude`, `longitude`, and (optionally) `place:` at the top of the data file.

### Quality, skins, and looking around

The menu's **Quality** button cycles draft, normal, fine, and ultra. Each draws more pixels than the screen shows and lets the browser shrink them, which smooths every engraved line. Each step also enlarges the shadow map and the textures, and the finer settings use finer engraving (the hatch spacing drops from 6.2 to 4.4 pixels). Fine is the default on a desktop-sized screen, and normal on a phone. Ultra wants a good graphics card. Changing the setting reloads the page. **Full view** (or F) fills the screen with the picture.

The **Skin** button switches the frame around the picture between two looks:
- **Myst**, the default: a dark room around a lit picture, journals of parchment bound in leather, brass buttons, and messages as a line of italic text.
- **HyperCard**: striped title bars, square close boxes, and hard shadows.

**View** switches between the engraved 3D rooms and the flat woodcut drawings.

**Looking around.** Drag anywhere in the picture to look; let go past half a quarter turn and you face that way. The edges turn you, and the top and bottom look up and down; in an open court looking up tips nearly to the zenith. Keys:
- ← → or A D turn.
- ↑ or W goes through the door ahead.
- ↓ or S turns around, or steps back from a close look.
- Shift with ↑ ↓ (or Page Up, Page Down) looks up and down.
- / searches.

### The gardens

Through the court's front gate (36–41), all open to the sky with hedge walls (`hedges` in `decor`) and gravel or lawn floors (`floor: gravel`, `floor: lawn`):
- **The Knot Garden (36)** is a trefoil in clipped box that rises over and dips under at each crossing (`knot`).
- **The Hedge Maze (37)** has turnings that carry you round a quarter turn or turn you inside out (doors to itself with `turn: r` and `turn: s`). Its heart (41, `secret`, with a `fountain`) opens only to visitors who arrive mirrored (`needs: mirror`).
- **The Sunflower Bed (38)** is Vogel's spiral of 610 seeds (`phyllo`). Its sunflowers face the real sun by day and the east by night (`sunflowers`).
- **The Moon Garden (39)** has flowers that open at dusk (`moonflowers`). It also has an armillary sphere set up as an equatorial dial: its polar rod points at the pole and casts a real shadow on the hour band (`armillary`).
- **The Orrery Lawn (40)** has a brass orrery with every planet where it really is today (`orrery`), and the ephemeris.

### The planets

"The planet book" in the Observatory, "The ephemeris" on the Orrery Lawn, and the almanac's "All the planets…" button open a table for Mercury through Neptune. For each planet it gives:
- where it is now;
- the constellation it's in;
- its magnitude;
- when it rises, is highest, and sets;
- its elongation from the sun and how much of it is lit;
- its distance and the light time.

Under the table is a small orrery. Positions come from JPL's Keplerian elements, with light time, precession to the date, and refraction; they agree with pyephem to a few hundredths of a degree. In any open court at night, each planet's path among the stars shows as a dotted track, a dot every four days for forty days either side of now, so retrograde loops show as kinks.

### The carriage clock

It stands on a side table on the Entry's right wall and keeps palace time, with live hands and a ticking balance. Its card offers:
- the chimes: Westminster, Whittington, St. Michael's, ting-tang, ship's bells, the hours only, or silent;
- volume;
- whether it's heard only in the Entry (faintly next door) or through the whole house;
- whether it chimes at night;
- a repeat button, and buttons to play each quarter.

The sequences are the standard chime tables, sounded on synthesized rod gongs. Browsers allow sound only after a click on the page.

### Furniture and fitted rooms

There are a few `decor` words for fitted rooms:
- `wainscot` panels the walls to dado height, stepping around doors.
- `porter` fits out the Entry: a hall bench, a coat stand with a coat and hat, an umbrella stand, and a runner toward the reading room.
- `officefit` fits out the Office: a partners' desk with a green leather top and a brass gallery, your chair and a visitor's, a green-shaded lamp, a filing cabinet, a blackboard, bookcases on the right wall, a reading chair, and a rug.
- `cloister` is the court's colonnade.

Desks and tables everywhere now have turned legs, moulded tops, and drawers with brass knobs. When you measure the real office, give the furniture's positions and sizes and they'll go into `officefit`.

### Annotations: marginalia, sources, bibliography

The **Annotations** button in the menu bar opens a window under the picture with three tabs. Each room can fill any of them:

```yaml
  marginalia:
    - "A note in the margin, in your own voice."
  sources:
    - "Where the room's idea comes from."
  bib:
    - "Author, <i>Title</i>, year."
```

Marginalia are shown in italics with a pencil mark, sources as a list, and the bibliography as a numbered list. HTML is allowed, so a source can be a link. Leave a tab out and it says there is nothing in that margin yet.

### Conditions (`when` and `needs`)

A condition is a word, a word with a value, or a list (all must hold). Use `|` for "or" and `not:` for "not."

| Condition | True when |
|---|---|
| `night`, `dawn`, `day`, `dusk` | the visitor's local hour is 21–5, 5–8, 8–18, 18–21 |
| `hours:9-17` | the hour is in that range (wraps past midnight, e.g. `hours:22-3`) |
| `weekend`, `weekday` | as named |
| `minutes:0-5` | the first five minutes of any hour |
| `sun:up`, `sun:down` | the real sun, at the palace's latitude and longitude |
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
- `action: primer` with `item: primer` is the Primer. Once picked up, it gets a button in the menu bar.

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
| `sky` | the sky chart, full size, with a slider to turn the dome through ±24 hours | — |
| `knights` | endless knights-and-knaves puzzles, each checked for a unique answer; solving `need` of them sets `solved:island` | `need` |
| `oracle` | the palace alethiometer: three hands, a needle, and a room for an answer | — |
| `rank` | the table of ranks | — |

Write widgets as `widget: clock` or `widget: {type: euclid, a: 89, b: 34}`.

### The Primer

The Primer knows which rooms the reader has seen. Each time it opens, it tells a little story about the reader by name and teaches the lesson for the room they're standing in. Then it offers a picture of a door to a room they haven't seen, and touching the picture takes them there. Lessons live at the bottom of the data file:

```yaml
primer:
  "16": {teaser: "the slowest gcd is made of Fibonacci numbers",
         lesson: "Euclid's algorithm cuts off squares...",
         q: "How many steps for gcd(89, 55)?", a: "Nine..."}
```

`teaser` finishes the sentence "had not yet seen *Room*, where …". `q` and `a` are a question and a hidden answer. Rooms without a lesson are still offered; they just get less of a story.

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

The palace uses the visitor's clock, or the hourglass's or astrolabe's. Light runs dawn, day, dusk, night, and the Lamps button overrides it. The window shows the sun by day and the actual phase of the moon by night. The Clock Room's door changes each hour, and the Observatory's trapdoor opens at dusk.

### The look

The pictures are drawn like woodcuts: black hatching on paper, with a rough cut to every line. At night they turn into white-line engravings. The windows around them are HyperCard's: striped title bars, square close boxes, hard shadows, and a dithered desktop.

Color is a second block, printed over the black. Each wing's `color` is its spot color, and it shows up on the room number, the drop cap, the rug, the lamp shade, the sky in the window, the water, and the darkest fills of the objects. Keep wing colors muted and few; the palace looks best with four or five. The **Ink** button switches any visitor to pure 1-bit black and white.

### What visitors' browsers remember

Visits, the walk, the frame in each room, pockets, solved riddles, Funes names, the reader's name, pinned rooms, the astrolabe's place and weather, and the lamp, ink, and quality settings are all kept in the visitor's own browser (`localStorage`, key `palace-v1`). Nothing is sent anywhere, except the place's coordinates to Open-Meteo for the weather. Visitors' own link tiles are kept separately (`palace-links`). "Forget my walk" in *How to walk* clears it.

### Recipes

- **Add a new device page.** Put the device in its own folder, as with the others. Then add an object with `href: "/its-folder/"` to the room where it belongs, and add a line to `puzzles.md` and the header menu.
- **Add a talk or paper from `assets/`.** Add `{kind: talk, icon: scroll, title: "Venue, Month Year", href: "/assets/file.pdf"}` to the Lecture Hall (24), or `kind: paper` to the Seminar Room (25).
- **Hide a room behind a mirror.** Give one door on a loop `turn: s`, then give the hidden door `when: mirror`. Check the office: the loop should show up under Holonomy with a reflection.
- **Post office hours or an event.** Edit `office_hours:` or `events:` in `_data/palace.yml` and push. The office door plate and the notice board update themselves.
- **A door that only opens on a full moon:** `needs: "moon:full"` with a hint.
- **Retire an unwritten book once it exists.** Change `kind: unwritten` to `kind: device` and add its `href`.
- **Ask Claude.** "Add a room for X to the palace" is enough. The data file and this guide are in the QRC project notes too.

### Sources of the idea

Frances Yates's *The Art of Memory*; Borges's Library of Babel and Funes; Eco's labyrinthine library and Foucault's pendulum; Christopher Manson's *Maze*, with its numbered rooms and shortest path; the Myst linking books and HyperCard stacks; Garth Nix's Great Library of the Clayr, with its ranked librarians and stacks carved into a glacier; and Pratchett's L-space, where all libraries are connected.
