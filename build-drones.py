"""Build the hologram spritesheet for scene 03.

Movement: Music Core stage cam (stage-cam.mp4, t = video - 68s),
  1:10.6-1:13.0 — the full-body choreography the MV cuts away from.
Look: "Kill This Love" MV chorus outfits (mv-chorus.mp4, t = video - 70s),
  1:13-1:15 — white/black street fits on the ruin set.

The stage segmentation is the master silhouette (movement). MV frames
supply outfit colours where poses overlap; everywhere else we grade the
stage red costumes into the MV palette so the figure never breaks apart.
"""
import os
import subprocess
import glob
import shutil
from PIL import Image
from rembg import remove, new_session

STAGE = "stage-cam.mp4"
MV = "mv-chorus.mp4"
TILE_W, TILE_H = 512, 288
COLS, ROWS = 8, 6
COUNT = COLS * ROWS

shutil.rmtree("frames-cut", ignore_errors=True)
os.makedirs("frames-cut", exist_ok=True)

def extract(src, start, dur, fps, prefix, vf_extra=""):
    vf = f"fps={fps},scale={TILE_W}:{TILE_H}"
    if vf_extra:
        vf = vf_extra + "," + vf
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start), "-t", str(dur), "-i", src,
        "-vf", vf,
        f"frames-cut/{prefix}%02d.png", "-loglevel", "error",
    ], check=True)

stage_vf = f"crop=iw:ih*0.78:0:ih*0.06,scale={TILE_W}:224,pad={TILE_W}:{TILE_H}:0:32:black"
extract(STAGE, 2.55, 2.45, 18, "s", stage_vf)
extract(MV, 3.00, 2.45, 18, "m")

s_paths = sorted(glob.glob("frames-cut/s*.png"))
m_paths = sorted(glob.glob("frames-cut/m*.png"))
n = min(len(s_paths), len(m_paths), COUNT - 1)
print(f"pairing {n} stage+MV frames")

session = new_session("isnet-general-use")
sheet = Image.new("RGBA", (TILE_W * COLS, TILE_H * ROWS), (0, 0, 0, 0))
cut_cache = {}


def is_skin(r, g, b):
    return r > 80 and g > 50 and b > 40 and r >= g and r >= b and (r - g) < 85


def is_costume(r, g, b):
    return r > 65 and r > g * 1.45 and r > b * 1.35


def mv_grade(r, g, b, a, y, x):
    ny = y / TILE_H
    col = int((x / TILE_W) * 4) % 4
    if ny < 0.36:
        if col == 1:
            return (246, 248, 252, a)
        if col == 2:
            return (198, 204, 214, a)
        return (234, 236, 242, a)
    if ny < 0.54:
        if ((x // 6 + y // 5) % 5) < 2:
            return (238, 240, 246, a)
        return (22, 24, 30, a)
    return (16, 18, 24, a)


def nearest_mv_color(mv, x, y, radius=6):
    """Sample MV outfit colour near (x,y) when poses don't line up."""
    best = None
    best_d = radius * radius + 1
    mp = mv.load()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= TILE_W or ny >= TILE_H:
                continue
            mr, mg, mb, ma = mp[nx, ny]
            if ma < 100 or is_skin(mr, mg, mb):
                continue
            d = dx * dx + dy * dy
            if d < best_d:
                best_d = d
                best = (mr, mg, mb)
    return best


def segment(path):
    if path in cut_cache:
        return cut_cache[path]
    img = Image.open(path).convert("RGB")
    cut = remove(img, session=session)
    px = cut.load()
    for y in range(TILE_H):
        for x in range(TILE_W):
            r, g, b, a = px[x, y]
            if a < 100:
                px[x, y] = (r, g, b, 0)
    cut_cache[path] = cut
    return cut


def paint_outfit(stage_path, mv_path):
    stage = segment(stage_path)
    mv = segment(mv_path)
    out = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    sp, op = stage.load(), out.load()
    for y in range(TILE_H):
        for x in range(TILE_W):
            sr, sg, sb, sa = sp[x, y]
            if sa < 100:
                continue
            if is_skin(sr, sg, sb):
                op[x, y] = (sr, sg, sb, sa)
            elif is_costume(sr, sg, sb):
                mv_col = nearest_mv_color(mv, x, y)
                if mv_col:
                    op[x, y] = (mv_col[0], mv_col[1], mv_col[2], sa)
                else:
                    op[x, y] = mv_grade(sr, sg, sb, sa, y, x)
            else:
                op[x, y] = (sr, sg, sb, sa)
    return out

frames = []
for i in range(n):
    frames.append(paint_outfit(s_paths[i], m_paths[i]))
HOLD = 34 if len(frames) > 34 else len(frames) - 1
frames += [frames[HOLD]] * (COUNT - len(frames))

for i, cut in enumerate(frames):
    sheet.paste(cut, ((i % COLS) * TILE_W, (i // COLS) * TILE_H))
    print(f"tile {i + 1}/{COUNT} done")

sheet.save("assets/kts-drones.png", optimize=True)
print("saved assets/kts-drones.png")
