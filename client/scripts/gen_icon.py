# -*- coding: utf-8 -*-
"""scripts/gen_icon.py — 生成 MEditor 应用图标源图(app-icon.png 1024x1024)

输出到 src-tauri/icons/app-icon.png,之后用 `npx tauri icon` 派生全部尺寸。
设计:深色圆角底 + 白色粗体 M。
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "src-tauri" / "icons" / "app-icon.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

SIZE = 1024
RADIUS = 200

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 背景:靛蓝圆角矩形,轻微纵向渐变
top = (47, 78, 168)
bottom = (30, 47, 108)
grad = Image.new("RGBA", (1, SIZE))
for y in range(SIZE):
    t = y / (SIZE - 1)
    grad.putpixel((0, y), (
        round(top[0] + (bottom[0] - top[0]) * t),
        round(top[1] + (bottom[1] - top[1]) * t),
        round(top[2] + (bottom[2] - top[2]) * t),
        255,
    ))
grad = grad.resize((SIZE, SIZE))
mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=RADIUS, fill=255)
img.paste(grad, (0, 0), mask)

# 白色 M(用粗笔画绘制:两竖 + 两斜)
def find_font():
    candidates = [
        "C:/Windows/Fonts/seguisb.ttf",   # Segoe UI Semibold
        "C:/Windows/Fonts/segoeuib.ttf",  # Segoe UI Bold
        "C:/Windows/Fonts/msyhbd.ttc",    # 微软雅黑 Bold
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None

font_path = find_font()
if font_path:
    font = ImageFont.truetype(font_path, 640)
    bbox = draw.textbbox((0, 0), "M", font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(((SIZE - w) / 2 - bbox[0], (SIZE - h) / 2 - bbox[1]), "M",
              font=font, fill=(255, 255, 255, 255))
else:
    # 无字体时退化为几何 M
    stroke = 120
    x0, x1, y0, y1 = 260, 764, 280, 744
    mid = (x0 + x1) // 2
    for pts in [((x0, y0), (x0, y1)), ((x1, y0), (x1, y1)),
                ((x0, y0 + 20), (mid, y1 - 190)), ((x1, y0 + 20), (mid, y1 - 190))]:
        draw.line(pts, fill=(255, 255, 255, 255), width=stroke)

img.save(OUT)
print(f"icon written: {OUT}")
