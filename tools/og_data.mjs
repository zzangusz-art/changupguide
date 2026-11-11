// 공유 썸네일(OG) 문구와 사진 선정 → JSON. 사용: node tools/og_data.mjs <출력.json>  이후 python tools/og_images.py <출력.json>
import fs from 'node:fs';
import { THEMES, BUDGETS, CATEGORIES } from '../src/data.mjs';
import { PICKS, themeItems, photoFirst } from '../src/lib/picks.mjs';

const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
const GRAPHICS = new Set(read('../src/data/photo-graphics.json'));
const WIDE = new Set(read('../src/data/photo-wide.json'));
const raw = read('../src/data/listings.json').filter(l => !l.duplicateOf);
for (const l of raw) { const im = l.images || []; const real = im.filter(x => !GRAPHICS.has(x)); l.images = [...real, ...im.filter(x => GRAPHICS.has(x))]; l.noPhoto = !real.length; }
const listings = photoFirst(raw);
const by = (arr, f) => arr.reduce((m, x) => { const k = f(x); if (k) (m[k] ||= []).push(x); return m; }, {});
const byTheme = by(listings, l => l.theme);

const usedBrand = new Set(); const usedFile = new Set(); const usedSize = new Set(); // 파일 크기로 다른 매물의 동일 사진까지 제외
const sizeOf = f => fs.statSync(new URL(`../public/${f}`, import.meta.url)).size;
let fallbackIdx = 0;
function photo(items) {
  for (const strict of [true, false]) for (const l of items) for (const f of l.images || []) {
    if (!WIDE.has(f) || usedFile.has(f) || usedSize.has(sizeOf(f)) || (strict && usedBrand.has(l.brand || f))) continue;
    usedFile.add(f); usedSize.add(sizeOf(f)); usedBrand.add(l.brand || f); return f;
  }
  // 예시 매물만 있을 때: 해당 묶음의 이미지 → 없으면 예시 이미지를 돌려가며 사용
  const own = items.flatMap(l => l.images || []).find(f => fs.existsSync(new URL(`../public/${f}`, import.meta.url)));
  const pool = fs.readdirSync(new URL('../public/img/sample/', import.meta.url)).filter(f => f.endsWith('.jpg')).map(f => `img/sample/${f}`);
  return own && !usedFile.has(own) ? (usedFile.add(own), own) : pool[(fallbackIdx++) % pool.length] || '';
}
const out = [];
const add = (key, label, title, sub, items) => out.push({ key, label, title, sub, photo: photo(items) });
const brandOnly = listings.filter(l => l.brand);
add('main', '창업전문포털', '양도양수 창업,\n숫자로 비교하세요', '월매출·월수익·권리금을 공개한 매물', brandOnly);
add('listings', '매물 검색', '창업 매물 검색', '지역·브랜드·예산으로 바로 찾기', listings);
add('brand', '브랜드별', '브랜드별 창업 매물', '운영 중인 가맹점을 권리금으로 인수', brandOnly);
add('region', '지역별', '지역별 창업 매물', '서울·경기·인천 상권을 숫자로 비교', listings.filter(l => l.sido === '서울'));
add('theme', '테마별', '테마별 창업', '초보·소자본·여성·시니어·고수익 창업', listings);
add('budget', '예산별', '예산별 창업 매물', '권리금 1억 미만부터 6억 이상까지', listings);
add('pick', '성향별', '성향별 추천 매물', '회수 기간·수익·운영 방식으로 고르기', listings);
add('inquiry', '무료 매물 찾기', '조건만 남기면\n매물을 찾아드립니다', '금액·업종·상권만 고르면 담당자가 연락', listings);
add('sell', '양도 의뢰', '내 매장 양도 의뢰', '담당자가 방문해 매출과 시설을 확인합니다', listings);
add('agents', '담당 전문가', '담당 창업전문가', '매물마다 담당자가 정해져 있습니다', listings);
add('blog', '창업 인사이트', '창업 인사이트', '지역·브랜드·예산으로 읽는 창업', listings);
add('about', '회사 소개', '창업가이드 소개', '2014년부터 양도양수 창업 컨설팅 · 서울 송파구', listings);
add('faq', '자주 묻는 질문', '양도양수 창업,\n궁금한 점 정리', '비용·절차·권리금 안내', listings);
for (const t of THEMES) add(`theme-${t.slug}`, '테마별 창업', t.name, t.h1.split(', ').pop().trim(), themeItems(t, { listings, byTheme }));
for (const b of BUDGETS) add(`budget-${b.slug}`, '예산별 창업', `권리금 ${b.max === Infinity ? '6억 이상' : b.min === 0 ? '1억 미만' : `${b.min / 10000}~${b.max / 10000}억`}`, '월매출·월수익을 숫자로 비교', listings.filter(l => l.premium != null && l.premium >= b.min && l.premium < b.max));
for (const p of PICKS) add(`pick-${p.slug}`, '성향별 추천', p.name, p.hook, photoFirst(listings.filter(p.fn).sort(p.sort)));
for (const c of CATEGORIES) add(`category-${c.slug}`, '업종별 창업', c.name, '운영 중인 매장을 권리금으로 인수', listings.filter(l => l.kind1 === c.name));
for (const [slug, name, items] of [['startup', '창업 매물', listings], ['items', '창업 아이템', listings], ['cafe', '카페 창업', listings.filter(l => /커피|카페/.test(`${l.kind2}${l.brand}`))], ['chicken', '치킨집 창업', listings.filter(l => /치킨/.test(`${l.kind1}${l.kind2}${l.brand}`))], ['transfer', '양도양수', listings]]) add(`kw-${slug}`, '창업가이드', name, '월매출·월수익·권리금 공개 매물', items);
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(out.length, 'items,', out.filter(x => !x.photo).length, 'without photo');
