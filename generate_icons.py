"""Generate PWA icons (run once). Requires Pillow."""
from PIL import Image, ImageDraw

BG = (79, 70, 229)        # indigo
BG2 = (139, 92, 246)      # violet
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size, padding_ratio=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = int(size * padding_ratio)
    box = (pad, pad, size - pad, size - pad)
    inner = box[2] - box[0]
    radius = int(inner * 0.22)

    # vertical gradient background
    for y in range(box[1], box[3]):
        t = (y - box[1]) / max(1, inner)
        d.line([(box[0], y), (box[2], y)], fill=lerp(BG, BG2, t))

    # round the corners by masking
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(box, radius=radius, fill=255)
    img.putalpha(mask)

    # checkmark
    cx0, cy0 = box[0] + inner * 0.30, box[1] + inner * 0.52
    cx1, cy1 = box[0] + inner * 0.44, box[1] + inner * 0.68
    cx2, cy2 = box[0] + inner * 0.72, box[1] + inner * 0.34
    lw = max(3, int(inner * 0.09))
    d.line([(cx0, cy0), (cx1, cy1), (cx2, cy2)], fill=WHITE, width=lw, joint="curve")
    # rounded caps
    r = lw / 2
    for (px, py) in [(cx0, cy0), (cx2, cy2)]:
        d.ellipse([px - r, py - r, px + r, py + r], fill=WHITE)

    return img


def main():
    draw_icon(180).save("icons/icon-180.png")
    draw_icon(192).save("icons/icon-192.png")
    draw_icon(512).save("icons/icon-512.png")
    draw_icon(512, padding_ratio=0.12).save("icons/icon-maskable-512.png")
    # simple favicon
    draw_icon(64).save("icons/favicon-64.png")
    print("icons written")


if __name__ == "__main__":
    main()
