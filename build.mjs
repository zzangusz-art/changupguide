// 정적 빌더: src/data/*.json + content/posts → dist/
// env: SITE_URL (canonical 기준), SITE_BASE (하위 경로, 예 /changupguide), NOINDEX=1 (미리보기), API_URL (관리자·통화알림 API)
import fs from 'node:fs';
import path from 'node:path';
import { SITE, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER, KEYWORD_PAGES, FAQ, PRICE_NOTICE } from './src/data.mjs';
import { indexEntry, canon, BRAND_LIST, isoDate } from './src/lib/text.mjs';
import { abs, u, FLAGS } from './src/lib/html.mjs';
import { homePage } from './src/pages/home.mjs';
import { photoFirst } from './src/lib/picks.mjs';
import { listingPage } from './src/pages/listing.mjs';
import { hubPages } from './src/pages/hubs.mjs';
import { miscPages } from './src/pages/misc.mjs';
import { blogPages, loadPosts } from './src/pages/blog.mjs';

const t0 = Date.now();
const DIST = path.resolve('dist');
const read = p => JSON.parse(fs.readFileSync(p, 'utf-8'));
// 운영 서버는 DB 내용을 CU_DATA_DIR(볼륨 안)로 내보낸 뒤 빌드 — 저장소의 src/data 는 초기값·예시용
const DATA = process.env.CU_DATA_DIR || 'src/data'; const dp = f => path.join(DATA, f);
// 관리자 "설정 → 사이트 정보"에서 바꾼 대표번호·이메일·상담시간 (src/data/site.json)
if (fs.existsSync(dp('site.json'))) { const o = read(dp('site.json')); for (const k of ['phone', 'email', 'hours', 'gaId', 'gtmId', 'naverWa', 'clarityId', 'googleVerification', 'naverVerification', 'bingVerification']) if (typeof o[k] === 'string') SITE[k] = o[k].trim() || (k === 'hours' ? SITE.hours : ''); const d = SITE.phone.replace(/[^0-9]/g, ''); SITE.phoneTel = d ? '+82' + d.replace(/^0/, '') : ''; }
const listingsAll = read(dp('listings.json'));
// 외부(창업미디어) 수집 데이터 분리: 담당자 계정은 공개하지 않고, 매물은 SHOW_LEGACY=0 이면 검증(verified) 완료분만 공개
const LEGACY_SRC = 'changupmedia.com';
const isLegacy = l => l.source === LEGACY_SRC;
const SHOW_LEGACY = process.env.SHOW_LEGACY !== '0';
const agents = read(dp('agents.json')).filter(a => a.active && !a.legacy && a.showPublic !== false);
const agentIds = new Set(agents.map(a => a.id));
const listingsActive = listingsAll.filter(l => l.status === 'active' && (!isLegacy(l) || SHOW_LEGACY || l.verified));
for (const l of listingsActive) if (!agentIds.has(l.agentId)) Object.assign(l, { agentId: '', agentName: SITE.name + ' 상담센터', agentPhone: SITE.phone, agentRole: SITE.phone ? '대표번호' : '온라인 상담', agentPhoto: 'img/brand/mark.png' });
FLAGS.agents = agents.length > 0;
for (const l of listingsActive) if (l.duplicateOf) l.canonicalId = l.duplicateOf;
// 광고·로고·증명사진 이미지는 뒤로 보내고, 실사가 있는 매물을 먼저 노출
const GRAPHICS = new Set(JSON.parse(fs.readFileSync(new URL('./src/data/photo-graphics.json', import.meta.url), 'utf-8')));
for (const l of listingsActive) { const im = l.images || []; const real = im.filter(x => !GRAPHICS.has(x)); l.images = [...real, ...im.filter(x => GRAPHICS.has(x))]; l.noPhoto = !real.length; }
const listings = photoFirst(listingsActive.filter(l => !l.canonicalId)); // 목록·허브·검색은 대표 매물만
const duplicates = listingsActive.length - listings.length;
const posts = loadPosts();

// ---- 파생 데이터 ----
const by = (arr, key) => arr.reduce((m, x) => { const k = key(x); if (!k) return m; (m[k] ||= []).push(x); return m; }, {});
const ctx = {
  listings, agents, posts,
  byBrand: by(listings, l => l.brandSlug),
  bySido: by(listings, l => l.sido),
  byGugun: by(listings, l => l.sido && l.gugun ? `${l.sido}/${l.gugun}` : ''),
  byCode: by(listings, l => l.code),
  byKind: by(listings, l => l.kindCode),
  byTheme: by(listings, l => l.theme),
  byBudget: by(listings, l => { const b = BUDGETS.find(b => l.premium != null && l.premium >= b.min && l.premium < b.max); return b ? b.slug : ''; }),
  byAgent: by(listings, l => l.agentId),
  brandInfo: fs.existsSync(dp('brands.json')) ? Object.fromEntries(read(dp('brands.json')).map(b => [b.slug, b])) : {},
  brandNames: Object.fromEntries(listings.filter(l => l.brandSlug).map(l => [l.brandSlug, l.brand])),
  stats: {
    total: listingsActive.length, unique: listings.length,
    brands: new Set(listings.filter(l => l.brandSlug).map(l => l.brandSlug)).size,
    regions: new Set(listings.map(l => l.sido + l.gugun)).size,
    agents: agents.filter(a => a.active).length,
    avgSales: Math.round(listings.filter(l => l.sales).reduce((s, l) => s + l.sales, 0) / Math.max(1, listings.filter(l => l.sales).length)),
    withSales: listings.filter(l => l.sales).length,
  },
  today: isoDate(),
};
ctx.brandsSorted = Object.entries(ctx.byBrand).map(([slug, arr]) => ({ slug, name: ctx.brandNames[slug], n: arr.length })).sort((a, b) => b.n - a.n);

// ---- 출력 ----
fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
const pages = []; // {path, html, lastmod, priority, changefreq}
function emit(p, html, meta = {}) { pages.push({ path: p, html, ...meta }); }

emit('/', homePage(ctx), { priority: 1.0, changefreq: 'daily' });
for (const l of listingsActive) emit(`/listing/${l.id}/`, listingPage(l, ctx), { priority: 0.8, changefreq: 'weekly', lastmod: l.updatedAt, noindex: !!l.canonicalId || !!l.sample });
for (const p of hubPages(ctx)) emit(p.path, p.html, p);
for (const p of miscPages(ctx)) emit(p.path, p.html, p);
for (const p of blogPages(ctx)) emit(p.path, p.html, p);

for (const p of pages) {
  const fsPath = decodeURIComponent(p.path);
  const file = fsPath.endsWith('/') ? path.join(DIST, fsPath, 'index.html') : path.join(DIST, fsPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html);
}

// ---- 정적 자산 ----
function copyDir(src, dst) { if (!fs.existsSync(src)) return; fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }
copyDir('public', DIST);
copyDir('admin', path.join(DIST, 'admin'));
// 관리자 스크립트 모듈도 배포마다 새로 받도록 import 경로에 버전 부여
{ const v = Date.now().toString(36); const f = path.join(DIST, 'admin/admin.js'); fs.writeFileSync(f, fs.readFileSync(f, 'utf-8').replace("from './api.js'", `from './api.js?v=${v}'`).replace("from '../js/data.mjs'", `from '../js/data.mjs?v=${v}'`).replace("from '../js/lib/text.mjs'", `from '../js/lib/text.mjs?v=${v}'`)); }
// 직원용 짧은 주소: /login/ → /admin/
fs.mkdirSync(path.join(DIST, 'login'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'login/index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>창업가이드 관리자</title><meta http-equiv="refresh" content="0;url=${u('/admin/')}"><link rel="canonical" href="${u('/admin/')}"><a href="${u('/admin/')}">관리자 로그인으로 이동</a>`);
{ const f = path.join(DIST, 'admin/index.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf-8').replace('__API_URL__', process.env.API_URL || '').replace('__SITE_BASE__', SITE.base).replace('href="admin.css"', `href="admin.css?v=${Date.now().toString(36)}"`).replace('src="admin.js"', `src="admin.js?v=${Date.now().toString(36)}"`)); }
fs.mkdirSync(path.join(DIST, 'js/lib'), { recursive: true });
fs.copyFileSync('src/lib/text.mjs', path.join(DIST, 'js/lib/text.mjs'));
fs.copyFileSync('src/data.mjs', path.join(DIST, 'js/data.mjs'));
// 관리자 데모 시드 (서버 없이 미리보기)
fs.mkdirSync(path.join(DIST, 'admin/seed'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'admin/seed/listings.json'), JSON.stringify(listingsAll));
fs.writeFileSync(path.join(DIST, 'admin/seed/agents.json'), JSON.stringify(agents));
if (fs.existsSync(dp('brands.json'))) fs.copyFileSync(dp('brands.json'), path.join(DIST, 'admin/seed/brands.json'));
fs.writeFileSync(path.join(DIST, 'admin/seed/posts.json'), JSON.stringify(posts.map(p => ({ slug: p.slug, title: p.title, date: p.date, listingId: p.listingId, agentId: p.agentId, status: 'published' }))));

// ---- 검색 인덱스·추천어 ----
const thumbOf = l => { const p = l.images && l.images[0]; if (!p) return ''; return p.startsWith('photos/') ? p.replace('photos/', 'photos/thumb/') : (/^https?:/.test(p) ? p : 'https://www.changupmedia.com/' + p); };
fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(listings.map(l => ({ ...indexEntry(l), img: thumbOf(l) }))));
const suggest = [];
for (const b of ctx.brandsSorted) suggest.push({ t: b.name, q: b.name, n: b.n, k: canon(b.name) });
for (const [k, arr] of Object.entries(ctx.byGugun)) { const [s, g] = k.split('/'); suggest.push({ t: `${s} ${g}`, q: `${s} ${g}`, n: arr.length, k: canon(s + g) }); }
for (const [s, arr] of Object.entries(ctx.bySido)) suggest.push({ t: s, q: s, n: arr.length, k: canon(s) });
// 지역+브랜드 조합 (3건 이상)
const combo = {}; for (const l of listings) if (l.brand && l.sido) { const k = `${l.sido} ${l.brand}`; combo[k] = (combo[k] || 0) + 1; }
for (const [k, n] of Object.entries(combo)) if (n >= 2) suggest.push({ t: k, q: k, n, k: canon(k) });
for (const th of THEMES) suggest.push({ t: th.name, q: th.name, n: (ctx.byTheme[th.name] || []).length, k: canon(th.name) });
fs.writeFileSync(path.join(DIST, 'suggest.json'), JSON.stringify(suggest.sort((a, b) => b.n - a.n)));

// ---- sitemap / robots / llms.txt / rss ----
const lastmodDefault = ctx.today;
const sm = pages.filter(p => !p.noindex && !p.path.startsWith('/admin') && p.path !== '/404.html').map(p => `<url><loc>${abs(p.path)}</loc><lastmod>${(p.lastmod || lastmodDefault).slice(0, 10)}</lastmod><changefreq>${p.changefreq || 'weekly'}</changefreq><priority>${p.priority ?? 0.6}</priority></url>`);
// 사이트맵 분할 (5만 제한 대비 + 검색엔진 친화)
const chunks = []; for (let i = 0; i < sm.length; i += 5000) chunks.push(sm.slice(i, i + 5000));
chunks.forEach((c, i) => fs.writeFileSync(path.join(DIST, `sitemap-${i + 1}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${c.join('\n')}\n</urlset>`));
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.map((_, i) => `<sitemap><loc>${abs(`/sitemap-${i + 1}.xml`)}</loc><lastmod>${lastmodDefault}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), SITE.noindex
  ? `User-agent: *\nDisallow: /\n# 미리보기 빌드 — 정식 도메인 배포 시 NOINDEX 해제\n`
  : `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /login/\n\n# AI 검색·답변 엔진 인용 허용\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Claude-User\nAllow: /\nUser-agent: Claude-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: Yeti\nAllow: /\nUser-agent: Bingbot\nAllow: /\nUser-agent: Daumoa\nAllow: /\nUser-agent: Applebot\nAllow: /\nUser-agent: Applebot-Extended\nAllow: /\nUser-agent: Google-CloudVertexBot\nAllow: /\nUser-agent: Amazonbot\nAllow: /\nUser-agent: DuckAssistBot\nAllow: /\nUser-agent: meta-externalagent\nAllow: /\nUser-agent: MistralAI-User\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

// ---- llms.txt (AI 답변 엔진용 요약) — 예시 매물은 제외 ----
const real = listings.filter(l => !l.sample);
const realBrands = Object.entries(real.reduce((m, l) => { if (l.brandSlug) (m[l.brandSlug] ||= { name: l.brand, n: 0 }).n++; return m; }, {})).sort((a, b) => b[1].n - a[1].n);
const contact = [SITE.phone ? `창업상담 ${SITE.phone}` : '', `온라인 문의 ${abs('/inquiry/')}`].filter(Boolean).join(' · ');
const llms = [`# ${SITE.name}`, '',
  `> ${SITE.name}는 2014년부터 운영 중인 사업체(권리금) 양도양수 전문 창업 컨설팅 회사입니다. 운영 중인 매장을 권리금으로 인수하려는 예비 창업자에게 지역·브랜드·예산에 맞는 매물을 월매출·월수익·권리금 숫자로 안내하고, 현장 답사부터 계약·본사 승인까지 담당자가 함께합니다. 부동산 중개대상물은 취급하지 않습니다.`, '',
  '## 회사 정보', `- 상호: ${SITE.company} (대표 ${SITE.ceo})`, `- 사업자등록번호: ${SITE.bizNo}`, `- 업태/종목: ${SITE.bizType}`, `- 주소: ${SITE.address}`, `- 개업: 2014년`, `- 문의: ${contact}`, `- 웹사이트: ${abs('/')}`, '',
  '## 서비스', '- 창업 의뢰(매수): 지역·업종·예산을 남기면 조건에 맞는 운영 중 매장을 추려 제안', '- 양도 의뢰(매도): 운영 중인 매장의 권리금 평가, 매물 등록·광고, 양수인 연결', '- 진행: 상담 → 매물 제안 → 현장 답사 동행 → 조건 협의 → 계약 → 프랜차이즈 본사 승인·인수인계', '- 서울·경기·인천 중심, 카페·음식점·치킨/주점·스크린골프·판매업 등 업종 전반', '',
  '## 매물 정보 기준', `- ${PRICE_NOTICE}`, '- 월수익은 세전 기준이며 점주 인건비는 월지출에 포함하지 않음', '- 정확한 위치·상호는 양도인 보안을 위해 상담 후 안내',
  ...(real.length ? [`- 현재 공개 매물 ${real.length}건 (브랜드 ${realBrands.length}개)`] : ['- 매물은 담당자가 확인 후 순차 등록 중']), '',
  '## 주요 페이지', `- [전체 매물 검색](${abs('/listings/')})`, `- [창업 의뢰](${abs('/inquiry/')})`, `- [양도 의뢰](${abs('/sell/')})`, `- [자주 묻는 질문](${abs('/faq/')})`, `- [회사 소개](${abs('/about/')})`,
  ...CATEGORIES.map(c => `- [${c.name} 창업 매물](${abs(`/category/${c.slug}/`)})`), ...THEMES.map(t => `- [${t.name}](${abs(`/theme/${t.slug}/`)})`), ...BUDGETS.map(b => `- [권리금 ${b.name} 매물](${abs(`/budget/${b.slug}/`)})`), ...KEYWORD_PAGES.map(k => `- [${k.kw}](${abs(`/${k.slug}/`)})`), '',
  ...(realBrands.length ? ['## 브랜드별', ...realBrands.slice(0, 40).map(([slug, b]) => `- [${b.name} 창업 매물 ${b.n}건](${abs(`/brand/${slug}/`)})`), ''] : []),
  '## 자주 묻는 질문', ...FAQ.map(f => `### ${f.q}\n${f.a}`), '',
  ...(posts.length ? ['## 창업 인사이트', ...posts.slice(0, 10).map(p => `- [${p.title}](${abs(`/blog/${p.slug}/`)})`)] : []),
].join('\n');
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), llms + (real.length ? '\n\n## 매물 목록\n' + real.map(l => `- [${l.title}](${abs(`/listing/${l.id}/`)}) — ${l.kind1}${l.kind2 ? ` (${l.kind2})` : ''}${l.sales ? `, 월매출 ${l.sales.toLocaleString()}만원` : ''}${l.profit ? `, 월수익 ${l.profit.toLocaleString()}만원` : ''}${l.premium ? `, 권리금 ${l.premium.toLocaleString()}만원` : ''}`).join('\n') : ''));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
fs.writeFileSync(path.join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)} 창업 인사이트</title><link>${abs('/blog/')}</link><description>지역·브랜드·예산별 창업 매물 분석과 양도양수 가이드</description><language>ko-KR</language><atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml"/>${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${abs(`/blog/${p.slug}/`)}</link><guid>${abs(`/blog/${p.slug}/`)}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.desc)}</description></item>`).join('')}</channel></rss>`);
fs.writeFileSync(path.join(DIST, 'feed.json'), JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', title: `${SITE.name} 창업 인사이트`, home_page_url: abs('/'), feed_url: abs('/feed.json'), items: posts.slice(0, 30).map(p => ({ id: abs(`/blog/${p.slug}/`), url: abs(`/blog/${p.slug}/`), title: p.title, summary: p.desc, date_published: p.date })) }));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
// IndexNow(네이버·빙) 소유 확인 키 파일 — 서버가 재생성 후 바뀐 주소를 알림
if (SITE.indexNowKey) fs.writeFileSync(path.join(DIST, `${SITE.indexNowKey}.txt`), SITE.indexNowKey);
if (process.env.CNAME) fs.writeFileSync(path.join(DIST, 'CNAME'), process.env.CNAME);

console.log(`built ${pages.length} pages (${listingsActive.length} listings, ${duplicates} duplicate→canonical, ${posts.length} posts) → dist/ in ${((Date.now() - t0) / 1000).toFixed(1)}s  base=${SITE.base || '/'} url=${SITE.url} noindex=${SITE.noindex}`);
