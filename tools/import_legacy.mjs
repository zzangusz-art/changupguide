// 기존 창업미디어 크롤링 결과(JSON) → src/data/listings.json, agents.json 정규화
// usage: node tools/import_legacy.mjs <parsed.json> [photo-map.json]
import fs from 'node:fs';
import path from 'node:path';
import { primaryBrand, findBrands, makeTitle, extractTags, cleanRawTitle, themeByName, categoryOfKind } from '../src/lib/text.mjs';
import { CATEGORIES } from '../src/data.mjs';

const [, , src, photoMapPath] = process.argv;
const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
const photoMap = photoMapPath && fs.existsSync(photoMapPath) ? JSON.parse(fs.readFileSync(photoMapPath, 'utf-8')) : {};
const outDir = path.resolve('src/data'); fs.mkdirSync(outDir, { recursive: true });

// ---- 담당자 (휴대폰 번호 기준으로 통합) ----
const agentsByPhone = new Map();
for (const l of raw.listings) {
  const phone = (l.agentPhone || '').replace(/[^\d]/g, '');
  if (!phone) continue;
  const a = agentsByPhone.get(phone) || { id: l.agentId || ('a' + phone.slice(-4)), name: l.agentName, mobile: l.agentPhone, photo: l.agentPhoto || '', title: '', tel: '', kakao: '', email: '', intro: '', count: 0 };
  if (!a.id || /^a\d{4}$/.test(a.id)) a.id = l.agentId || a.id;
  if (!a.photo && l.agentPhoto) a.photo = l.agentPhoto;
  a.count++;
  agentsByPhone.set(phone, a);
}
for (const a of raw.agents) {
  const phone = (a.mobile || '').replace(/[^\d]/g, ''); const t = agentsByPhone.get(phone); if (!t) continue;
  for (const k of ['title', 'tel', 'kakao', 'email']) if (!t[k] && a[k]) t[k] = a[k].replace(/\s*\(.*?\)\s*$/, '').trim();
  if (!t.intro && a.intro) t.intro = a.intro.replace(/[〓=]{5,}/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
const agents = [...agentsByPhone.values()].map(a => ({
  id: a.id, name: a.name, role: a.title || '창업전문가', mobile: a.mobile, tel: a.tel || '02-515-8900', kakao: a.kakao || '', email: a.email || '', photo: photoMap[a.photo] || a.photo || '',
  intro: a.intro || '', active: true, isAdmin: false, listingCount: a.count,
})).sort((a, b) => b.listingCount - a.listingCount);

// ---- 매물 ----
const now = new Date().toISOString();
const listings = raw.listings.map(l => {
  const b = primaryBrand(`${l.titleRaw || ''} ${l.kindRaw || ''}`);
  const all = findBrands(`${l.titleRaw || ''} ${l.kindRaw || ''}`).filter(x => !x.generic).map(x => x.name);
  const theme = themeByName(l.theme || '');
  const cat = categoryOfKind(l.kind2) || CATEGORIES.find(c => c.name === l.kind1);
  const kindCode = cat ? (cat.kinds.find(k => k[1] === l.kind2) || [null])[0] : null;
  const images = (l.images || []).filter(p => !/nopic|common\//.test(p)).map(p => photoMap[p] || p);
  const item = {
    id: String(l.id), status: 'active', sido: l.sido || '', gugun: (l.gugun && l.gugun !== l.sido) ? l.gugun : '', brand: b && !b.generic ? b.name : '', brandSlug: b && !b.generic ? b.slug : '', kindLabel: b && b.generic ? b.name : '', brandsAll: all,
    kind1: l.kind1 || '', kind2: l.kind2 || '', code: cat ? cat.code : null, kindCode, theme: theme ? theme.name : (l.theme || ''), newTown: l.newTown && l.newTown !== '해당안됨' ? l.newTown : '',
    sales: l.sales ?? null, expense: l.expense ?? null, profit: l.profit ?? null, monthlyCost: l.monthlyCost ?? null, premium: l.premium ?? null, premiumLabel: l.priceLabel || '권리',
    areaM2: l.areaM2 ?? null, floor: l.floor || '', sizeRange: l.sizeRange || '', salesBasis: l.salesBasis ?? null, expenseBreakdown: l.expenseBreakdown || {},
    titleRaw: l.titleRaw || '', summary: cleanRawTitle(l.titleRaw), description: l.description || '', tags: extractTags(l.titleRaw, l.theme),
    images, agentId: '', agentName: l.agentName || '', agentPhone: l.agentPhone || '',
    createdAt: now, updatedAt: now, legacyId: String(l.id), source: 'changupmedia.com',
  };
  const ag = agentsByPhone.get((l.agentPhone || '').replace(/[^\d]/g, ''));
  if (ag) item.agentId = ag.id;
  item.title = makeTitle(item);
  return item;
}).sort((a, b) => Number(b.id) - Number(a.id));

fs.writeFileSync(path.join(outDir, 'listings.json'), JSON.stringify(listings, null, 1));
fs.writeFileSync(path.join(outDir, 'agents.json'), JSON.stringify(agents, null, 1));
const brandStat = {}; for (const l of listings) if (l.brand) brandStat[l.brand] = (brandStat[l.brand] || 0) + 1;
console.log('listings', listings.length, 'agents', agents.length);
console.log('with brand', listings.filter(l => l.brand).length, 'without', listings.filter(l => !l.brand).length);
console.log('top brands', Object.entries(brandStat).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k}:${v}`).join(' '));
console.log('no brand samples:', listings.filter(l => !l.brand).slice(0, 25).map(l => l.titleRaw).join('\n  '));
