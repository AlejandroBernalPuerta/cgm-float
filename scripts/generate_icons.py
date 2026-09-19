"""Genera los iconos placeholder necesarios para compilar el bundle de Tauri.
Ejecutar una sola vez: python scripts/generate_icons.py
Sustituye estos iconos por el branding real antes de publicar la app.
"""
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "src-tauri/icons"
BG_COLOR = (16, 132, 92, 255)   # verde "en rango" como identidad visual
FG_COLOR = (255, 255, 255, 255)


def make_master(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = size * 0.06
    draw.ellipse([margin, margin, size - margin, size - margin], fill=BG_COLOR)
    text = "CGM"
    try:
        font = ImageFont.truetype("arialbd.ttf", int(size * 0.30))
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]), text, font=font, fill=FG_COLOR)
    return img


master = make_master(512)
master.save(f"{OUT_DIR}/icon.png")

for size, name in [(32, "32x32.png"), (128, "128x128.png"), (256, "128x128@2x.png")]:
    master.resize((size, size), Image.LANCZOS).save(f"{OUT_DIR}/{name}")

ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
master.save(f"{OUT_DIR}/icon.ico", sizes=ico_sizes)

print("Iconos generados en", OUT_DIR)
