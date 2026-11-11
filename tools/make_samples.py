# -*- coding: utf-8 -*-
# 예시(샘플) 매물 이미지 생성 — 실제 매장 사진이 아님을 이미지 안에 표시
# 사용: OG_FONT=NotoSansKR[wght].ttf python tools/make_samples.py   → public/img/sample/*.jpg
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stage import stage
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'img', 'sample'); os.makedirs(OUT, exist_ok=True)
FONT = os.environ['OG_FONT']; W, H = 1200, 800
def font(size, wght):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([wght]); return f

# (파일명, 업종 표시, 배경 톤, 강조색, 그림)
ITEMS = [
    ('cafe', '카페', ((250, 244, 236), (240, 226, 206)), (120, 78, 48), 'cup'),
    ('bakery', '베이커리', ((252, 246, 232), (244, 228, 196)), (176, 112, 40), 'bread'),
    ('burger', '패스트푸드', ((253, 243, 230), (247, 222, 190)), (214, 74, 40), 'burger'),
    ('chicken', '치킨', ((255, 246, 226), (250, 226, 170)), (196, 120, 20), 'drumstick'),
    ('pub', '맥주·호프', ((246, 242, 228), (232, 214, 160)), (170, 120, 10), 'beer'),
    ('korean', '한식', ((246, 244, 238), (226, 222, 206)), (90, 110, 70), 'bowl'),
    ('bunsik', '분식', ((255, 240, 236), (248, 210, 196)), (210, 50, 50), 'bowl'),
    ('golf', '스크린골프', ((236, 244, 238), (204, 226, 210)), (40, 120, 70), 'golf'),
    ('retail', '판매·소매', ((244, 240, 236), (226, 216, 206)), (130, 40, 40), 'bag'),
]

def draw_icon(d, kind, cx, cy, s, col):
    w = max(6, s // 14); light = tuple(min(255, c + 150) for c in col)
    if kind == 'cup':
        d.rounded_rectangle([cx - s * .32, cy - s * .30, cx + s * .26, cy + s * .34], s * .08, fill=light, outline=col, width=w)
        d.arc([cx + s * .12, cy - s * .16, cx + s * .46, cy + s * .16], -90, 90, fill=col, width=w)
        for i in range(3): x = cx - s * .18 + i * s * .14; d.arc([x - s * .05, cy - s * .62, x + s * .05, cy - s * .38], 100, 260, fill=col, width=w // 2 + 2)
    elif kind == 'bread':
        d.rounded_rectangle([cx - s * .44, cy - s * .22, cx + s * .44, cy + s * .30], s * .2, fill=light, outline=col, width=w)
        for i in range(3): x = cx - s * .2 + i * s * .2; d.line([x - s * .06, cy - s * .12, x + s * .06, cy + s * .12], fill=col, width=w)
    elif kind == 'burger':
        d.pieslice([cx - s * .42, cy - s * .44, cx + s * .42, cy + s * .2], 180, 360, fill=light, outline=col, width=w)
        d.rounded_rectangle([cx - s * .46, cy - s * .10, cx + s * .46, cy + s * .04], s * .05, fill=col)
        d.rounded_rectangle([cx - s * .42, cy + s * .08, cx + s * .42, cy + s * .26], s * .08, fill=light, outline=col, width=w)
    elif kind == 'drumstick':
        d.line([cx - s * .02, cy - s * .02, cx + s * .30, cy + s * .30], fill=col, width=int(w * 2.4))
        for ox, oy in ((.26, .40), (.40, .26)): d.ellipse([cx + s * (ox - .08), cy + s * (oy - .08), cx + s * (ox + .08), cy + s * (oy + .08)], fill=light, outline=col, width=w // 2 + 2)
        d.chord([cx - s * .46, cy - s * .46, cx + s * .12, cy + s * .12], 0, 360, fill=light, outline=col, width=w)
        for i in range(3): d.arc([cx - s * (.36 - i * .1), cy - s * (.36 - i * .1), cx + s * (.02 - i * .02), cy + s * (.02 - i * .02)], 200, 250, fill=col, width=w // 2 + 2)
    elif kind == 'beer':
        d.rounded_rectangle([cx - s * .28, cy - s * .30, cx + s * .18, cy + s * .40], s * .05, fill=light, outline=col, width=w)
        d.arc([cx + s * .06, cy - s * .16, cx + s * .40, cy + s * .2], -90, 90, fill=col, width=w)
        for i in range(3): x = cx - s * .2 + i * s * .14; d.ellipse([x - s * .1, cy - s * .44, x + s * .1, cy - s * .24], fill='white', outline=col, width=w // 2)
    elif kind == 'bowl':
        d.pieslice([cx - s * .46, cy - s * .38, cx + s * .46, cy + s * .42], 0, 180, fill=light, outline=col, width=w)
        d.line([cx - s * .5, cy + s * .02, cx + s * .5, cy + s * .02], fill=col, width=w)
        d.line([cx + s * .05, cy - s * .44, cx + s * .34, cy - s * .02], fill=col, width=w // 2 + 2); d.line([cx + s * .16, cy - s * .48, cx + s * .40, cy - s * .04], fill=col, width=w // 2 + 2)
    elif kind == 'golf':
        d.line([cx + s * .04, cy - s * .46, cx + s * .04, cy + s * .30], fill=col, width=w)
        d.polygon([(cx + s * .04, cy - s * .46), (cx + s * .38, cy - s * .34), (cx + s * .04, cy - s * .22)], fill=col)
        d.ellipse([cx - s * .44, cy + s * .20, cx + s * .44, cy + s * .42], fill=light, outline=col, width=w)
        d.ellipse([cx - s * .30, cy + s * .08, cx - s * .14, cy + s * .24], fill='white', outline=col, width=w // 2)
    elif kind == 'bag':
        d.rounded_rectangle([cx - s * .36, cy - s * .20, cx + s * .36, cy + s * .42], s * .06, fill=light, outline=col, width=w)
        d.arc([cx - s * .18, cy - s * .46, cx + s * .18, cy - s * .02], 180, 360, fill=col, width=w)

for key, label, (bg1, bg2), col, icon in ITEMS:
    im = stage(W, H, wall=bg1, wall2=bg1, table=bg2, table2=bg2, split=.70, seed=sum(map(ord, key)) % 50).convert('RGBA')
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ds = ImageDraw.Draw(sh); ds.ellipse([W / 2 - 230, 520, W / 2 + 230, 590], fill=(60, 40, 10, 70)); im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(im); draw_icon(d, icon, W / 2, 330, 400, col)
    f = font(64, 800); t = label; d.text(((W - d.textlength(t, font=f)) / 2, 600), t, font=f, fill=(40, 32, 22))
    chip = '예시 이미지'; fc = font(30, 700); tw = d.textlength(chip, font=fc)
    x0 = W - 40 - tw - 44; d.rounded_rectangle([x0, 36, W - 40, 92], 28, fill=(17, 17, 17)); d.text((x0 + 22, 44), chip, font=fc, fill=(255, 204, 0))
    im.convert('RGB').save(os.path.join(OUT, key + '.jpg'), quality=86, optimize=True, progressive=True)
print('samples', len(ITEMS))
