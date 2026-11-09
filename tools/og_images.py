# -*- coding: utf-8 -*-
# 공유 썸네일 1200x630 생성: 흐린 실사 배경 + 글래스 텍스트 박스 + 잘리지 않은 사진 카드
# 사용: OG_FONT=NotoSansKR[wght].ttf python tools/og_images.py <og_data.json> [콘택트시트.png]
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public'); OUT = os.path.join(PUB, 'img', 'og'); os.makedirs(OUT, exist_ok=True)
FONT = os.environ['OG_FONT']; W, H = 1200, 630; YEL = (255, 204, 0); INK = (17, 17, 17)
cache = {}
def font(size, wght):
    k = (size, wght)
    if k not in cache:
        f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([wght]); cache[k] = f
    return cache[k]
def wrap(d, text, f, maxw):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for word in para.split(' '):
            t = (cur + ' ' + word).strip()
            if d.textlength(t, font=f) <= maxw: cur = t
            else:
                if cur: lines.append(cur)
                cur = word
        lines.append(cur)
    return lines
def rounded(size, r):
    m = Image.new('L', (size[0] * 3, size[1] * 3), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] * 3 - 1, size[1] * 3 - 1], r * 3, fill=255)
    return m.resize(size, Image.LANCZOS)
def cover(im, w, h):
    s = max(w / im.width, h / im.height); im = im.resize((round(im.width * s) + 1, round(im.height * s) + 1), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2; return im.crop((x, y, x + w, y + h))
logo = Image.open(os.path.join(PUB, 'img', 'legacy', 'logo_changupcenter_black.png')).convert('RGBA'); logo = logo.crop(logo.getbbox())
if logo.height > 58: logo = logo.resize((round(logo.width * 58 / logo.height), 58), Image.LANCZOS)

def render(it):
    ph = Image.open(os.path.join(PUB, it['photo'])).convert('RGB')
    bg = ImageEnhance.Brightness(cover(ph, W, H).filter(ImageFilter.GaussianBlur(26))).enhance(.5).convert('RGBA')
    # 글래스 박스
    bx, by, bw, bh = 40, 40, 610, 550
    glass = bg.crop((bx, by, bx + bw, by + bh)).filter(ImageFilter.GaussianBlur(14))
    glass = Image.alpha_composite(glass, Image.new('RGBA', (bw, bh), (17, 17, 17, 150)))
    bg.paste(glass, (bx, by), rounded((bw, bh), 26))
    d = ImageDraw.Draw(bg); d.rounded_rectangle([bx, by, bx + bw - 1, by + bh - 1], 26, outline=(255, 255, 255, 70), width=2)
    # 사진 카드 (전체 표시)
    cw = 490; ch = min(round(cw * ph.height / ph.width), 500); cw = round(ch * ph.width / ph.height)
    card = ph.resize((cw, ch), Image.LANCZOS).convert('RGBA'); cx = 40 + bw + (W - 40 - bw - 40 - cw + 40) // 2 - 10; cy = (H - ch) // 2
    bg.paste(card, (cx, cy), rounded((cw, ch), 20))
    # 텍스트
    x = bx + 40; maxw = bw - 80; y = by + 36
    chipw, chiph = logo.width + 32, logo.height + 18
    chip = Image.new('RGBA', (chipw, chiph), (255, 255, 255, 255)); chip.paste(logo, (16, 9), logo); bg.paste(chip, (x, y), rounded((chipw, chiph), 12)); y += chiph + 30
    d = ImageDraw.Draw(bg)
    d.text((x, y), it['label'], font=font(28, 700), fill=YEL); y += 50
    want = it['title'].count('\n') + 1  # 지정 줄바꿈이 없으면 한 줄로 맞춤
    for size in (76, 70, 64, 58, 52, 46):
        f = font(size, 900); lines = wrap(d, it['title'], f, maxw)
        if len(lines) <= want and all(d.textlength(l, font=f) <= maxw for l in lines): break
    for l in lines: d.text((x, y), l, font=f, fill=(255, 255, 255)); y += round(size * 1.24)
    y += 10; fs = font(30, 500)
    for l in wrap(d, it['sub'], fs, maxw)[:1 if want > 1 else 2]: d.text((x, y), l, font=fs, fill=(235, 235, 235)); y += 44
    # 하단 전화
    t = '창업상담 010-5548-6188'; f2 = font(30, 800); tw = d.textlength(t, font=f2); ph2 = 62; py = by + bh - 36 - ph2
    d.rounded_rectangle([x, py, x + tw + 48, py + ph2], 12, fill=YEL); d.text((x + 24, py + 9), t, font=f2, fill=INK)
    bg.convert('RGB').save(os.path.join(OUT, it['key'] + '.jpg'), quality=86, optimize=True, progressive=True)

items = json.load(open(sys.argv[1], encoding='utf-8'))
for it in items: render(it)
print(len(items), 'written')
if len(sys.argv) > 2:
    cols = 5; tw, th = 300, 158; rows = (len(items) + cols - 1) // cols; s = Image.new('RGB', (cols * tw, rows * th), 'white')
    for i, it in enumerate(items):
        s.paste(Image.open(os.path.join(OUT, it['key'] + '.jpg')).resize((tw - 4, th - 4)), ((i % cols) * tw + 2, (i // cols) * th + 2))
    s.save(sys.argv[2])
