"""Trace one lighting of a room at length in Cycles, view by view, and write each view's plate:
the ratio of the traced light to the quick picture's light, log-encoded in a PNG. Usage: python3 trace.py <dir> [samples] [hemiK]"""
import bpy, json, base64, math, sys, os, glob, time
import numpy as np
from mathutils import Matrix, Vector
D = sys.argv[1]; SPP = int(sys.argv[2]) if len(sys.argv) > 2 else 192; HEMI = float(sys.argv[3]) if len(sys.argv) > 3 else .35
sc_json = json.load(open(f"{D}/scene.json"))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SPP
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'; sc.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 4; sc.cycles.glossy_bounces = 1; sc.cycles.transparent_max_bounces = 4
sc.cycles.sample_clamp_indirect = 8.0; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = .02
sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
C3 = Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))   # three (y up) to Blender (z up)
def tb(v): return Vector((v[0], -v[2], v[1]))
# materials
def mat_diffuse(c):
    m = bpy.data.materials.new("d"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (*[min(.92, max(.02, x)) for x in c], 1); d.inputs['Roughness'].default_value = 1
    nt.links.new(d.outputs[0], o.inputs[0]); return m
def mat_emit(c):
    m = bpy.data.materials.new("e"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*c, 1); e.inputs['Strength'].default_value = 1
    nt.links.new(e.outputs[0], o.inputs[0]); return m
cache = {}
for i, M in enumerate(sc_json["meshes"]):
    P = np.frombuffer(base64.b64decode(M["P"]), dtype=np.float32).reshape(-1, 3); I = np.frombuffer(base64.b64decode(M["I"]), dtype=np.uint32)
    if len(I) < 3: continue
    I = I[: len(I)//3*3]; Pb = np.stack([P[:,0], -P[:,2], P[:,1]], 1)
    me = bpy.data.meshes.new(f"m{i}"); me.vertices.add(len(Pb)); me.vertices.foreach_set("co", Pb.ravel())
    nt = len(I)//3; me.loops.add(len(I)); me.loops.foreach_set("vertex_index", I.astype(np.int32)); me.polygons.add(nt)
    me.polygons.foreach_set("loop_start", np.arange(0, len(I), 3, dtype=np.int32)); me.polygons.foreach_set("loop_total", np.full(nt, 3, dtype=np.int32)); me.update(calc_edges=True); me.validate()
    ob = bpy.data.objects.new(f"o{i}", me); sc.collection.objects.link(ob)
    key = (M["kind"], tuple(round(x, 2) for x in M["color"]))
    if key not in cache: cache[key] = mat_emit(M["color"]) if M["kind"] == "emit" else mat_diffuse(M["color"])   # "flat" (printed) things are plain surfaces
    me.materials.append(cache[key])
    if M.get("sky"): ob.visible_shadow = False; ob.visible_camera = False
# lights
for L in sc_json["lights"]:
    col = L["color"]; I0 = L["intensity"]
    if I0 <= 0: continue
    if L["type"] == "sun":
        ld = bpy.data.lights.new("s", 'SUN'); ld.energy = I0; ld.angle = math.radians(.8)
    elif L["type"] == "spot":
        ld = bpy.data.lights.new("p", 'SPOT'); ld.energy = I0*4*math.pi; ld.spot_size = min(math.pi, 2*L.get("angle", .8)); ld.spot_blend = L.get("penumbra", 0); ld.shadow_soft_size = .06
    elif L["type"] == "point":
        ld = bpy.data.lights.new("p", 'POINT'); ld.energy = I0*4*math.pi; ld.shadow_soft_size = .06
    else: continue
    ld.color = col
    try: ld.cycles.cast_shadow = bool(L["shadow"]) or L["type"] != "sun"
    except Exception: pass
    ob = bpy.data.objects.new("L", ld); sc.collection.objects.link(ob); ob.location = tb(L["pos"])
    if "dir" in L and L["type"] in ("sun", "spot"):
        d = tb(L["dir"]).normalized(); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
# the world: a share of the hemisphere's sky and ground, as light from outside
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1; mr.inputs['From Max'].default_value = 1
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs[6].default_value = (*sc_json["gnd"], 1); mix.inputs[7].default_value = (*sc_json["sky"], 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], mr.inputs['Value']); nt.links.new(mr.outputs[0], mix.inputs['Factor'])
nt.links.new(mix.outputs[2], bg.inputs['Color']); bg.inputs['Strength'].default_value = HEMI/math.pi; nt.links.new(bg.outputs[0], out.inputs[0])
# the camera, and the passes: the denoised picture and the diffuse color, so light = picture / color
camd = bpy.data.cameras.new("c"); camo = bpy.data.objects.new("c", camd); sc.collection.objects.link(camo); sc.camera = camo
vl = sc.view_layers[0]; vl.use_pass_diffuse_color = True
sc.use_nodes = True; ct = sc.node_tree; ct.nodes.clear(); rl = ct.nodes.new('CompositorNodeRLayers'); fo = ct.nodes.new('CompositorNodeOutputFile')
fo.format.file_format = 'OPEN_EXR'; fo.format.color_depth = '32'; fo.base_path = f"{D}/tmp"; fo.file_slots.clear(); fo.file_slots.new("img"); fo.file_slots.new("col")
ct.links.new(rl.outputs['Image'], fo.inputs['img']); ct.links.new(rl.outputs['DiffCol'], fo.inputs['col'])
def load_exr(path):
    im = bpy.data.images.load(path); a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)[..., :3]; bpy.data.images.remove(im); return a
from PIL import Image, ImageFilter
for vf in sorted(glob.glob(f"{D}/view*.json"), key=lambda f: int(f.split("view")[-1].split(".")[0])):
    V = json.load(open(vf)); w_, h_ = V["w"], V["h"]
    M3 = Matrix([V["cam"][r::4] for r in range(4)])   # three's matrix arrays are column-major
    camo.matrix_world = C3 @ M3; camd.sensor_fit = 'VERTICAL'; camd.angle_y = math.radians(V["fov"]); camd.clip_start = .05; camd.clip_end = 80
    sc.render.resolution_x = w_; sc.render.resolution_y = h_; sc.render.resolution_percentage = 100; sc.frame_set(1)
    t = time.time(); bpy.ops.render.render(write_still=False); print(vf, "traced in", round(time.time() - t), "s", flush=True)
    img = load_exr(glob.glob(f"{D}/tmp/img*.exr")[0]); col = load_exr(glob.glob(f"{D}/tmp/col*.exr")[0])
    for f in glob.glob(f"{D}/tmp/*.exr"): os.remove(f)
    light = img/np.maximum(col, 1e-3); light[col.max(-1) < .02] = -1   # -1: no surface to light (a flame, the sky, a hole)
    np.save(f"{D}/light-{os.path.basename(vf)[:-5]}.npy", light.astype(np.float32))
    Image.fromarray(np.uint8(np.clip(np.clip(light, 0, None)[::-1]/np.percentile(light[light > 0], 90), 0, 1)**(1/2.2)*235)).save(f"{D}/check-{os.path.basename(vf)[:-5]}.png")
print('done')
