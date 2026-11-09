# -*- coding: utf-8 -*-
# 밝은 벽 + 색 테이블 + 나뭇잎 그림자 + 사선 빛의 스튜디오 배경 (썸네일·히어로 공용)
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def _lerp(a, b, t): return np.array(a)[None, None, :] * (1 - t[..., None]) + np.array(b)[None, None, :] * t[..., None]

def stage(w, h, wall=(247, 239, 224), wall2=(236, 222, 196), table=(226, 160, 28), table2=(250, 205, 60), split=.62, seed=7):
    yy, xx = np.mgrid[0:h, 0:w].astype(float); ty = split * h
    u = np.clip(xx / w * .55 + yy / ty * .45, 0, 1); arr = _lerp(wall, wall2, u)
    v = np.clip(xx / w * .85 + (yy - ty) / (h - ty) * -.15 + .1, 0, 1); tb = _lerp(table, table2, v)
    mask = np.clip((yy - ty) / 2 + .5, 0, 1)[..., None]; arr = arr * (1 - mask) + tb * mask
    im = Image.fromarray(arr.clip(0, 255).astype('uint8'), 'RGB').convert('RGBA'); s = w / 1200
    # 벽의 사선 빛
    light = Image.new('L', (w, h), 0); d = ImageDraw.Draw(light)
    d.polygon([(w * .30, 0), (w * .74, 0), (w * .52, ty), (w * .10, ty)], fill=120); light = light.filter(ImageFilter.GaussianBlur(46 * s))
    im.paste(Image.new('RGBA', (w, h), (255, 252, 244, 255)), (0, 0), light)
    # 나뭇잎 그림자
    rnd = random.Random(seed); leaf = Image.new('L', (w, h), 0); d = ImageDraw.Draw(leaf)
    for _ in range(90):
        cx = rnd.uniform(.08, .62) * w; cy = rnd.uniform(-.04, .34) * h; a = rnd.uniform(16, 44) * s; b = a * rnd.uniform(.28, .46); th = rnd.uniform(0, math.pi)
        pts = [(cx + a * math.cos(t) * math.cos(th) - b * math.sin(t) * math.sin(th), cy + a * math.cos(t) * math.sin(th) + b * math.sin(t) * math.cos(th)) for t in np.linspace(0, 2 * math.pi, 24)]
        d.polygon(pts, fill=rnd.randint(70, 130))
    leaf = leaf.filter(ImageFilter.GaussianBlur(9 * s)).point(lambda p: int(p * .42))
    leaf_np = np.array(leaf).astype(float); leaf_np[int(ty):] = 0; leaf = Image.fromarray(leaf_np.astype('uint8'))
    im.paste(Image.new('RGBA', (w, h), (140, 112, 72, 255)), (0, 0), leaf)
    # 테이블의 사선 빛과 왼쪽 그늘
    beam = Image.new('L', (w, h), 0); d = ImageDraw.Draw(beam)
    d.polygon([(w * .16, ty), (w * .62, ty), (w * .9, h), (w * .36, h)], fill=105); beam = beam.filter(ImageFilter.GaussianBlur(26 * s))
    b_np = np.array(beam).astype(float); b_np[:int(ty)] = 0; beam = Image.fromarray(b_np.astype('uint8'))
    im.paste(Image.new('RGBA', (w, h), (255, 240, 190, 255)), (0, 0), beam)
    return im.convert('RGB')
