# Plates: Myst-style traced light for the Wending House

Myst drew every view ahead of time, with a ray tracer, and showed you the picture. The house does the same for a few standing places: the light of each view is traced at length in Blender's Cycles (thousands of rays a pixel, soft shadows, light bounced off walls and floor, sun through the window), and kept as a *plate*. When you stand exactly at that place, the plate is laid over the live drawing, and the engraver cuts from the traced light.

A plate stores a ratio, not a picture: how much brighter or darker each point is in the traced light than in the quick live drawing. So anything that changes (a key you took, the almanac's numbers, an opened drawer) is still drawn live, and only the light comes from the plate.

## Making plates for a room

Needs Node with Playwright (and a Chromium), and Python 3.11 with `bpy` (Blender as a module: `pip install bpy`), numpy, and Pillow. From a work folder:

```
node path/to/tools/plates/capture.js 13 day 0      # the Entry at 1 pm: geometry, lights, and each standing place's live light
node path/to/tools/plates/capture.js 22 night 0    # and at 10 pm
python3 path/to/tools/plates/trace.py day 160      # trace each view in Cycles (about a minute a view on two cores)
python3 path/to/tools/plates/trace.py night 128
PLATES_OUT=plates.json python3 path/to/tools/plates/encode.py day night
```

Copy the `.webp` files and `plates.json` into `palace/plates/`. The capture runs the site with `?debug`, which turns on `__bakeDump` and `__bakeWhite` in `palace3d.js`.

A plate matches a view only if the room, the day or night lighting, the standing place, the facing, and the field of view all match. If you change the room's furniture or lighting, bake its plates again.
