# -*- coding: utf-8 -*-
"""기존 사이트 매장 사진 수집·리사이즈.
usage: python -I -X utf8 tools/photos.py <parsed.json> <raw_dir> <out_dir> <map_out.json>
 - raw_dir : 원본 다운로드 캐시 (한 번 받은 파일은 다시 받지 않음)
 - out_dir : public/photos (1200px JPEG q82) + public/photos/thumb (480px)
 - map_out : {"upload/jumpo_real/xxx.jpg": "photos/xxx.jpg"} 매핑
"""
import sys, os, json, hashlib, urllib.request, concurrent.futures, time
from PIL import Image, ImageOps

src, raw_dir, out_dir, map_out = sys.argv[1:5]
os.makedirs(raw_dir, exist_ok=True); os.makedirs(os.path.join(out_dir, 'thumb'), exist_ok=True)
data = json.load(open(src, encoding='utf-8'))
paths = []
for l in data['listings']:
    for p in l.get('images', []): paths.append(p)
    if l.get('agentPhoto'): paths.append(l['agentPhoto'])
for a in data.get('agents', []):
    if a.get('photo'): paths.append(a['photo'])
paths = sorted(set(p for p in paths if p and not p.startswith('http')))
print('unique images', len(paths))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'

def fetch(p):
    local = os.path.join(raw_dir, p.replace('/', '__'))
    if os.path.exists(local) and os.path.getsize(local) > 0: return p, local, 'cached'
    url = 'https://www.changupmedia.com/' + p.replace('\\', '/')
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://www.changupmedia.com/cumedia/index.asp'})
            with urllib.request.urlopen(req, timeout=30) as r: b = r.read()
            if len(b) < 200: return p, None, 'empty'
            open(local, 'wb').write(b); return p, local, 'ok'
        except Exception as e:
            time.sleep(1.5)
            err = str(e)
    return p, None, 'fail:' + err

def convert(p, local):
    base = os.path.splitext(os.path.basename(p))[0].lower()
    is_member = 'member' in p
    name = ('agent_' if is_member else '') + base + '.jpg'
    big = os.path.join(out_dir, name); th = os.path.join(out_dir, 'thumb', name)
    if os.path.exists(big) and os.path.exists(th): return name
    try:
        im = Image.open(local); im = ImageOps.exif_transpose(im)
        if getattr(im, 'is_animated', False): im.seek(0)
        im = im.convert('RGB')
        w, h = im.size
        if max(w, h) > 1200: im.thumbnail((1200, 1200), Image.LANCZOS)
        im.save(big, 'JPEG', quality=82, optimize=True, progressive=True)
        t = im.copy(); t.thumbnail((480, 480), Image.LANCZOS)
        t.save(th, 'JPEG', quality=80, optimize=True)
        return name
    except Exception as e:
        print('convert fail', p, e); return None

mapping = {}; stats = {'ok': 0, 'cached': 0, 'fail': 0}
with concurrent.futures.ThreadPoolExecutor(6) as ex:
    for p, local, st in ex.map(fetch, paths):
        if not local: stats['fail'] += 1; print('FAIL', p, st); continue
        stats['ok' if st == 'ok' else 'cached'] += 1
        name = convert(p, local)
        if name: mapping[p] = 'photos/' + name
json.dump(mapping, open(map_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('stats', stats, 'mapped', len(mapping))
total = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir) if f.endswith('.jpg'))
total_t = sum(os.path.getsize(os.path.join(out_dir, 'thumb', f)) for f in os.listdir(os.path.join(out_dir, 'thumb')))
print('size MB big=%.1f thumb=%.1f' % (total / 1e6, total_t / 1e6))
