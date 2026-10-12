"""Turn traced light (light-viewN.npy) and the quick picture's white light (viewN.json) into plates. Usage: python3 encode.py <dir>..."""
import json, base64, math, sys, os, glob
import numpy as np
from PIL import Image, ImageFilter
lum = lambda a: a @ np.array([.2126, .7152, .0722], dtype=np.float32)
for D in sys.argv[1:]:
    plates = []
    for vf in sorted(glob.glob(f"{D}/view*.json"), key=lambda f: int(f.split("view")[-1].split(".")[0])):
        lf = f"{D}/light-{os.path.basename(vf)[:-5]}.npy"
        if not os.path.exists(lf): continue
        V = json.load(open(vf)); w_, h_ = V["w"], V["h"]; light = np.load(lf)
        white = np.frombuffer(base64.b64decode(V["rgb"]), dtype=np.float32).reshape(h_, w_, 3)
        ok = (light.min(-1) >= 0) & (lum(white) > 1e-3)
        g = math.exp(np.median(np.log(lum(white)[ok])) - np.median(np.log(np.maximum(lum(light)[ok], 1e-6))))
        k = np.clip(np.maximum(light, 0)*g/np.maximum(white, 1e-4), 1/8, 8); e = np.log2(k)/6 + .5
        k = np.where(k > 1, 1 + (k - 1)/(1 + (k - 1)/3), k); e = np.log2(k)/6 + .5   # a soft shoulder: a pool of lamplight brightens, but does not burn the drawing out
        ok &= lum(np.maximum(light, 0))*g/np.maximum(lum(white), 1e-4) > .14   # points buried inside another solid (where beams cross) see no light at all: not a shadow, a flaw
        m = ok.astype(np.float32)[..., None]
        # fill where there is nothing to say (the sky, a flame) from the neighbours, so the plate has no hard holes
        for r in (2, 6, 18):
            num = Image.fromarray(np.uint8(np.clip(e*m, 0, 1)*255)); den = Image.fromarray(np.uint8(m[..., 0]*255))
            nb = np.asarray(num.filter(ImageFilter.GaussianBlur(r)), np.float32)/255; db = np.asarray(den.filter(ImageFilter.GaussianBlur(r)), np.float32)[..., None]/255
            fill = nb/np.maximum(db, 1e-4); e = np.where((m < .5) & (db > .02), fill, e); m = np.maximum(m, (db > .02).astype(np.float32))
        e = np.where(m < .5, .5, e)
        name = f"{V['room']}-{'night' if V['band']=='night' else 'day'}-{os.path.basename(vf)[4:-5]}.webp"
        Image.fromarray(np.uint8(np.clip(e[::-1]*255 + .5, 0, 255))).filter(ImageFilter.GaussianBlur(.7)).save(f"{D}/{name}", quality=92, method=6)
        plates.append({"room": V["room"], "band": V["band"], "photo": V["photo"], "pos": V["pos"], "yaw": V["yaw"], "pitch": V["pitch"], "fov": V["fov"], "aspect": round(V["aspect"], 4), "src": name})
        print(D, name, "gain", round(g, 2), "k 10/50/90%:", [round(float(x), 2) for x in np.percentile(k[ok], [10, 50, 90])])
    json.dump(plates, open(f"{D}/plates.json", "w"), indent=1)
# all the plates together, for palace/plates/plates.json
if len(sys.argv) > 2 or os.environ.get("PLATES_OUT"):
    out = os.environ.get("PLATES_OUT", "plates.json"); allp = []
    for D in sys.argv[1:]: allp += json.load(open(f"{D}/plates.json"))
    json.dump(allp, open(out, "w"), indent=1); print("wrote", out, len(allp), "plates")
