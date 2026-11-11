// 브랜드 기본값 초기 데이터 생성: 브랜드 사전 + 기존 매물 통계(업종·테마 최빈값, 지출 항목별 평균 비율)
// usage: node tools/make_brands.mjs   → src/data/brands.json (이미 있으면 관리자가 고친 값은 유지하고 빈 칸만 채움)
import fs from 'node:fs';
import { BRAND_LIST } from '../src/lib/text.mjs';
const L = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf-8')).filter(l => l.brandSlug && l.status !== 'archived');
const out = 'src/data/brands.json';
const prev = fs.existsSync(out) ? Object.fromEntries(JSON.parse(fs.readFileSync(out, 'utf-8')).map(b => [b.slug, b])) : {};
const mode = arr => { const m = {}; for (const v of arr) if (v) m[v] = (m[v] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || ''; };
const KEYS = ['재료비', '인건비', '월비용(세전)', '관리비', '기타경비'];
const logo = slug => ['png', 'svg', 'webp'].map(e => `img/brands/${slug}.${e}`).find(p => fs.existsSync('public/' + p)) || '';
const brands = BRAND_LIST.map(({ name, slug }) => {
  const arr = L.filter(l => l.brandSlug === slug);
  const pct = {}; for (const k of KEYS) { const v = arr.map(l => l.expenseBreakdown?.[k]?.pct).filter(x => typeof x === 'number' && x > 0 && x < 80); pct[k] = v.length >= 2 ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : null; }
  const k1 = mode(arr.map(l => l.kind1)); const k2 = mode(arr.filter(l => l.kind1 === k1).map(l => l.kind2));
  const ref = arr.find(l => l.kind1 === k1 && l.kind2 === k2) || {};
  const auto = { slug, name, aliases: [], kind1: k1, kind2: k2, code: ref.code ?? null, kindCode: ref.kindCode ?? null, theme: '', expensePct: pct, tags: [], intro: '', logo: logo(slug), images: [], sampleCount: arr.length, updatedAt: '' };
  const p = prev[slug]; if (!p) return auto;
  const merged = { ...auto, ...p };
  for (const k of Object.keys(auto)) if (merged[k] === '' || merged[k] == null) merged[k] = auto[k];
  merged.expensePct = { ...auto.expensePct, ...Object.fromEntries(Object.entries(p.expensePct || {}).filter(([, v]) => v != null)) };
  merged.sampleCount = arr.length; return merged;
});
for (const slug of Object.keys(prev)) if (!brands.some(b => b.slug === slug)) brands.push(prev[slug]); // 관리자가 추가한 브랜드 유지
brands.sort((a, b) => (b.sampleCount || 0) - (a.sampleCount || 0) || a.name.localeCompare(b.name, 'ko'));
fs.writeFileSync(out, JSON.stringify(brands, null, 1));
console.log('brands', brands.length, 'with pct', brands.filter(b => Object.values(b.expensePct).some(v => v != null)).length, 'with logo', brands.filter(b => b.logo).length);
