from PIL import Image, ImageDraw, ImageFilter
import math

def make(size):
    S = size * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # rounded background with a vertical gradient
    bg = Image.new("RGB", (S, S), (4, 22, 27))
    grad = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        r = int(5 + 24 * t**1.4)
        g = int(29 + 62 * t**1.4)
        b = int(36 + 62 * t**1.4)
        grad.line([(0, y), (S, y)], fill=(r, g, b))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.235), fill=255)
    img.paste(bg, (0, 0), mask)

    # soft mint glow behind the glass
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([S * 0.16, S * 0.34, S * 0.84, S * 0.98], fill=(56, 226, 171, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.09))
    img.alpha_composite(glow)

    # the glass
    left, right = S * 0.31, S * 0.69
    top, bottom = S * 0.2, S * 0.82
    glass = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    g2 = ImageDraw.Draw(glass)
    g2.rounded_rectangle([left, top, right, bottom], radius=S * 0.1, fill=(255, 255, 255, 40))
    img.alpha_composite(glass)

    # liquid inside, with a sloshing surface
    surface_y = bottom - (bottom - top) * 0.62
    liquid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(liquid)
    pts = [(left, bottom)]
    n = 40
    for i in range(n + 1):
        x = left + (right - left) * i / n
        wave = math.sin(i / n * math.pi * 1.4) * S * 0.022
        pts.append((x, surface_y + wave))
    pts.append((right, bottom))
    ld.polygon(pts, fill=(60, 233, 176, 255))
    # darker band at the bottom for depth
    ld.rectangle([left, bottom - (bottom - surface_y) * 0.42, right, bottom], fill=(12, 122, 100, 190))
    # mask the liquid to the glass shape
    clip = Image.new("L", (S, S), 0)
    ImageDraw.Draw(clip).rounded_rectangle([left, top, right, bottom], radius=S * 0.1, fill=255)
    img.paste(liquid, (0, 0), Image.composite(clip, Image.new("L", (S, S), 0), liquid.split()[3]))

    # surface highlight line
    hl = ImageDraw.Draw(img)
    hl.line([(left + S * 0.02, surface_y + S * 0.006), (right - S * 0.02, surface_y - S * 0.01)],
            fill=(255, 255, 255, 210), width=int(S * 0.012))

    # glass rim and inner streak
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([left, top, right, bottom], radius=S * 0.1, outline=(255, 255, 255, 150), width=int(S * 0.008))
    d.rounded_rectangle([left + S * 0.055, top + S * 0.07, left + S * 0.085, bottom - S * 0.16],
                        radius=S * 0.02, fill=(255, 255, 255, 90))

    return img.resize((size, size), Image.LANCZOS)

make(512).save("public/icon-512.png")
make(192).save("public/icon-192.png")
print("icons written")
