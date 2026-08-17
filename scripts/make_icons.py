"""Generate app icons for Basis from the design's own mark (dark bg, green line + dot).
Run with: pip install pillow && python3 scripts/make_icons.py
"""
from PIL import Image, ImageDraw

BG = (0, 0, 0, 255)
GREEN = (126, 224, 168, 255)  # #7ee0a8, matches the .dc.html thumbnail mark


def make(size, path, radius_frac=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_frac)
    if r:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    else:
        d.rectangle([0, 0, size - 1, size - 1], fill=BG)

    # polyline points scaled from the 100x100 source viewBox: 30,66 43,54 52,58 70,34
    pts = [(30, 66), (43, 54), (52, 58), (70, 34)]
    scale = size / 100.0
    scaled = [(x * scale, y * scale) for x, y in pts]
    width = max(2, round(4 * scale))
    d.line(scaled, fill=GREEN, width=width, joint="curve")
    # round caps at each vertex
    for x, y in scaled:
        rr = width / 2
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=GREEN)
    # accent dot at the middle vertex (52,58)
    cx, cy = 52 * scale, 58 * scale
    rr = 4.5 * scale
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=GREEN)

    img.convert("RGB").save(path, "PNG")


make(180, "public/apple-touch-icon.png")
make(192, "public/icon-192.png")
make(512, "public/icon-512.png")
make(512, "public/icon-512-maskable.png", radius_frac=0.0)
make(32, "public/favicon-32.png")
make(16, "public/favicon-16.png")
print("icons written")
