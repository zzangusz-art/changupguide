// 정적 빌더: src/data/*.json + content/posts → dist/
// env: SITE_URL (canonical 기준), SITE_BASE (하위 경로, 예 /changupguide), NOINDEX=1 (미리보기), API_URL (관리자·통화알림 API)
import fs from 'node:fs';
import path from 'node:path';
import { SITE, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER, KEYWORD_PAGES } from './src/data.mjs';
import { indexEntry, canon, BRAND_LIST, isoDate } from './src/lib/text.mjs';
import { abs, u } from './src/lib/html.mjs';
import { homePage } from './src/pages/home.mjs';
import { photoFirst } from './src/lib/picks.mjs';
import { listingPage } from './src/pages/listing.mjs';
import { hubPages } from './src/pages/hubs.mjs';
import { miscPages } from './src/pages/misc.mjs';
import { blogPages, loadPosts } from './src/pages/blog.mjs';

const t0 = Date.now();
const DIST = path.resolve('dist');
const read = p => JSON.parse(fs.readFileSync(p, 'utf-8'));
const listingsAll = read('src/data/listings.json');
const agents = read('src/data/agents.json');
const listingsActive = listingsAll.filter(l => l.status === 'active');
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
for (const l of listingsActive) emit(`/listing/${l.id}/`, listingPage(l, ctx), { priority: 0.8, changefreq: 'weekly', lastmod: l.updatedAt, noindex: !!l.canonicalId });
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
{ const f = path.join(DIST, 'admin/index.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf-8').replace('__API_URL__', process.env.API_URL || '').replace('__SITE_BASE__', SITE.base)); }
fs.mkdirSync(path.join(DIST, 'js/lib'), { recursive: true });
fs.copyFileSync('src/lib/text.mjs', path.join(DIST, 'js/lib/text.mjs'));
fs.copyFileSync('src/data.mjs', path.join(DIST, 'js/data.mjs'));
// 관리자 데모 시드 (서버 없이 미리보기)
fs.mkdirSync(path.join(DIST, 'admin/seed'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'admin/seed/listings.json'), JSON.stringify(listingsAll));
fs.writeFileSync(path.join(DIST, 'admin/seed/agents.json'), JSON.stringify(agents));
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
  : `User-agent: *\nAllow: /\nDisallow: /admin/\n\n# AI 검색·답변 엔진 인용 허용\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Claude-User\nAllow: /\nUser-agent: Claude-SearchBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: Yeti\nAllow: /\nUser-agent: Bingbot\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);

const llms = [`# ${SITE.name} (구 ${SITE.legacyName})`, '', `> ${SITE.slogan}. 회사명 ${SITE.company}, 서울 강남구 테헤란로 413 태양빌딩 8층. 사업체(권리금) 양도양수 전문 창업 컨설팅. 부동산 중개대상물은 취급하지 않음. 창업상담 ${SITE.phone} (24시간).`, '',
  '## 핵심 사실', `- 등록 매물 ${ctx.stats.total}건 (서울·경기·인천 중심), 담당 창업전문가 ${ctx.stats.agents}명`, '- 모든 매물은 월매출·월지출·월수익(세전)·권리금(임대보증금 제외)을 공개하며, 정확한 위치는 상담 후 안내', `- 브랜드 ${ctx.stats.brands}개: ${ctx.brandsSorted.slice(0, 20).map(b => `${b.name}(${b.n})`).join(', ')}`, '',
  '## 주요 페이지', `- [전체 매물 검색](${abs('/listings/')})`, ...CATEGORIES.map(c => `- [${c.name} 매물](${abs(`/category/${c.slug}/`)})`), ...THEMES.map(t => `- [${t.name}](${abs(`/theme/${t.slug}/`)})`), ...KEYWORD_PAGES.map(k => `- [${k.kw}](${abs(`/${k.slug}/`)})`), `- [담당 전문가](${abs('/agents/')})`, `- [창업 인사이트(블로그)](${abs('/blog/')})`, `- [자주 묻는 질문](${abs('/faq/')})`, `- [회사 소개](${abs('/about/')})`, '',
  '## 브랜드별', ...ctx.brandsSorted.slice(0, 40).map(b => `- [${b.name} 창업 매물 ${b.n}건](${abs(`/brand/${b.slug}/`)})`), '',
  '## 지역별', ...SIDO_ORDER.filter(s => ctx.bySido[s]).map(s => `- [${s} ${ctx.bySido[s].length}건](${abs(`/region/${encodeURIComponent(s)}/`)})`), '',
  '## 최신 글', ...posts.slice(0, 10).map(p => `- [${p.title}](${abs(`/blog/${p.slug}/`)})`),
].join('\n');
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), llms + '\n\n## 매물 목록\n' + listings.map(l => `- [${l.title}](${abs(`/listing/${l.id}/`)}) — ${l.kind1} ${l.kind2 ? `(${l.kind2})` : ''}, 담당 ${l.agentName}`).join('\n'));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
fs.writeFileSync(path.join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)} 창업 인사이트</title><link>${abs('/blog/')}</link><description>지역·브랜드·예산별 창업 매물 분석과 양도양수 가이드</description><language>ko-KR</language><atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml"/>${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${abs(`/blog/${p.slug}/`)}</link><guid>${abs(`/blog/${p.slug}/`)}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.desc)}</description></item>`).join('')}</channel></rss>`);
fs.writeFileSync(path.join(DIST, 'feed.json'), JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', title: `${SITE.name} 창업 인사이트`, home_page_url: abs('/'), feed_url: abs('/feed.json'), items: posts.slice(0, 30).map(p => ({ id: abs(`/blog/${p.slug}/`), url: abs(`/blog/${p.slug}/`), title: p.title, summary: p.desc, date_published: p.date })) }));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
if (process.env.CNAME) fs.writeFileSync(path.join(DIST, 'CNAME'), process.env.CNAME);

console.log(`built ${pages.length} pages (${listingsActive.length} listings, ${duplicates} duplicate→canonical, ${posts.length} posts) → dist/ in ${((Date.now() - t0) / 1000).toFixed(1)}s  base=${SITE.base || '/'} url=${SITE.url} noindex=${SITE.noindex}`);
