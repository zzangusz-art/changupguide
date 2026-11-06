// dist/ 내부 링크·이미지 깨짐 검사 (빌드 후 실행)
import fs from 'node:fs';
import path from 'node:path';
const DIST = path.resolve('dist'); const BASE = process.env.SITE_BASE ? '/' + process.env.SITE_BASE.replace(/^\/+|\/+$/g, '') : '';
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : e.name.endsWith('.html') && files.push(p); } })(DIST);
const exists = new Map(); const missing = {}; let checked = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf-8');
  for (const m of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
    let u = m[1]; if (/^(https?:|mailto:|tel:|sms:|javascript:|data:)/.test(u)) continue;
    if (!u.startsWith('/')) continue; // 관리자는 상대경로 — 별도
    if (BASE && !u.startsWith(BASE + '/') && u !== BASE) { (missing[f] ||= []).push('BASE 누락: ' + u); continue; }
    const rel = decodeURIComponent(u.slice(BASE.length)); const p = path.join(DIST, rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!exists.has(p)) exists.set(p, fs.existsSync(p) || (fs.existsSync(path.join(DIST, rel)) && fs.statSync(path.join(DIST, rel)).isDirectory() && fs.existsSync(path.join(DIST, rel, 'index.html'))));
    checked++; if (!exists.get(p)) (missing[f] ||= []).push(u);
  }
}
const bad = Object.entries(missing);
console.log(`pages ${files.length}, links checked ${checked}, pages with broken links ${bad.length}`);
for (const [f, us] of bad.slice(0, 15)) console.log(path.relative(DIST, f), [...new Set(us)].slice(0, 5));
process.exit(bad.length ? 1 : 0);
