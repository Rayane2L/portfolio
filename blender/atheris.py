"""Modèle 3D stylisé d'Atheris hispida (vipère arboricole hérissée) pour le portfolio.

Usage (sans interface) :
  blender --background --factory-startup --python blender/atheris.py -- <dossier_sortie_glb> <dossier_previews>

Le serpent est construit droit, le long de +X (queue en x=0, museau en x=L), Z vers le haut,
Y latéral. Le site le courbe en temps réel le long du rail (shader de déformation sur courbe).

Ce qui donne le caractère « hispida » :
  - écailles dorsales lancéolées, fortement carénées et relevées vers l'extérieur (aspect hérissé) ;
  - tête large et triangulaire, nettement plus large que le cou, couverte de petites écailles carénées ;
  - grands yeux latéraux à pupille verticale, écailles supra-oculaires relevées ;
  - queue fine et préhensile.
Les couleurs sont volontairement stylisées dans les bleus du site (choix validé).
"""

import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = argv[0] if len(argv) > 0 else os.path.join(os.path.dirname(__file__), "..", "public", "models")
PREVIEW_DIR = argv[1] if len(argv) > 1 else os.path.join(os.path.dirname(__file__), "previews")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

random.seed(20261118)

L = 1.0  # longueur totale


# ---------------------------------------------------------------- utilitaires
def hex_rgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # attribut couleur en linéaire (le glTF attend du linéaire)
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]


def mix(a, b, t):
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def interp(keys, u):
    for i in range(1, len(keys)):
        if u <= keys[i][0]:
            u0, v0 = keys[i - 1]
            u1, v1 = keys[i]
            t = (u - u0) / (u1 - u0) if u1 > u0 else 1
            return v0 + (v1 - v0) * smooth(t)
    return keys[-1][1]


C_BELLY = hex_rgb("#081d45")
C_BODY = hex_rgb("#0c2d6b")
C_BODY_TOP = hex_rgb("#123f8f")
C_SCALE_BASE = hex_rgb("#1550c0")
C_SCALE_TIP = hex_rgb("#4d9dff")
C_SCALE_BAND = hex_rgb("#a5d6ff")
C_EYE = hex_rgb("#8fd0ff")
C_EYE_RIM = hex_rgb("#0a2556")
C_PUPIL = hex_rgb("#030a17")
C_TONGUE = hex_rgb("#58a6ff")

# ---------------------------------------------------------------- silhouette
# demi-largeur (Y) le long du corps ; u = x / L
WIDTH = [
    (0.000, 0.0025), (0.06, 0.008), (0.18, 0.021), (0.42, 0.034), (0.66, 0.038),
    (0.84, 0.030), (0.905, 0.019), (0.925, 0.0175),  # cou étroit
    (0.952, 0.036),  # arrière de la tête, très large
    (0.978, 0.029), (0.993, 0.019), (1.000, 0.006),
]
# rapport hauteur / largeur : corps presque rond, tête aplatie
HEIGHT_RATIO = [(0.0, 0.95), (0.88, 0.92), (0.925, 0.8), (0.952, 0.5), (1.0, 0.42)]


def half_width(x):
    return interp(WIDTH, x / L)


def half_height(x):
    return half_width(x) * interp(HEIGHT_RATIO, x / L)


def center_z(x):
    # le ventre repose à plat : le centre monte avec le rayon
    return half_height(x) * 0.78


def surface(x, theta):
    """Point de surface. theta = 0 dessus, +-pi/2 flancs, pi dessous."""
    w, h = half_width(x), half_height(x)
    c = math.cos(theta)
    z = h * c * (0.78 if c < 0 else 1.0)  # ventre aplati
    y = w * math.sin(theta)
    return Vector((x, y, center_z(x) + z))


def surface_normal(x, theta, eps=1e-4):
    p = surface(x, theta)
    dx = surface(x + eps, theta) - surface(x - eps, theta)
    dt = surface(x, theta + eps) - surface(x, theta - eps)
    n = dx.cross(dt)
    if n.length < 1e-9:
        n = Vector((0, math.sin(theta), math.cos(theta)))
    n.normalize()
    # orienter vers l'extérieur
    if n.dot(p - Vector((x, 0, center_z(x)))) < 0:
        n = -n
    return n


# ---------------------------------------------------------------- scène
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def new_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def make_material(name, roughness=0.45, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    if emission > 0:
        nt.links.new(attr.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


class Builder:
    """Accumule sommets, faces et couleurs, puis crée un maillage avec un attribut couleur."""

    def __init__(self):
        self.bm = bmesh.new()
        self.colors = []  # couleur par sommet, dans l'ordre de création

    def vert(self, co, color):
        v = self.bm.verts.new(co)
        self.colors.append(color)
        return v

    def face(self, verts, smooth_shade=True):
        try:
            f = self.bm.faces.new(verts)
            f.smooth = smooth_shade
            return f
        except ValueError:
            return None

    def build(self, name, material):
        bm = self.bm
        bm.verts.index_update()
        colors = self.colors
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        attr = me.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
        for i, c in enumerate(colors):
            attr.data[i].color = (c[0], c[1], c[2], 1.0)
        me.color_attributes.active_color = attr
        me.materials.append(material)
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        return ob


# ---------------------------------------------------------------- corps
def body_color(x, theta):
    top = max(0.0, math.cos(theta))
    c = mix(C_BODY, C_BODY_TOP, top * 0.8)
    if math.cos(theta) < -0.35:
        c = mix(c, C_BELLY, 0.85)
    return c


def build_body(b):
    xs = []
    # anneaux plus serrés sur la tête et la queue
    n = 230
    for i in range(n + 1):
        t = i / n
        xs.append(L * (t - 0.06 * math.sin(2 * math.pi * t) / (2 * math.pi)))
    M = 28
    rings = []
    for x in xs[:-1]:
        ring = []
        for j in range(M):
            th = 2 * math.pi * j / M
            ring.append(b.vert(surface(x, th), body_color(x, th)))
        rings.append(ring)
    tip_tail = b.vert(Vector((0.0, 0.0, center_z(0.0))), C_BODY)
    tip_head = b.vert(Vector((L, 0.0, center_z(L))), C_BODY_TOP)
    for i in range(len(rings) - 1):
        r0, r1 = rings[i], rings[i + 1]
        for j in range(M):
            k = (j + 1) % M
            b.face([r0[j], r0[k], r1[k], r1[j]])
    for j in range(M):
        k = (j + 1) % M
        b.face([tip_tail, rings[0][k], rings[0][j]])
        b.face([rings[-1][j], rings[-1][k], tip_head])


# ---------------------------------------------------------------- écailles carénées
def add_scale(b, x0, theta, length, width, lift_deg, color_base, color_tip, keel=0.24):
    """Écaille lancéolée, base vers la tête, pointe vers la queue, relevée vers l'extérieur."""
    p = surface(x0, theta)
    n = surface_normal(x0, theta)
    t = Vector((-1.0, 0.0, 0.0))  # vers la queue
    t = (t - n * t.dot(n)).normalized()
    s = n.cross(t).normalized()  # latéral
    lift = math.tan(math.radians(lift_deg))

    def pt(u, v, up=0.0):
        # u : 0 (base) -> 1 (pointe) ; v : latéral en fraction de largeur
        xu = x0 - u * length
        # suit la surface du corps sous l'écaille, puis s'en écarte
        follow = surface(max(0.0, xu), theta) - p
        return p + follow + s * (v * width) + n * (u * length * lift + up * width - 0.12 * width)

    base_c = b.vert(pt(0.0, 0.0, -0.05), color_base)
    base_l = b.vert(pt(0.06, -0.5), color_base)
    base_r = b.vert(pt(0.06, 0.5), color_base)
    mid_l = b.vert(pt(0.48, -0.40), mix(color_base, color_tip, 0.45))
    mid_r = b.vert(pt(0.48, 0.40), mix(color_base, color_tip, 0.45))
    keel_v = b.vert(pt(0.46, 0.0, keel), mix(color_base, color_tip, 0.7))
    tip = b.vert(pt(1.0, 0.0, keel * 0.35), color_tip)
    for f in (
        (base_c, mid_l, base_l), (base_c, keel_v, mid_l), (base_c, mid_r, keel_v), (base_c, base_r, mid_r),
        (mid_l, keel_v, tip), (keel_v, mid_r, tip),
    ):
        b.face(list(f))


def build_scales(b):
    # dos et flancs, du bout de la queue jusqu'au cou
    ds = 0.0102
    x = 0.035
    row = 0
    while x < 0.93:
        w = half_width(x)
        k = 13 if w > 0.012 else 9
        span = math.radians(118)
        band = (row % 9) in (0, 1)  # bandes transversales claires, discrètes
        for j in range(k):
            offset = 0.5 if row % 2 else 0.0
            th = -span + (2 * span) * (j + offset) / (k - 1 + (1 if offset else 0))
            circumference = math.pi * 2 * w
            width = circumference / (2 * k) * 1.55 * (1.0 - 0.18 * abs(math.sin(th)))
            dorsal = math.cos(th)
            lift = 18 + 16 * max(0.0, dorsal)  # plus hérissé sur le dos
            jitter = random.uniform(-0.06, 0.06)
            tip_col = C_SCALE_BAND if band and dorsal > 0.2 else C_SCALE_TIP
            base_col = mix(C_SCALE_BASE, C_BODY, 0.35 * (1 - max(0.0, dorsal)))
            tip_col = mix(tip_col, base_col, 0.25 * (1 - max(0.0, dorsal)) + jitter)
            add_scale(b, x, th, ds * 2.05, width, lift, base_col, tip_col)
        x += ds * (0.85 if x < 0.2 else 1.0)
        row += 1

    # tête : petites écailles carénées sur le dessus
    x = 0.93
    row = 0
    while x < 0.992:
        w = half_width(x)
        k = 11
        span = math.radians(76)
        for j in range(k):
            offset = 0.5 if row % 2 else 0.0
            th = -span + (2 * span) * (j + offset) / (k - 1 + (1 if offset else 0))
            width = (math.pi * 2 * w) / (2 * k) * 0.95
            add_scale(b, x, th, 0.0105, width, 16, C_SCALE_BASE, mix(C_SCALE_BASE, C_SCALE_TIP, 0.6), keel=0.34)
        x += 0.005
        row += 1

    # écailles supra-oculaires, nettement relevées (cornes discrètes)
    for side in (-1, 1):
        for i, dx in enumerate((0.0, 0.006, 0.012)):
            add_scale(b, 0.974 - dx, side * math.radians(58 + 6 * i), 0.011, 0.0065, 38 - 6 * i,
                      C_SCALE_BASE, C_SCALE_BAND, keel=0.3)


# ---------------------------------------------------------------- yeux
def build_eyes(b):
    xe = 0.971
    for side in (-1, 1):
        th = side * math.radians(56)
        p = surface(xe, th)
        n = surface_normal(xe, th)
        r = 0.0098
        center = p - n * (r * 0.15)
        rings, segs = 10, 16
        verts = []
        for i in range(rings + 1):
            phi = math.pi * i / rings
            ring = []
            for j in range(segs):
                lam = 2 * math.pi * j / segs
                d = Vector((math.sin(phi) * math.cos(lam), math.sin(phi) * math.sin(lam), math.cos(phi)))
                co = center + d * r
                # pupille verticale : fente sombre face à l'extérieur
                lat = d.dot(n)
                # fente allongée dans l'axe du corps : lisible vue de dessus comme de profil
                across = n.cross(Vector((1, 0, 0))).normalized()
                vertical = abs(d.dot(across)) < 0.2 and lat > 0.3
                col = C_PUPIL if vertical else (C_EYE if lat > 0.15 else C_EYE_RIM)
                ring.append(b.vert(co, col))
            verts.append(ring)
        for i in range(rings):
            for j in range(segs):
                k = (j + 1) % segs
                b.face([verts[i][j], verts[i][k], verts[i + 1][k], verts[i + 1][j]])


# ---------------------------------------------------------------- langue
def build_tongue():
    b = Builder()
    th = 0.0016
    x0, x1 = 0.93, 0.968  # rentrée dans la tête au repos
    z = center_z(0.99) - half_height(0.99) * 0.35
    w = 0.0017
    a = [b.vert(Vector((x0, -w, z - th)), C_TONGUE), b.vert(Vector((x0, w, z - th)), C_TONGUE),
         b.vert(Vector((x1, w, z - th)), C_TONGUE), b.vert(Vector((x1, -w, z - th)), C_TONGUE)]
    c = [b.vert(Vector((x0, -w, z + th)), C_TONGUE), b.vert(Vector((x0, w, z + th)), C_TONGUE),
         b.vert(Vector((x1, w, z + th)), C_TONGUE), b.vert(Vector((x1, -w, z + th)), C_TONGUE)]
    for f in ((a[0], a[3], a[2], a[1]), (c[0], c[1], c[2], c[3]), (a[0], a[1], c[1], c[0]),
              (a[1], a[2], c[2], c[1]), (a[3], a[0], c[0], c[3])):
        b.face(list(f))
    # fourche
    for side in (-1, 1):
        base = [a[2], c[2]] if side > 0 else [a[3], c[3]]
        tip_lo = b.vert(Vector((x1 + 0.017, side * 0.0075, z - th * 0.5)), C_TONGUE)
        tip_hi = b.vert(Vector((x1 + 0.017, side * 0.0075, z + th * 0.5)), C_TONGUE)
        inner_lo = b.vert(Vector((x1, 0.0, z - th)), C_TONGUE)
        inner_hi = b.vert(Vector((x1, 0.0, z + th)), C_TONGUE)
        b.face([base[0], inner_lo, tip_lo])
        b.face([base[1], tip_hi, inner_hi])
        b.face([base[0], tip_lo, tip_hi, base[1]])
        b.face([inner_lo, inner_hi, tip_hi, tip_lo])
    return b.build("Tongue", make_material("TongueMat", 0.35, 0.6))


# ---------------------------------------------------------------- construction
body_mat = make_material("AtherisMat", 0.38, 0.04)
b = Builder()
build_body(b)
build_scales(b)
build_eyes(b)
body = b.build("Atheris", body_mat)
tongue = build_tongue()

# normales : le corps reste lisse, les écailles gardent leurs facettes
for ob in (body, tongue):
    ob.data.update()

stats = {ob.name: (len(ob.data.vertices), len(ob.data.polygons)) for ob in (body, tongue)}
print("STATS", stats)

# ---------------------------------------------------------------- export glTF (serpent droit)
glb = os.path.join(OUT_DIR, "atheris-raw.glb")
bpy.ops.object.select_all(action="DESELECT")
for ob in (body, tongue):
    ob.select_set(True)
export_kwargs = dict(filepath=glb, export_format="GLB", use_selection=True, export_yup=True,
                     export_apply=True, export_normals=True, export_materials="EXPORT")
for extra in ({"export_vertex_color": "ACTIVE"}, {"export_colors": True}, {}):
    try:
        bpy.ops.export_scene.gltf(**export_kwargs, **extra)
        print("EXPORT OK", extra)
        break
    except TypeError as err:
        print("export option refusée", extra, err)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), "atheris.blend"))

# ---------------------------------------------------------------- aperçus (serpent courbé, rendu Blender)
curve_data = bpy.data.curves.new("Path", "CURVE")
curve_data.dimensions = "3D"
spline = curve_data.splines.new("BEZIER")
pts = [(-0.05, -0.25, 0), (0.25, 0.12, 0), (0.55, -0.14, 0), (0.85, 0.10, 0), (1.05, 0.02, 0.02)]
spline.bezier_points.add(len(pts) - 1)
for bp, co in zip(spline.bezier_points, pts):
    bp.co = co
    bp.handle_left_type = bp.handle_right_type = "AUTO"
path = bpy.data.objects.new("Path", curve_data)
scene.collection.objects.link(path)
for ob in (body, tongue):
    mod = ob.modifiers.new("Curve", "CURVE")
    mod.object = path
    mod.deform_axis = "POS_X"

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*hex_rgb("#0d1117"), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
scene.world = world


def add_light(name, kind, loc, energy, color, size=0.5):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind == "AREA":
        ld.size = size
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    scene.collection.objects.link(lo)
    direction = Vector((0.5, 0, 0.03)) - Vector(loc)
    lo.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return lo


add_light("Key", "AREA", (0.2, -0.6, 0.9), 30, (0.85, 0.92, 1.0), 0.8)
add_light("Rim", "AREA", (0.9, 0.7, 0.35), 30, (0.35, 0.6, 1.0), 0.6)

cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else ("BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "CYCLES")
if scene.render.engine == "CYCLES":
    scene.cycles.samples = 48
scene.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Standard"
print("ENGINE", scene.render.engine)


def render(name, loc, target, lens, res):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = lens
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = os.path.join(PREVIEW_DIR, name)
    bpy.ops.render.render(write_still=True)


render("vue-dessus.png", (0.5, -0.02, 1.6), (0.5, -0.02, 0), 45, (1400, 700))
deps = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(deps)
head_pts = [ev.matrix_world @ ev.data.vertices[i].co for i, v in enumerate(body.data.vertices) if v.co.x > 0.93]
hc = sum(head_pts, Vector()) / len(head_pts)
print("HEAD", tuple(round(c, 3) for c in hc))
render("tete-3-4.png", (hc.x + 0.11, hc.y - 0.13, hc.z + 0.09), tuple(hc), 50, (1000, 700))
render("profil.png", (0.55, -1.25, 0.18), (0.55, 0, 0.02), 50, (1400, 600))
print("DONE")
