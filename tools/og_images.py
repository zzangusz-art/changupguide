# -*- coding: utf-8 -*-
# 공유 썸네일 1200x630 생성: 밝은 스튜디오 배경 + 로고·문구 + 잘리지 않은 사진 카드
# 사용: OG_FONT=NotoSansKR[wght].ttf python tools/og_images.py <og_data.json> [콘택트시트.png]
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stage import stage

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
logo = Image.open(os.path.join(PUB, 'img', 'brand', 'logo.png')).convert('RGBA'); logo = logo.crop(logo.getbbox())
if logo.height > 58: logo = logo.resize((round(logo.width * 58 / logo.height), 58), Image.LANCZOS)

def render(it):
    ph = Image.open(os.path.join(PUB, it['photo'])).convert('RGB')
    bg = stage(W, H, seed=sum(map(ord, it['key'])) % 97, split=.72).convert('RGBA')
    # 사진 카드 (전체 표시, 테이블 위에 놓인 느낌)
    cw = 520; ch = round(cw * ph.height / ph.width)
    if ch > 450: ch = 450; cw = round(ch * ph.width / ph.height)
    card = ph.resize((cw, ch), Image.LANCZOS).convert('RGBA'); cx = W - 56 - cw; cy = (H - ch) // 2 - 6
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0)); sh.paste((70, 45, 10, 120), (cx + 10, cy + 22), rounded((cw, ch), 18)); sh = sh.filter(ImageFilter.GaussianBlur(22)); bg = Image.alpha_composite(bg, sh)
    bg.paste(card, (cx, cy), rounded((cw, ch), 18))
    # 로고와 문구
    x = 60; maxw = cx - x - 36; d = ImageDraw.Draw(bg); bg.paste(logo, (x, 48), logo)
    y = 158; d.text((x, y), it['label'], font=font(26, 500), fill=(128, 92, 20)); y += 46
    want = it['title'].count('\n') + 1
    for size in (64, 58, 52, 46, 42, 38):
        f = font(size, 700); lines = wrap(d, it['title'], f, maxw)
        if len(lines) <= want and all(d.textlength(l, font=f) <= maxw for l in lines): break
    for l in lines: d.text((x, y), l, font=f, fill=(28, 24, 18)); y += round(size * 1.28)
    y += 8; fs = font(27, 400)
    for l in wrap(d, it['sub'], fs, maxw)[:2]: d.text((x, y), l, font=fs, fill=(74, 60, 34)); y += 40
    d.text((x, H - 66), '창업상담 010-5548-6188', font=font(26, 600), fill=(28, 24, 18))
    bg.convert('RGB').save(os.path.join(OUT, it['key'] + '.jpg'), quality=88, optimize=True, progressive=True)

items = json.load(open(sys.argv[1], encoding='utf-8'))
for it in items: render(it)
print(len(items), 'written')
if len(sys.argv) > 2:
    cols = 5; tw, th = 300, 158; rows = (len(items) + cols - 1) // cols; s = Image.new('RGB', (cols * tw, rows * th), 'white')
    for i, it in enumerate(items):
        s.paste(Image.open(os.path.join(OUT, it['key'] + '.jpg')).resize((tw - 4, th - 4)), ((i % cols) * tw + 2, (i // cols) * th + 2))
    s.save(sys.argv[2])
