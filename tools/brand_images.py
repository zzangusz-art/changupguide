# -*- coding: utf-8 -*-
"""OG 이미지(1200x630)·로고 PNG·파비콘 생성 — PIL + 시스템 한글 폰트(맑은 고딕).
usage: python -X utf8 tools/brand_images.py public
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1] if len(sys.argv) > 1 else 'public'
FONT = None
for cand in [r'C:\Windows\Fonts\malgunbd.ttf', r'C:\Windows\Fonts\NotoSansKR-Black.ttf', r'C:\Windows\Fonts\malgun.ttf', '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc']:
    if os.path.exists(cand): FONT = cand; break
def font(sz):
    return ImageFont.truetype(FONT, sz) if FONT else ImageFont.load_default()
YEL, RED, BLUE, INK, CREAM = (255, 204, 0), (255, 61, 46), (45, 76, 255), (20, 18, 31), (255, 247, 224)

def mark(d, x, y, s):
    d.polygon([(x, y + s), (x + s / 2, y), (x + s, y + s)], fill=YEL, outline=INK, width=max(2, s // 12))
    d.ellipse([x + s * .36, y + s * .5, x + s * .64, y + s * .78], fill=BLUE, outline=INK, width=max(2, s // 16))
    d.rounded_rectangle([x + s * .2, y + s * 1.08, x + s * .8, y + s * 1.22], radius=s // 10, fill=RED)

def og():
    im = Image.new('RGB', (1200, 630), YEL); d = ImageDraw.Draw(im)
    for yy in range(0, 630, 26):
        for xx in range(0, 1200, 26): d.ellipse([xx, yy, xx + 4, yy + 4], fill=(240, 190, 0))
    d.rounded_rectangle([40, 40, 1160, 590], radius=36, fill=CREAM, outline=INK, width=6)
    d.rounded_rectangle([52, 52, 1172, 602], radius=36, outline=INK, width=6)
    try:
        lg = Image.open(os.path.join(out, 'img', 'legacy', 'logo_changupcenter_black.png')).convert('RGBA'); lg = lg.crop(lg.getbbox()); r = 150 / lg.size[1]; lg = lg.resize((int(lg.size[0] * r), 150), Image.LANCZOS); im.paste(lg, (90, 86), lg)
    except Exception as e:
        d.text((90, 86), '창업가이드', font=font(96), fill=INK)
    d.text((92, 236), '창업전문포털  ·  창업 컨설팅', font=font(30), fill=(107, 104, 128))
    d.text((90, 270), '양도양수 창업 매물', font=font(76), fill=INK)
    d.text((90, 360), '지역 · 브랜드 · 예산별 비교', font=font(60), fill=RED)
    # 스티커
    for (x, y, t, col, fc) in [(760, 440, '월매출 공개', RED, 'w'), (940, 400, '권리금 공개', BLUE, 'w'), (820, 510, '담당자 바로 통화', INK, 'y')]:
        f = font(34); w = d.textlength(t, font=f)
        d.rounded_rectangle([x - 18, y - 10, x + w + 18, y + 50], radius=30, fill=col, outline=INK, width=5)
        d.text((x, y), t, font=f, fill=(255, 255, 255) if fc == 'w' else YEL)
    d.text((90, 470), '24시간 창업상담 010-5548-6188', font=font(40), fill=INK)
    im.save(os.path.join(out, 'og.png'), optimize=True)

def logo():
    pass  # logo.png / favicon.ico / apple-touch-icon.png 은 기존 창업가이드 로고에서 생성 (public/img/legacy)

def post_cover(title, sub, name, theme='yellow'):
    bg = {'yellow': YEL, 'red': RED, 'blue': BLUE}[theme]
    fg = INK if theme == 'yellow' else (255, 255, 255)
    im = Image.new('RGB', (1200, 675), bg); d = ImageDraw.Draw(im)
    for yy in range(0, 675, 30):
        for xx in range(0, 1200, 30): d.ellipse([xx, yy, xx + 5, yy + 5], fill=tuple(max(0, c - 30) for c in bg))
    d.rounded_rectangle([50, 50, 1150, 625], radius=34, fill=CREAM if theme == 'yellow' else (255, 255, 255), outline=INK, width=6)
    # 타이틀 줄바꿈
    f = font(58); lines = []; cur = ''
    for ch in title:
        if d.textlength(cur + ch, font=f) > 1000: lines.append(cur); cur = ch
        else: cur += ch
    if cur: lines.append(cur)
    y = 110
    for ln in lines[:4]: d.text((90, y), ln, font=f, fill=INK); y += 74
    d.text((90, y + 14), sub, font=font(32), fill=RED)
    mark(d, 90, 520, 60); d.text((170, 528), '창업가이드 창업 인사이트', font=font(34), fill=INK)
    im.save(name, 'JPEG', quality=86, optimize=True)

if __name__ == '__main__':
    os.makedirs(out, exist_ok=True); og(); logo(); print('ok', FONT)
