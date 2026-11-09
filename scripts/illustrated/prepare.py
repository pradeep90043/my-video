"""Cut out painted characters for the illustrated engine.

For each character image (painted on white): remove the background (rembg), crop to the figure, and find the neck (the narrowest
row of the figure in its upper part) so the head can be animated on its own. Writes <id>.png (RGBA, cropped) and <id>.json:
  {"w", "h", "neck": y px from the top, "headTop", "feet": bottom y, "cx": horizontal middle of the body near the feet}

  python3 scripts/illustrated/prepare.py in_dir out_dir id1 id2 ...
"""
import json, sys
from pathlib import Path
from PIL import Image
import numpy as np
from rembg import remove, new_session

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-general-use")

for name in sys.argv[3:]:
    img = Image.open(src / f"{name}.png").convert("RGBA")
    cut = remove(img, session=session, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=20)
    a = np.array(cut)[:, :, 3]
    # keep the biggest blob only (stray bits of background, a signature)
    mask = a > 40
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = lab == (int(np.argmax(sizes)) + 1)
        keep = ndimage.binary_dilation(keep, iterations=3)
        arr = np.array(cut); arr[:, :, 3] = np.where(keep, arr[:, :, 3], 0); cut = Image.fromarray(arr)
        a = arr[:, :, 3]
    ys, xs = np.where(a > 40)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = 6
    box = (max(0, x0 - pad), max(0, y0 - pad), min(a.shape[1], x1 + pad), min(a.shape[0], y1 + pad))
    cut = cut.crop(box)
    a = np.array(cut)[:, :, 3] > 40
    h, w = a.shape
    widths = a.sum(axis=1)
    # the neck: below the widest row of the head (top fifth), the narrowest row before the shoulders (a crown's tip is narrow too,
    # so the search starts under the head's widest point)
    top = int(h * 0.04)
    head_w = top + int(np.argmax(widths[top:int(h * 0.2)]))
    hi = max(head_w + 4, int(h * 0.32))
    band = widths[head_w:hi].astype(float)
    band[band < 3] = 1e9
    neck = head_w + int(np.argmin(band))
    rows = np.where(a[int(h * 0.9):, :].any(axis=0))[0]
    cx = float(rows.mean()) if len(rows) else w / 2
    cut.save(dst / f"{name}.png")
    nx = np.where(a[neck])[0]
    neck_x = float(nx.mean()) if len(nx) else w / 2
    meta = {"w": w, "h": h, "neck": neck, "neckX": round(neck_x, 1), "headTop": 0, "feet": h, "cx": round(cx, 1)}
    (dst / f"{name}.json").write_text(json.dumps(meta))
    print(name, meta, flush=True)
