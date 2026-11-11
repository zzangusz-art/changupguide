# -*- coding: utf-8 -*-
# 창업가이드 로고 세트 생성: 마크(노란 라운드 사각 + 우상향 화살표) + 워드마크(창업 가이드)
# 사용: OG_FONT=NotoSansKR[wght].ttf python tools/make_logo.py
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stage import stage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public'); BR = os.path.join(PUB, 'img', 'brand'); os.makedirs(BR, exist_ok=True)
FONT = os.environ['OG_FONT']; YEL = (255, 204, 0); INK = (17, 17, 17)

def font(size, wght):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([wght]); return f

def mark(size, bg=YEL, fg=INK, radius=.25):
    """40x40 기준 SVG와 같은 형태를 4배 크기로 그려 축소 (가장자리 매끈하게)"""
    S = size * 4; k = S / 40; im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], round(S * radius), fill=bg)
    w = round(4.4 * k)
    def line(pts):
        pts = [(x * k, y * k) for x, y in pts]; d.line(pts, fill=fg, width=w, joint='curve')
        for x, y in (pts[0], pts[-1]): d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=fg)
    line([(11.5, 28.5), (27, 13)]); line([(16.5, 13), (27, 13), (27, 23.5)])
    return im.resize((size, size), Image.LANCZOS)

def wordmark(h, color=INK, with_mark=True):
    f1 = font(round(h * .78), 500); f2 = font(round(h * .78), 900)
    tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    w1 = tmp.textlength('창업', font=f1); w2 = tmp.textlength('가이드', font=f2)
    mw = h if with_mark else 0; gap = round(h * .26) if with_mark else 0
    W = round(mw + gap + w1 + w2 + h * .06) + 4
    im = Image.new('RGBA', (W, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if with_mark: im.paste(mark(h), (0, 0), mark(h))
    x = mw + gap; bb = d.textbbox((0, 0), '창업가이드', font=f2); ty = (h - (bb[3] - bb[1])) / 2 - bb[1]
    d.text((x, ty), '창업', font=f1, fill=color); d.text((x + w1 + h * .02, ty), '가이드', font=f2, fill=color)
    return im

if __name__ == '__main__':
    mark(512).save(os.path.join(PUB, 'logo.png'))
    mark(180, radius=.22).save(os.path.join(PUB, 'apple-touch-icon.png'))
    mark(256).save(os.path.join(BR, 'mark.png'))
    m = mark(64); m.save(os.path.join(PUB, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    wordmark(120).save(os.path.join(BR, 'logo.png'))
    wordmark(120, color=(255, 255, 255)).save(os.path.join(BR, 'logo-white.png'))
    # 기본 공유 이미지 og.png
    W, H = 1200, 630; bg = stage(W, H, seed=7, split=.72).convert('RGBA'); d = ImageDraw.Draw(bg)
    wm = wordmark(132); bg.paste(wm, ((W - wm.width) // 2, 170), wm)
    f = font(38, 500); t = '검증된 양도양수 창업 매물 · 담당 전문가 직접 상담'
    d.text(((W - d.textlength(t, font=f)) / 2, 350), t, font=f, fill=(60, 48, 28))
    f = font(30, 700); t = '서울 · 경기 · 인천 창업 컨설팅'
    d.text(((W - d.textlength(t, font=f)) / 2, 420), t, font=f, fill=(128, 92, 20))
    bg.convert('RGB').save(os.path.join(PUB, 'og.png'), optimize=True)
    print('ok', wm.size)
