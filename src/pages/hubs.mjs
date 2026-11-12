// 허브 페이지: 매장 검색, 브랜드/지역/테마/예산/업종/키워드 허브, 담당 전문가
import { SITE, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER, SIDO_FULL, KEYWORD_PAGES, FAQ } from '../data.mjs';
import { BUILD_ID } from '../lib/html.mjs';
import { layout, esc, u, abs, ICONS, ILLO, CAT_ILLO, sticker, starburst, badge, listingCard, skeletonCards, breadcrumb, faqBlock, ctaBand, img, imgPath, jsonld } from '../lib/html.mjs';
import { fmtWon, fmtMan, fmtNum, phoneTel, GUGUN } from '../lib/text.mjs';
import { agentCard, agentProfile } from '../lib/agents.mjs';
import { vizPanel, hBars, vBars, donut, rangeBars, premiumHistogram, profitHistogram, dataTable, summaryRows, SUMMARY_COLS, groupBy, avgOf, budgetShort } from '../lib/charts.mjs';
import { koreaMap } from '../lib/map.mjs';
import { brandLogoImg, rail } from '../lib/html.mjs';
import { readFileSync } from 'node:fs';
import { PICKS, pickItems, themeItems as themeItemsOf, photoFirst, THEME_DETAIL } from '../lib/picks.mjs';
import { leadForm } from '../lib/lead.mjs';
import { paybackMonths } from '../lib/text.mjs';

const WIDE = new Set(JSON.parse(readFileSync(new URL('../data/photo-wide.json', import.meta.url), 'utf-8')));
const coverSeen = new Set(); const coverCache = {};
export function coverFor(key, items) {
  if (coverCache[key] !== undefined) return coverCache[key];
  let found = '';
  for (const l of items) { for (const f of l.images || []) if (WIDE.has(f) && !coverSeen.has(l.brand || f)) { found = f; coverSeen.add(l.brand || f); break; } if (found) break; }
  if (!found) for (const l of items) { for (const f of l.images || []) if (WIDE.has(f)) { found = f; break; } if (found) break; }
  if (!found) { const any = items.find(l => !l.noPhoto && l.images && l.images[0]); found = any ? any.images[0] : ''; }
  return (coverCache[key] = found);
}
const topKinds = (items, n = 3) => groupBy(items, l => l.kind2 || l.kind1).slice(0, n).map(([k]) => k);
const avgPayback = items => { const v = items.map(paybackMonths).filter(m => m != null && m > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
function richCard({ href, img, alt, name, items, sub, note }) {
  return `<a class="rcard reveal" href="${href}"><div class="rcard__img">${img ? `<img src="${u('/' + img)}" alt="${esc(alt)}" loading="lazy" decoding="async">` : ''}<h2 class="rcard__name">${esc(name)}</h2><span class="rcard__count">${items.length.toLocaleString('ko-KR')}건</span></div><div class="rcard__body">${sub ? `<p class="rcard__h">${esc(sub)}</p>` : ''}<dl class="rcard__nums"><div><dt>평균 월매출</dt><dd>${avg(items, 'sales') ? esc(fmtMan(avg(items, 'sales'))) : '-'}</dd></div><div><dt>평균 월수익</dt><dd class="hot">${avg(items, 'profit') ? esc(fmtMan(avg(items, 'profit'))) : '-'}</dd></div><div><dt>최저 권리금</dt><dd class="cool">${min(items, 'premium') ? esc(fmtWon(min(items, 'premium'))) : '협의'}</dd></div></dl>${note ? `<p class="rcard__note">${esc(note)}</p>` : ''}<div class="rcard__chips">${topKinds(items).map(k => `<span>${esc(k)}</span>`).join('')}</div><span class="rcard__cta">매장 보기 ${ICONS.arrow}</span></div></a>`;
}
function detailBanner(img, kicker, text, fit, check) {
  return `<div class="tbanner" ${img ? `style="background-image:url('${esc(u('/' + img))}')"` : ''}><div class="tbanner__in"><span>${esc(kicker)}</span><p>${esc(text)}</p></div></div>${fit ? `<div class="tdetail"><div><h3>이런 분께 맞습니다</h3><ul>${fit.map(x => `<li>${ICONS.check}${esc(x)}</li>`).join('')}</ul></div><div><h3>계약 전 꼭 확인할 것</h3><ul>${check.map(x => `<li>${ICONS.check}${esc(x)}</li>`).join('')}</ul></div></div>` : ''}`;
}
function railTabs(prefix, tabs, { auto = 0 } = {}) {
  return `<div class="tabs tabs--pills" data-tabs ${auto ? `data-auto="${auto}"` : ''}><div class="tabs__nav" role="tablist">${tabs.map((t, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="${prefix}-${i}" id="${prefix}-tab-${i}" type="button">${esc(t.name)}<small>${t.count}</small></button>`).join('')}</div><div class="tabs__panels">${tabs.map((t, i) => `<div class="tabs__panel" role="tabpanel" id="${prefix}-${i}" aria-labelledby="${prefix}-tab-${i}" ${i ? 'hidden' : ''}>${t.line ? `<p class="pick-line"><b>${esc(t.line)}</b>${t.rule ? `<span>${esc(t.rule)}</span>` : ''}</p>` : ''}${rail(t.items.slice(0, 10).map(l => listingCard(l)))}</div>`).join('')}</div></div>`;
}

// ---- 허브별 시각 자료 (표·차트) ----
const kindOf = l => l.kind2 || l.kind1;
const regionOf = l => [l.sido, l.gugun].filter(Boolean).join(' ');
const regionHref = k => { const [s, g] = k.split(' '); return g ? u(`/region/${encodeURIComponent(s)}/${encodeURIComponent(g)}/`) : u(`/region/${encodeURIComponent(s)}/`); };
const vizNote = items => `등록 매장 ${items.length}건 집계 · 권리금은 임대보증금 제외 · 월수익은 점주 인건비 제외 세전`;
function brandViz(arr, b) {
  const regions = groupBy(arr, regionOf); const kinds = groupBy(arr, kindOf);
  return `<div class="viz-grid">
    ${vizPanel('월매출·월수익·권리금 범위', rangeBars(arr), { note: vizNote(arr), wide: true })}
    ${vizPanel('권리금 구간별 매장 수', premiumHistogram(arr))}
    ${vizPanel('지역별 매장 분포', hBars(regions.map(([k, a]) => ({ label: k, value: a.length, href: u(`/listings/?q=${encodeURIComponent(k.split(' ')[0] + ' ' + b.name)}`) })), { top: 10 }))}
    ${vizPanel('지역별 평균 월매출·월수익 비교', dataTable(SUMMARY_COLS, summaryRows(regions.slice(0, 10), k => u(`/listings/?q=${encodeURIComponent(k.split(' ')[0] + ' ' + b.name)}`))), { wide: true, note: '지역(시·구) 기준, 매장 수 많은 순' })}
    ${vizPanel('월수익 구간 분포', profitHistogram(arr))}
    ${kinds.length > 1 ? vizPanel('세부 업종 구성', donut(kinds.map(([k, a]) => ({ label: k, value: a.length })))) : ''}
  </div>`;
}
function regionViz(items, { sido, gugun, bySido, byGugun }) {
  const brands = groupBy(items, l => l.brand); const kinds = groupBy(items, kindOf);
  const gus = gugun ? [] : Object.entries(byGugun).filter(([k]) => k.startsWith(sido + '/')).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => [k.split('/')[1], a]);
  const counts = Object.fromEntries(Object.entries(bySido).map(([k, a]) => [k, a.length]));
  return `<div class="viz-grid">
    ${vizPanel(gugun ? `${sido} ${gugun} 위치` : `${sido} 매장 분포`, `<div class="viz-map">${koreaMap(counts, { active: sido, compact: true, focus: ['서울', '경기', '인천'].includes(sido) ? 'capital' : '', id: `kmap-${encodeURIComponent(sido)}` })}<div>${gugun ? `<p class="viz__lead"><b>${esc(sido)} 전체 ${(bySido[sido] || []).length}건</b> 중 ${esc(gugun)} ${items.length}건</p>` : `<p class="viz__lead"><b>${esc(sido)} ${items.length}건</b> · 전국 ${Object.values(counts).reduce((a, b) => a + b, 0)}건 중 ${Math.round(items.length / Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0)) * 100)}%</p>`}${hBars(gus.length ? gus.slice(0, 8).map(([g, a]) => ({ label: g, value: a.length, href: u(`/region/${encodeURIComponent(sido)}/${encodeURIComponent(g)}/`) })) : brands.slice(0, 8).map(([k, a]) => ({ label: k, value: a.length, href: u(`/listings/?q=${encodeURIComponent((gugun || sido) + ' ' + k)}`) })), { top: 8, labelW: 96 })}</div></div>`, { wide: true, note: vizNote(items) })}
    ${vizPanel('월매출·월수익·권리금 범위', rangeBars(items), { wide: true })}
    ${gus.length ? vizPanel('구·시별 평균 월매출·월수익', dataTable(SUMMARY_COLS, summaryRows(gus.slice(0, 12), g => u(`/region/${encodeURIComponent(sido)}/${encodeURIComponent(g)}/`))), { wide: true, note: '매장 수 많은 순 12곳' }) : ''}
    ${vizPanel('브랜드 TOP 10', hBars(brands.slice(0, 10).map(([k, a]) => ({ label: k, value: a.length, href: u(`/listings/?q=${encodeURIComponent((gugun ? `${sido} ${gugun}` : sido) + ' ' + k)}`) })), { color: '#282864' }))}
    ${vizPanel('업종 구성', donut(kinds.map(([k, a]) => ({ label: k, value: a.length }))))}
    ${vizPanel('권리금 구간별 매장 수', premiumHistogram(items))}
    ${vizPanel('월수익 구간 분포', profitHistogram(items))}
  </div>`;
}
function themeViz(items) {
  const kinds = groupBy(items, kindOf); const regions = groupBy(items, l => l.sido); const brands = groupBy(items, l => l.brand);
  return `<div class="viz-grid">
    ${vizPanel('월매출·월수익·권리금 범위', rangeBars(items), { note: vizNote(items), wide: true })}
    ${vizPanel('업종 구성', donut(kinds.map(([k, a]) => ({ label: k, value: a.length }))))}
    ${vizPanel('권리금 구간별 매장 수', premiumHistogram(items))}
    ${vizPanel('지역별 매장 수', hBars(regions.map(([k, a]) => ({ label: k, value: a.length, href: u(`/region/${encodeURIComponent(k)}/`) })), { top: 6 }))}
    ${vizPanel('브랜드 TOP 8', hBars(brands.slice(0, 8).map(([k, a]) => ({ label: k, value: a.length })), { color: '#282864' }))}
    ${vizPanel('업종별 평균 월매출·월수익', dataTable(SUMMARY_COLS, summaryRows(kinds.slice(0, 10))), { wide: true, note: '매장 수 많은 업종 순' })}
  </div>`;
}
function budgetViz(items, slug) {
  const kinds = groupBy(items, kindOf); const regions = groupBy(items, l => l.sido); const brands = groupBy(items, l => l.brand);
  return `<div class="viz-grid">
    ${vizPanel('예산 구간별 매장 수 (현재 구간 강조)', premiumHistogram(items.length ? [...items, ...[]] : [], { highlight: slug }), { note: '이 페이지 구간만 표시됩니다. 전체 분포는 예산별 메인에서 확인하세요.' })}
    ${vizPanel('월수익 구간 분포', profitHistogram(items), { note: vizNote(items) })}
    ${vizPanel('월매출·월수익·권리금 범위', rangeBars(items), { wide: true })}
    ${vizPanel('업종 구성', donut(kinds.map(([k, a]) => ({ label: k, value: a.length }))))}
    ${vizPanel('지역별 매장 수', hBars(regions.map(([k, a]) => ({ label: k, value: a.length, href: u(`/region/${encodeURIComponent(k)}/`) })), { top: 6 }))}
    ${vizPanel('브랜드 TOP 10', hBars(brands.slice(0, 10).map(([k, a]) => ({ label: k, value: a.length })), { color: '#282864' }))}
    ${vizPanel('업종별 평균 월매출·월수익', dataTable(SUMMARY_COLS, summaryRows(kinds.slice(0, 10))), { wide: true })}
  </div>`;
}
function categoryViz(items) {
  const kinds = groupBy(items, kindOf); const regions = groupBy(items, l => l.sido); const brands = groupBy(items, l => l.brand);
  return `<div class="viz-grid">
    ${vizPanel('월매출·월수익·권리금 범위', rangeBars(items), { note: vizNote(items), wide: true })}
    ${vizPanel('세부 업종 구성', donut(kinds.map(([k, a]) => ({ label: k, value: a.length }))))}
    ${vizPanel('권리금 구간별 매장 수', premiumHistogram(items))}
    ${vizPanel('지역별 매장 수', hBars(regions.map(([k, a]) => ({ label: k, value: a.length, href: u(`/region/${encodeURIComponent(k)}/`) })), { top: 6 }))}
    ${brands.length ? vizPanel('브랜드 TOP 10', hBars(brands.slice(0, 10).map(([k, a]) => ({ label: k, value: a.length })), { color: '#282864' })) : vizPanel('월수익 구간 분포', profitHistogram(items))}
  </div>`;
}

const avg = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.round(v.reduce((s, l) => s + l[k], 0) / v.length) : 0; };
const min = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.min(...v.map(l => l[k])) : 0; };
const max = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.max(...v.map(l => l[k])) : 0; };

// 허브 공통: 통계 + 직답 문단 + 카드 그리드 + FAQ + CTA
function hubBody({ h1, lead, bullets, items, crumbs, filterLink, faq, sideChips = '', eyebrow = '', extra = '', banner = '', leadBox = '' }) {
  const stat = items.length ? `<div class="stats" style="margin:18px 0 26px">
    <div class="stat"><strong>${items.length}건</strong><span>등록 매장</span></div>
    <div class="stat"><strong>${avg(items, 'sales') ? esc(fmtMan(avg(items, 'sales'))) : '-'}</strong><span>평균 월매출</span></div>
    <div class="stat"><strong>${avg(items, 'profit') ? esc(fmtMan(avg(items, 'profit'))) : '-'}</strong><span>평균 월수익(세전)</span></div>
    <div class="stat"><strong>${min(items, 'premium') ? esc(fmtWon(min(items, 'premium'))) : '-'}<span style="font-size:1rem;color:var(--ink)">부터</span></strong><span>권리금 (보증금 별도)</span></div>
  </div>` : '';
  return `<div class="wrap">${breadcrumb(crumbs)}
    <section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="h1">${h1}</h1>${banner}
      <div class="summary-box" style="margin-top:16px"><p style="font-weight:700;margin:0 0 8px">${esc(lead)}</p><ul>${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>
      ${sideChips}${stat}${extra}
      <div class="sec__head"><h2 class="h2">매장 ${items.length}건</h2><a class="more" href="${filterLink}">검색에서 조건 추가 ${ICONS.arrow}</a></div>
      ${items.length ? `<div class="grid grid--4">${items.slice(0, 48).map((l, i) => listingCard(l, { eager: i < 4 })).join('')}</div>${items.length > 48 ? `<p style="text-align:center;margin-top:20px"><a class="btn btn--ink btn--lg" href="${filterLink}">나머지 ${items.length - 48}건 검색에서 보기 ${ICONS.arrow}</a></p>` : ''}` : `<div class="results__empty"><h3 class="h3">현재 등록된 매장이 없습니다</h3><p class="muted">창업 의뢰를 남기시면 조건에 맞는 매장이 등록될 때 담당자가 연락드립니다.</p><a class="btn btn--red btn--lg" href="${u('/inquiry/')}">창업 의뢰 남기기</a></div>`}
      ${leadBox ? `<div class="hub-lead">${leadBox}</div>` : ''}
    </section>
    ${faq ? `<section class="sec sec--tight">${faqBlock(faq)}</section>` : ''}
  </div>${ctaBand()}`;
}

export function hubPages(ctx) {
  const out = []; const { listings, byBrand, bySido, byGugun, byTheme, byCode, byKind, byBudget, byAgent, agents, brandsSorted, brandNames } = ctx;
  const ldList = (name, itemsAll, path) => { const items = itemsAll.filter(l => !l.sample); return ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: abs(path), mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.slice(0, 30).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/listing/${l.id}/`), name: l.title })) } }); };

  // ---- 매장 검색 페이지 (클라이언트 필터) ----
  const regionsMeta = {}; for (const s of SIDO_ORDER) if (bySido[s]) regionsMeta[s] = Object.entries(byGugun).filter(([k]) => k.startsWith(s + '/')).map(([k, arr]) => ({ name: k.split('/')[1], n: arr.length })).sort((a, b) => b.n - a.n);
  const meta = { regions: regionsMeta, brands: brandsSorted };
  out.push({ path: '/listings/', priority: 0.9, changefreq: 'daily', html: layout({ title: `창업 매장 검색 | 지역·브랜드·예산·업종으로 ${listings.length}건 비교 — 창업가이드`, desc: '서울·경기·인천 양도양수 창업 매장을 지역, 브랜드(메가커피·배스킨라빈스 등), 예산(권리금), 업종, 테마로 검색하세요. "인천 메가커피"처럼 지역과 브랜드를 함께 입력하면 해당 조건만 보여줍니다.', path: '/listings/', active: 'listings', bodyClass: 'is-search',
    extraHead: `<script id="search-meta" type="application/json">${JSON.stringify(meta).replace(/</g, '\\u003c')}</script>`,
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '매장 검색', href: '/listings/' }])}
      <div class="search-layout"><aside class="filters glass" id="filters" aria-label="검색 필터"></aside>
      <section><div class="results__head"><h1>창업 매장 <span class="hl">검색</span> <small class="muted" style="font-size:.9rem">총 <b id="resultCount">${listings.length}</b>건</small></h1><label>정렬 <select id="sort"><option value="recent">최신순</option><option value="profit">월수익 높은순</option><option value="sales">월매출 높은순</option><option value="premium-asc">권리금 낮은순</option><option value="premium-desc">권리금 높은순</option></select></label></div>
      <div class="results__parsed" id="parsed"></div>
      <div class="grid grid--4" id="results">${skeletonCards(8)}</div><nav class="pager" id="pager" aria-label="페이지"></nav>
      <noscript><div class="grid grid--4">${listings.slice(0, 24).map(l => listingCard(l)).join('')}</div></noscript></section></div>
      <button type="button" class="btn btn--ink filter-fab">${ICONS.menu}필터</button></div>
      <script type="module" src="${u('/js/search.js?v=' + BUILD_ID)}"></script>`,
    ld: [ldList('창업 매장 검색', listings, '/listings/')] }) });

  // ---- 브랜드 허브 ----
  out.push({ path: '/brand/', priority: 0.8, html: layout({ title: `브랜드별 창업 매장 | 메가커피·배스킨라빈스·롯데리아 등 ${brandsSorted.length}개 프랜차이즈 양도양수 — 창업가이드`, desc: `프랜차이즈 브랜드별 양도양수 창업 매장. ${brandsSorted.slice(0, 8).map(b => b.name).join(', ')} 등 ${brandsSorted.length}개 브랜드의 권리금·월매출·월수익을 비교하세요.`, path: '/brand/', active: 'brand',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '브랜드별', href: '/brand/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">BRANDS</p><h1 class="h1">브랜드별 <span class="hl">창업 매장</span></h1><p style="font-weight:700;margin:12px 0 20px">운영 중인 가맹점을 권리금으로 인수하는 양도양수 매장을 브랜드별로 모았습니다. 브랜드를 선택하면 평균 월매출·월수익과 권리금 범위, 지역 분포를 바로 확인할 수 있습니다.</p>
      <div class="viz-grid">
        ${vizPanel('매장 많은 브랜드 TOP 20', hBars(brandsSorted.slice(0, 20).map(b => ({ label: b.name, value: b.n, href: u(`/brand/${b.slug}/`) })), { top: 20, labelW: 120 }), { wide: true, note: `${brandsSorted.length}개 브랜드 · 등록 매장 기준` })}
        ${vizPanel('브랜드별 평균 월매출·월수익·최저 권리금 (TOP 20)', dataTable([{ key: 'logo', label: '', fmt: (v, r) => brandLogoImg(r.slug, r.name, { h: 22, cls: 'brand-logo brand-logo--tbl' }) || '&nbsp;' }, ...SUMMARY_COLS], summaryRows(brandsSorted.slice(0, 20).map(b => [b.name, byBrand[b.slug]]), nme => { const b = brandsSorted.find(x => x.name === nme); return b ? u(`/brand/${b.slug}/`) : ''; }).map(r => ({ ...r, slug: (brandsSorted.find(x => x.name === r.name) || {}).slug }))), { wide: true, note: '수익률 = 평균 월수익 ÷ 평균 월매출' })}
      </div>
      <div class="sec__head" style="margin-top:34px"><h2 class="h2">전체 브랜드 ${brandsSorted.length}개</h2><a class="more" href="${u('/listings/')}">매장 검색 ${ICONS.arrow}</a></div>
      <div class="grid grid--4 brand-cards">${brandsSorted.map(b => { const arr = byBrand[b.slug]; const logo = brandLogoImg(b.slug, b.name, { h: 30 }); return `<a class="card reveal brand-card" href="${u(`/brand/${b.slug}/`)}"><div class="card__body"><div class="brand-card__head">${logo || `<span class="brand-card__initial">${esc(b.name.slice(0, 1))}</span>`}${badge(`${b.n}건`, 'yellow')}</div><h3 class="card__title" style="min-height:auto;font-size:1.15rem">${esc(b.name)} 창업</h3><dl class="card__nums"><div><dt>평균 월매출</dt><dd>${avg(arr, 'sales') ? esc(fmtMan(avg(arr, 'sales'))) : '-'}</dd></div><div><dt>평균 월수익</dt><dd class="hot">${avg(arr, 'profit') ? esc(fmtMan(avg(arr, 'profit'))) : '-'}</dd></div><div><dt>권리금</dt><dd class="cool">${min(arr, 'premium') ? esc(fmtWon(min(arr, 'premium'))) + '~' : '협의'}</dd></div></dl></div></a>`; }).join('')}</div><div class="hub-lead">${leadForm({ title: '찾는 브랜드가 없다면 담당자가 찾아드립니다' })}</div></section></div>${ctaBand()}` }) });
  for (const b of brandsSorted) {
    const arr = byBrand[b.slug]; const regions = Object.entries(arr.reduce((m, l) => { const k = [l.sido, l.gugun].filter(Boolean).join(' '); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, c) => c[1] - a[1]);
    const name = b.name;
    const faq = [
      { q: `${name} 양도양수 창업 비용은 얼마인가요?`, a: `현재 창업가이드에 등록된 ${name} 매장 ${arr.length}건의 권리금은 ${min(arr, 'premium') ? `${fmtWon(min(arr, 'premium'))}부터 ${fmtWon(max(arr, 'premium'))}까지` : '담당자 협의'}이며, 임대보증금은 별도입니다. 매장 규모·상권·매출에 따라 달라지므로 각 매장의 담당자에게 총 창업비용을 확인하세요.` },
      { q: `${name} 매장의 월매출·월수익은 어느 정도인가요?`, a: `등록 매장 기준 평균 월매출은 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '매장별 상이'}, 평균 월수익(세전)은 ${avg(arr, 'profit') ? fmtMan(avg(arr, 'profit')) : '매장별 상이'}입니다. 각 매장 페이지에서 재료비·인건비·월비용·관리비·기타경비 비율까지 확인할 수 있습니다.` },
      { q: `${name} 가맹점을 인수하면 본사 승인이 필요한가요?`, a: `프랜차이즈 가맹점 양도양수는 본사의 양수인 승인(교육 이수, 계약 승계)이 필요합니다. 창업가이드 담당 창업전문가가 양도인·본사와의 절차를 함께 진행합니다.` },
      { q: `${name} 매장은 어느 지역에 있나요?`, a: `현재 ${regions.slice(0, 6).map(([k, n]) => `${k}(${n}건)`).join(', ')} 등에 등록되어 있습니다. 정확한 위치는 양도인 보안을 위해 상담 후 안내합니다.` },
    ];
    out.push({ path: `/brand/${b.slug}/`, priority: 0.8, changefreq: 'daily', html: layout({ title: `${name} 창업 매장 ${arr.length}건 | ${name} 양도양수 권리금·월매출·월수익 비교 — 창업가이드`, desc: `${name} 창업을 준비한다면 운영 중인 ${name} 매장 양도양수 매장 ${arr.length}건을 비교하세요. 평균 월매출 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '-'}, 권리금 ${min(arr, 'premium') ? fmtWon(min(arr, 'premium')) + '부터' : '협의'}. ${regions.slice(0, 4).map(r => r[0]).join('·')} 등. 담당 창업전문가 바로 통화.`, path: `/brand/${b.slug}/`, active: 'brand', keywords: [`${name} 창업`, `${name} 양도양수`, `${name} 창업비용`, `${name} 권리금`, `${name} 월매출`], ld: [ldList(`${name} 창업 매장`, arr, `/brand/${b.slug}/`)],
      body: hubBody({ eyebrow: '브랜드별 창업', h1: `${esc(name)} 창업 매장 <span class="hl">${arr.length}건</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '브랜드별', href: '/brand/' }, { name, href: `/brand/${b.slug}/` }], filterLink: u(`/listings/?brandSlug=${b.slug}`), items: arr, faq,
        lead: `${ctx.brandInfo?.[b.slug]?.intro ? ctx.brandInfo[b.slug].intro.trim() + ' ' : ''}${name} 창업은 신규 가맹보다 운영 중인 매장을 권리금으로 인수하는 양도양수가 매출을 검증한 뒤 시작할 수 있어 안전합니다. 창업가이드에 등록된 ${name} 매장 ${arr.length}건의 핵심 숫자입니다.`,
        bullets: [`권리금 범위: ${min(arr, 'premium') ? `${fmtWon(min(arr, 'premium'))} ~ ${fmtWon(max(arr, 'premium'))}` : '담당자 협의'} (임대보증금 별도)`, `월매출: 평균 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '-'} · 월수익(세전): 평균 ${avg(arr, 'profit') ? fmtMan(avg(arr, 'profit')) : '-'}`, `지역: ${regions.slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ')}`, `담당: ${[...new Set(arr.map(l => l.agentName))].filter(Boolean).slice(0, 6).join(', ')} 창업전문가`],
        sideChips: `${brandLogoImg(b.slug, name, { h: 44, cls: 'brand-logo brand-logo--hero' })}<div class="chips" style="margin:14px 0">${regions.slice(0, 12).map(([k, n]) => `<a class="chip" href="${u(`/listings/?q=${encodeURIComponent(k.split(' ')[0] + ' ' + name)}`)}">${esc(k)} ${esc(name)}<small>${n}</small></a>`).join('')}</div>`,
        extra: brandViz(arr, b), leadBox: leadForm({ preset: { brand: name }, title: `${name} 매장, 조건에 맞춰 찾아드립니다` }) }) }) });
  }

  // ---- 지역 허브 ----
  const sidoCounts = Object.fromEntries(Object.entries(bySido).map(([k, a]) => [k, a.length]));
  const sidosWith = SIDO_ORDER.filter(sd => bySido[sd]);
  const guOf = sd => Object.entries(byGugun).filter(([k]) => k.startsWith(sd + '/')).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => [k.split('/')[1], a]);
  out.push({ path: '/region/', priority: 0.8, html: layout({ title: `지역별 창업 매장 | 서울·경기·인천 구·시별 양도양수 창업 — 창업가이드`, desc: `지역별 양도양수 창업 매장. 서울 ${(bySido['서울'] || []).length}건, 경기 ${(bySido['경기'] || []).length}건, 인천 ${(bySido['인천'] || []).length}건. 구·시 단위로 권리금·월매출을 비교하세요.`, path: '/region/', active: 'region',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">REGIONS</p><h1 class="h1">지역별 <span class="hl">창업 매장</span></h1><p style="font-weight:700;margin:12px 0 0">지도에서 지역을 선택하거나 아래 구·시 단위로 들어가면 권리금·월매출·월수익을 비교할 수 있습니다. 정확한 매장 위치는 양도인 보안을 위해 상담 후 안내합니다.</p>
      <div class="region-map-layout" data-region-map>
        <div class="region-map-layout__map panel-card">${koreaMap(sidoCounts, { id: 'kmap-index' })}</div>
        <div class="region-map-layout__side">
          <div class="chips chips--sido" aria-label="시도 선택"><a class="chip is-on" href="${u('/listings/')}" data-sido="">전체 <b>${listings.length}</b></a>${SIDO_ORDER.map(sd => { const c = sidoCounts[sd] || 0; return `<a class="chip ${c ? '' : 'is-dim'}" href="${c ? u(`/region/${encodeURIComponent(sd)}/`) : u('/inquiry/')}" data-sido="${esc(sd)}">${esc(sd)} <b>${c}</b></a>`; }).join('')}</div>
          <div class="tabs" data-tabs><div class="tabs__nav" role="tablist" hidden>${sidosWith.map((sd, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" id="rgi-tab-${i}" aria-controls="rgi-${i}" type="button" data-sido-tab="${esc(sd)}">${esc(sd)}</button>`).join('')}</div>
            <div class="tabs__panels">${sidosWith.map((sd, i) => { const gus = guOf(sd); const items = bySido[sd]; return `<div class="tabs__panel" role="tabpanel" id="rgi-${i}" ${i ? 'hidden' : ''}>
              <div class="sec__head" style="margin:14px 0 10px"><h2 class="h2" style="font-size:1.3rem"><a href="${u(`/region/${encodeURIComponent(sd)}/`)}">${esc(SIDO_FULL[sd] || sd)} <span class="hl">${items.length}건</span></a></h2><a class="more" href="${u(`/region/${encodeURIComponent(sd)}/`)}">${esc(sd)} 상세 ${ICONS.arrow}</a></div>
              <div class="stats stats--mini"><div class="stat"><strong>${avg(items, 'sales') ? esc(fmtMan(avg(items, 'sales'))) : '-'}</strong><span>평균 월매출</span></div><div class="stat"><strong class="hot">${avg(items, 'profit') ? esc(fmtMan(avg(items, 'profit'))) : '-'}</strong><span>평균 월수익</span></div><div class="stat"><strong class="cool">${min(items, 'premium') ? esc(fmtWon(min(items, 'premium'))) : '-'}</strong><span>최저 권리금</span></div></div>
              ${hBars(gus.slice(0, 12).map(([g, a]) => ({ label: g, value: a.length, href: u(`/region/${encodeURIComponent(sd)}/${encodeURIComponent(g)}/`) })), { top: 12, labelW: 90 })}
              ${gus.length > 12 ? `<div class="regions" style="margin-top:12px">${gus.slice(12).map(([g, a]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(sd)}/${encodeURIComponent(g)}/`)}">${esc(g)}<small>${a.length}</small></a>`).join('')}</div>` : ''}
            </div>`; }).join('')}<div class="tabs__skeleton" hidden><div class="sk" style="height:220px"></div></div></div>
          </div>
        </div>
      </div>
      <div class="viz-grid" style="margin-top:28px">
        ${vizPanel('시도별 평균 월매출·월수익·최저 권리금', dataTable(SUMMARY_COLS, summaryRows(sidosWith.map(sd => [sd, bySido[sd]]), sd => u(`/region/${encodeURIComponent(sd)}/`))), { wide: true, note: vizNote(listings) })}
        ${vizPanel('매장 많은 구·시 TOP 15', hBars(Object.entries(byGugun).sort((a, b) => b[1].length - a[1].length).slice(0, 15).map(([k, a]) => ({ label: k.replace('/', ' '), value: a.length, href: u(`/region/${encodeURIComponent(k.split('/')[0])}/${encodeURIComponent(k.split('/')[1])}/`) })), { top: 15, labelW: 120 }), { wide: true })}
        ${vizPanel('시도별 권리금 구간 분포', dataTable([{ key: 'name', label: '지역', fmt: (v, r) => `<a href="${r.href}">${esc(v)}</a>` }, ...BUDGETS.map(b => ({ key: b.slug, label: budgetShort(b), align: 'right', fmt: v => v ? `${v}건` : '-' }))], sidosWith.map(sd => ({ name: sd, href: u(`/region/${encodeURIComponent(sd)}/`), ...Object.fromEntries(BUDGETS.map(b => [b.slug, bySido[sd].filter(l => l.premium && l.premium >= b.min && l.premium < b.max).length])) }))), { wide: true, note: '권리금(임대보증금 제외) 구간별 매장 수' })}
      </div>
      <div class="sec__head" style="margin-top:34px"><h2 class="h2">지역별 최신 매장</h2><a class="more" href="${u('/listings/')}">전체 매장 ${ICONS.arrow}</a></div>
      <div class="grid grid--4">${listings.slice(0, 8).map((l, i) => listingCard(l, { eager: i < 4 })).join('')}</div>
    <div class="hub-lead">${leadForm({ title: '원하는 상권을 알려주시면 매장을 찾아드립니다' })}</div></section></div>${ctaBand()}` }) });
  for (const s of SIDO_ORDER.filter(s => bySido[s])) {
    const arr = bySido[s]; const gus = Object.entries(byGugun).filter(([k]) => k.startsWith(s + '/')).sort((a, b) => b[1].length - a[1].length);
    const brands = Object.entries(arr.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
    const full = SIDO_FULL[s] || s;
    const mk = (name, path, items, crumbs, isGu) => {
      const bl = Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
      const kinds = Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
      const faq = [
        { q: `${name} 창업 매장의 권리금은 얼마부터인가요?`, a: `${name}에 등록된 양도양수 매장 ${items.length}건의 권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터 ${fmtWon(max(items, 'premium'))}까지` : '담당자 협의'}입니다(임대보증금 별도). 업종별로는 ${kinds.slice(0, 4).map(([k, n]) => `${k} ${n}건`).join(', ')} 순으로 많습니다.` },
        { q: `${name}에서 많이 나오는 창업 브랜드는?`, a: bl.length ? `${bl.slice(0, 6).map(([k, n]) => `${k}(${n}건)`).join(', ')} 순입니다. "${name.split(' ').pop()} ${bl[0][0]}"처럼 지역과 브랜드를 함께 검색하면 해당 조건의 매장만 볼 수 있습니다.` : '브랜드 매장은 수시로 등록됩니다. 창업 의뢰를 남기시면 조건에 맞는 매장이 나올 때 연락드립니다.' },
        { q: `${name} 매장의 정확한 위치를 알 수 있나요?`, a: '양도인의 영업 보안을 위해 사이트에는 시·구 단위까지만 표시합니다. 담당 창업전문가와 상담하면 정확한 위치와 임대 조건을 안내하고 현장 답사를 함께 진행합니다.' },
      ];
      return { path, priority: 0.8, changefreq: 'daily', ld: [ldList(`${name} 창업 매장`, items, path)], html: layout({ title: `${name} 창업 매장 ${items.length}건 | ${name} 양도양수 권리금·월매출 — 창업가이드`, desc: `${name} 양도양수 창업 매장 ${items.length}건. ${bl.slice(0, 5).map(b => b[0]).join('·')} 등 브랜드, ${kinds.slice(0, 4).map(k => k[0]).join('·')} 업종. 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}.`, path, active: 'region', keywords: [`${name} 창업`, `${name} 양도양수`, `${name} 카페 창업`, `${name} 창업 매장`],
        body: hubBody({ eyebrow: '지역별 창업', h1: `${esc(name)} 창업 매장 <span class="hl">${items.length}건</span>`, crumbs, filterLink: u(`/listings/?q=${encodeURIComponent(name)}`), items, faq,
          lead: `${name}에서 운영 중인 매장을 권리금으로 인수하는 양도양수 창업 매장입니다. 월매출·월수익·권리금을 숫자로 비교하고 담당자와 바로 통화하세요.`,
          bullets: [`권리금 범위: ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '담당자 협의'} (임대보증금 별도)`, `평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `브랜드: ${bl.slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ') || '-'}`, `업종: ${kinds.slice(0, 6).map(([k, n]) => `${k} ${n}건`).join(', ')}`],
          sideChips: isGu ? `<div class="chips" style="margin:14px 0">${bl.slice(0, 10).map(([k, n]) => `<a class="chip" href="${u(`/listings/?q=${encodeURIComponent(name.split(' ').pop() + ' ' + k)}`)}">${esc(name.split(' ').pop())} ${esc(k)}<small>${n}</small></a>`).join('')}</div>` : `<div class="regions" style="margin:14px 0">${gus.map(([k, a2]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(s)}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${a2.length}</small></a>`).join('')}</div>`,
          extra: regionViz(items, { sido: s, gugun: isGu ? name.split(' ').pop() : '', bySido, byGugun }), leadBox: leadForm({ preset: { sido: ['서울', '경기', '인천'].includes(s) ? s : '기타', gugun: isGu ? name.split(' ').pop() : '' }, title: `${name} 매장을 조건별로 찾아드립니다` }) }) }) };
    };
    out.push(mk(full, `/region/${encodeURIComponent(s)}/`, arr, [{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }, { name: full, href: `/region/${encodeURIComponent(s)}/` }], false));
    for (const [k, items] of gus) { const g = k.split('/')[1]; out.push(mk(`${s} ${g}`, `/region/${encodeURIComponent(s)}/${encodeURIComponent(g)}/`, items, [{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }, { name: full, href: `/region/${encodeURIComponent(s)}/` }, { name: g, href: `/region/${encodeURIComponent(s)}/${encodeURIComponent(g)}/` }], true)); }
  }

  // ---- 테마 허브 ----
  const themeItems = t => themeItemsOf(t, ctx);
  out.push({ path: '/theme/', priority: 0.7, html: layout({ title: '테마별 창업 | 초보창업·소자본창업·여성창업·시니어창업·고수익·프랜차이즈 매장 — 창업가이드', desc: '창업 방식과 상황에 맞춘 테마별 양도양수 매장. 초보창업, 소자본창업, 여성창업, 시니어창업, 고수익창업, 프랜차이즈창업, 수익형(투자) 창업.', path: '/theme/', active: 'theme',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '테마별', href: '/theme/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">THEMES</p><h1 class="h1">테마별 <span class="hl">창업</span></h1><p style="font-weight:700;margin:12px 0 0">창업 상황에 맞춰 매장을 묶었습니다. 테마마다 평균 수익과 많이 나오는 업종, 맞는 사람을 함께 정리했습니다.</p>
      <div class="rcards">${THEMES.map(t => { const items = themeItems(t); return richCard({ href: u(`/theme/${t.slug}/`), img: coverFor('t-' + t.slug, items), alt: `${t.name} 대표 매장 사진`, name: t.name, items, sub: t.h1, note: `이런 분께: ${THEME_DETAIL[t.slug].fit[0]}` }); }).join('')}</div>
      <div class="viz-grid" style="margin-top:30px">
        ${vizPanel('테마별 비교: 매장 수·평균 월매출·월수익·최저 권리금', dataTable(SUMMARY_COLS, summaryRows(THEMES.map(t => [t.name, themeItems(t)]), nme => { const t = THEMES.find(x => x.name === nme); return t ? u(`/theme/${t.slug}/`) : ''; })), { wide: true, note: vizNote(listings) })}
        ${vizPanel('테마별 매장 수', vBars(THEMES.map(t => ({ label: t.name.replace('창업', ''), value: themeItems(t).length, href: u(`/theme/${t.slug}/`) })), { height: 170 }))}
        ${vizPanel('테마별 평균 월수익', vBars(THEMES.map(t => ({ label: t.name.replace('창업', ''), value: avg(themeItems(t), 'profit') })), { unit: '만', color: '#E0282E', height: 170 }))}
      </div>
      <div class="hub-lead">${leadForm({ title: '어떤 테마가 맞는지 모르겠다면 담당자가 골라드립니다' })}</div></section></div>${ctaBand()}` }) });
  for (const t of THEMES) {
    const items = themeItems(t);
    const faq = [
      { q: `${t.kw}에 맞는 업종은 무엇인가요?`, a: `창업가이드 ${t.name} 매장 ${items.length}건 중 ${Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k}(${n}건)`).join(', ')} 순으로 많습니다. ${t.desc}` },
      { q: `${t.kw} 예산은 얼마나 필요한가요?`, a: `등록 매장 기준 권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'}이며 임대보증금이 별도로 필요합니다. 평균 월수익(세전)은 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '매장별 상이'}입니다.` },
      { q: '처음 창업인데 어떤 순서로 진행하나요?', a: '매장 선택 → 담당자 전화·문자 상담 → 매출 자료와 임대 조건 확인 → 현장 답사(담당자 동행) → 권리금·인수 조건 협의 → 계약·인수 순서로 진행합니다. 프랜차이즈는 본사 승인과 교육이 추가됩니다.' },
    ];
    out.push({ path: `/theme/${t.slug}/`, priority: 0.8, changefreq: 'daily', ld: [ldList(t.name, items, `/theme/${t.slug}/`)], html: layout({ title: `${t.kw} 매장 ${items.length}건 | ${t.h1} — 창업가이드`, desc: `${t.desc} 현재 ${items.length}건, 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}.`, path: `/theme/${t.slug}/`, active: 'theme', keywords: [t.kw, t.name, `${t.kw} 매장`, `${t.kw} 추천`],
      body: hubBody({ eyebrow: t.name, h1: esc(t.h1), crumbs: [{ name: '홈', href: '/' }, { name: '테마별', href: '/theme/' }, { name: t.name, href: `/theme/${t.slug}/` }], filterLink: u(`/listings/?theme=${encodeURIComponent(t.name)}`), items, faq,
        lead: t.desc, bullets: [`현재 ${t.name} 매장 ${items.length}건`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '협의'} (임대보증금 별도)`, `평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`], extra: themeViz(items), banner: detailBanner(coverFor('t-' + t.slug, items), '선정 기준', THEME_DETAIL[t.slug].rule, THEME_DETAIL[t.slug].fit, THEME_DETAIL[t.slug].check), leadBox: leadForm({ preset: { style: t.slug === 'profit' ? '오토·투잡' : '' }, title: `${t.name}, 조건에 맞는 매장을 찾아드립니다` }) }) }) });
  }

  // ---- 예산 허브 ----
  out.push({ path: '/budget/', priority: 0.7, html: layout({ title: '예산별 창업 매장 | 권리금 1억 미만부터 6억 이상까지 — 창업가이드', desc: '창업 예산(권리금)별 양도양수 매장. 1억 미만 소자본 창업부터 6억 이상 대형 매장까지 구간별로 월매출·월수익을 비교하세요. 임대보증금 별도.', path: '/budget/', active: 'budget',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '예산별', href: '/budget/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">BUDGET</p><h1 class="h1">예산별 <span class="hl">창업 매장</span></h1><p style="font-weight:700;margin:12px 0 0">표시 금액은 임대보증금을 제외한 권리금입니다. 총 창업비용은 담당자가 매장별로 안내합니다.</p>
      <div class="rcards rcards--3">${BUDGETS.map(b => { const items = photoFirst(byBudget[b.slug] || []); const m = avgPayback(items); return richCard({ href: u(`/budget/${b.slug}/`), img: coverFor('b-' + b.slug, items), alt: `권리금 ${b.name} 대표 매장 사진`, name: budgetShort(b), items, note: m ? `평균 회수 약 ${m}개월 (권리금 ÷ 월수익 단순 계산)` : '' }); }).join('')}</div>
      <div class="sec__head block-head"><div><span class="eyebrow">예산별 추천</span><h2 class="h2">예산 안에서 <span class="hl">회수가 빠른 매장</span></h2></div></div>
      ${railTabs('bg', BUDGETS.map(b => { const items = byBudget[b.slug] || []; const sorted = photoFirst(items.filter(l => paybackMonths(l) != null && l.premium >= 500).sort((x, y) => paybackMonths(x) - paybackMonths(y))); return { name: budgetShort(b), count: items.length, line: `권리금 ${b.name} 매장 중 회수 기간이 짧은 순`, rule: '권리금 ÷ 월수익(세전) 단순 계산, 점주 인건비 제외', items: sorted }; }))}
      <div class="sec__head block-head"><div><span class="eyebrow">성향별 추천</span><h2 class="h2">나에게 맞는 기준으로 <span class="hl">고르기</span></h2></div><a class="more" href="${u('/pick/')}">성향별 전체 ${ICONS.arrow}</a></div>
      ${railTabs('bp', PICKS.map(p => { const items = pickItems(p, listings); return { name: p.name, count: items.length, line: p.hook, rule: p.rule, items }; }).filter(t => t.items.length))}
      <div class="hub-lead">${leadForm({ title: '예산만 알려주시면 맞는 매장을 추려드립니다' })}</div>
      <div class="viz-grid" style="margin-top:30px">
        ${vizPanel('권리금 구간별 매장 수', premiumHistogram(listings), { note: vizNote(listings) })}
        ${vizPanel('구간별 평균 월수익', vBars(BUDGETS.map(b => ({ label: budgetShort(b), value: avg(byBudget[b.slug] || [], 'profit'), href: u(`/budget/${b.slug}/`) })), { unit: '만', color: '#E0282E' }))}
        ${vizPanel('예산 구간별 비교표', dataTable([...SUMMARY_COLS.slice(0, 5), { key: 'kinds', label: '많은 업종', fmt: v => esc(v) }], summaryRows(BUDGETS.map(b => [b.name, byBudget[b.slug] || []]), nme => { const b = BUDGETS.find(x => x.name === nme); return b ? u(`/budget/${b.slug}/`) : ''; }).map(r => ({ ...r, kinds: groupBy(byBudget[(BUDGETS.find(x => x.name === r.name) || {}).slug] || [], kindOf).slice(0, 3).map(([k, a]) => `${k} ${a.length}`).join(' · ') }))), { wide: true, note: '권리금(임대보증금 제외) 기준' })}
      </div></section></div>${ctaBand()}` }) });
  for (const b of BUDGETS) {
    const items = photoFirst((byBudget[b.slug] || []).slice().sort((a, c) => (c.profit || 0) - (a.profit || 0)));
    const faq = [
      { q: `권리금 ${b.name} 창업 매장은 어떤 업종이 많나요?`, a: `${Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, n]) => `${k}(${n}건)`).join(', ') || '등록 대기'} 순입니다.` },
      { q: '권리금 외에 추가로 드는 비용은?', a: '임대보증금, 첫 달 월세, 프랜차이즈 본사 승인 관련 비용(교육비·양수 수수료 등), 필요 시 시설 보수비가 추가됩니다. 담당자가 매장별 총 창업비용을 정리해 드립니다.' },
      { q: '권리금은 협상이 가능한가요?', a: '양도인의 사정과 매장 상태에 따라 조정되는 경우가 있습니다. 담당 창업전문가가 양도인과 협의해 조건을 조율합니다.' },
    ];
    out.push({ path: `/budget/${b.slug}/`, priority: 0.7, changefreq: 'daily', ld: [ldList(`권리금 ${b.name} 창업 매장`, items, `/budget/${b.slug}/`)], html: layout({ title: `권리금 ${b.name} 창업 매장 ${items.length}건 | 예산별 양도양수 — 창업가이드`, desc: `창업 예산 권리금 ${b.name} 구간의 양도양수 매장 ${items.length}건. 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}. 임대보증금 별도.`, path: `/budget/${b.slug}/`, active: 'budget', keywords: [`${b.name} 창업`, '소자본 창업', '창업 비용', '권리금'],
      body: hubBody({ eyebrow: '예산별 창업', h1: `권리금 ${esc(b.name)} <span class="hl">창업 매장</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '예산별', href: '/budget/' }, { name: b.name, href: `/budget/${b.slug}/` }], filterLink: u(`/listings/?budget=${b.slug}`), items, faq,
        lead: `권리금 ${b.name} 예산으로 시작할 수 있는 양도양수 창업 매장입니다. 월수익이 높은 순으로 정렬했습니다. 임대보증금은 별도입니다.`, bullets: [`매장 ${items.length}건 · 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `브랜드: ${Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ') || '-'}`], extra: budgetViz(items, b.slug), banner: detailBanner(coverFor('b-' + b.slug, items), '예산 기준', `권리금 ${b.name} · 임대보증금 별도 · 평균 회수 약 ${avgPayback(items)}개월(권리금 ÷ 월수익 단순 계산)`), leadBox: leadForm({ preset: { budget: b.slug }, title: `권리금 ${b.name}으로 찾는 매장, 담당자가 추려드립니다` }) }) }) });
  }

  // ---- 성향별 추천 ----
  const pickData = PICKS.map(p => ({ ...p, items: pickItems(p, listings) })).filter(p => p.items.length);
  out.push({ path: '/pick/', priority: 0.8, changefreq: 'daily', html: layout({ title: `성향별 창업 매장 | 빠른 회수·소액 고수익·오토·브랜드 안정형 추천 — 창업가이드`, desc: `창업 성향에 맞춘 양도양수 매장. ${pickData.slice(0, 4).map(p => `${p.name} ${p.items.length}건`).join(', ')}. 월수익·권리금 숫자 기준으로 골랐습니다.`, path: '/pick/', active: 'pick', keywords: ['창업 추천', '소자본 고수익 창업', '오토 창업', '투잡 창업', '양도양수 추천'],
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '성향별', href: '/pick/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">BY STYLE</p><h1 class="h1">성향별 <span class="hl">추천 매장</span></h1><p style="font-weight:700;margin:12px 0 0">회수 기간, 수익 규모, 운영 방식처럼 무엇을 먼저 보느냐에 따라 맞는 매장이 달라집니다. 모든 기준은 등록 매장의 숫자로 계산했습니다.</p>
      <div class="rcards">${pickData.map(p => richCard({ href: u(`/pick/${p.slug}/`), img: coverFor('p-' + p.slug, p.items), alt: `${p.name} 대표 매장 사진`, name: p.name, items: p.items, sub: p.hook, note: `기준: ${p.rule}` })).join('')}</div>
      <div class="viz-grid" style="margin-top:30px">${vizPanel('성향별 비교: 매장 수·평균 월매출·월수익·최저 권리금', dataTable(SUMMARY_COLS, summaryRows(pickData.map(p => [p.name, p.items]), nme => { const p = pickData.find(x => x.name === nme); return p ? u(`/pick/${p.slug}/`) : ''; })), { wide: true, note: vizNote(listings) })}</div>
      <div class="hub-lead">${leadForm({ title: '내 성향에 맞는 매장을 담당자가 골라드립니다' })}</div></section></div>${ctaBand()}` }) });
  for (const p of pickData) {
    const items = p.items; const path = `/pick/${p.slug}/`;
    const faq = [
      { q: `${p.name} 매장은 어떤 기준으로 골랐나요?`, a: `${p.rule}인 매장만 모았습니다. 현재 ${items.length}건이 해당합니다.` },
      { q: '회수 기간과 월수익은 어떻게 계산하나요?', a: '회수 기간은 권리금을 월수익(세전)으로 나눈 단순 계산이며, 월수익에는 점주 인건비가 포함되어 있지 않습니다. 임대보증금과 세금, 실제 인수 후 매출 변동은 반영되지 않으므로 담당자와 자료를 확인한 뒤 판단하세요.' },
      { q: `${p.name} 매장은 바로 인수할 수 있나요?`, a: '양도인 일정과 임대차 승계, 프랜차이즈는 본사 승인 절차에 따라 달라집니다. 담당 창업전문가가 매장별 일정을 안내합니다.' },
    ];
    out.push({ path, priority: 0.8, changefreq: 'daily', ld: [ldList(`${p.name} 창업 매장`, items, path)], html: layout({ title: `${p.name} 창업 매장 ${items.length}건 | ${p.hook} — 창업가이드`, desc: `${p.desc} ${p.rule} 매장 ${items.length}건, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}.`, path, active: 'pick', keywords: [`${p.name} 창업`, p.hook, '양도양수 추천'],
      body: hubBody({ eyebrow: '성향별 추천', h1: `${esc(p.name)} <span class="hl">${items.length}건</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '성향별', href: '/pick/' }, { name: p.name, href: path }], filterLink: u('/listings/'), items, faq, lead: p.desc, bullets: [`기준: ${p.rule}`, `평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '협의'} (임대보증금 별도)`], banner: detailBanner(coverFor('p-' + p.slug, items), p.name, p.hook), extra: themeViz(items), leadBox: leadForm({ title: `${p.name} 매장을 조건에 맞춰 찾아드립니다` }) }) }) });
  }

  // ---- 업종 허브 ----
  for (const c of CATEGORIES) {
    const items = byCode[c.code] || [];
    const kinds = c.kinds.map(k => [k, byKind[k[0]] || []]).filter(([, a]) => a.length);
    const faq = [
      { q: `${c.name} 창업은 어떤 세부 업종이 있나요?`, a: `${kinds.map(([k, a]) => `${k[1]}(${a.length}건)`).join(', ')} 매장이 등록되어 있습니다.` },
      { q: `${c.name} 매장의 평균 권리금과 월수익은?`, a: `권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'}, 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}입니다.` },
    ];
    out.push({ path: `/category/${c.slug}/`, priority: 0.8, changefreq: 'daily', ld: [ldList(`${c.name} 창업 매장`, items, `/category/${c.slug}/`)], html: layout({ title: `${c.name} 창업 매장 ${items.length}건 | ${kinds.slice(0, 4).map(k => k[0][1]).join('·')} 양도양수 — 창업가이드`, desc: `${c.name} 업종 양도양수 창업 매장 ${items.length}건. ${kinds.slice(0, 6).map(k => k[0][1]).join(', ')}. 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}.`, path: `/category/${c.slug}/`, active: 'listings', keywords: [`${c.name} 창업`, ...kinds.slice(0, 5).map(k => `${k[0][1]} 창업`)],
      body: hubBody({ eyebrow: '업종별 창업', h1: `${esc(c.name)} <span class="hl">창업 매장</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '매장 검색', href: '/listings/' }, { name: c.name, href: `/category/${c.slug}/` }], filterLink: u(`/listings/?code=${c.code}`), items, faq,
        lead: `${c.name} 업종의 운영 중인 매장을 권리금으로 인수하는 양도양수 매장입니다.`, bullets: [`세부 업종: ${kinds.map(([k, a]) => `${k[1]} ${a.length}건`).join(', ')}`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '협의'} (보증금 별도) · 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`],
        sideChips: `<div class="chips" style="margin:14px 0">${kinds.map(([k, a]) => `<a class="chip" href="${u(`/category/${c.slug}/${k[0]}/`)}">${esc(k[1])}<small>${a.length}</small></a>`).join('')}</div>`, extra: categoryViz(items), leadBox: leadForm({ preset: { category: c.name }, title: `${c.name} 매장을 조건별로 찾아드립니다` }) }) }) });
    for (const [k, items2] of kinds) {
      out.push({ path: `/category/${c.slug}/${k[0]}/`, priority: 0.7, changefreq: 'daily', ld: [ldList(`${k[1]} 창업 매장`, items2, `/category/${c.slug}/${k[0]}/`)], html: layout({ title: `${k[1]} 창업 매장 ${items2.length}건 | ${k[1]} 양도양수 권리금·월매출 — 창업가이드`, desc: `${k[1]} 양도양수 창업 매장 ${items2.length}건. 권리금 ${min(items2, 'premium') ? fmtWon(min(items2, 'premium')) + '부터' : '협의'}, 평균 월매출 ${avg(items2, 'sales') ? fmtMan(avg(items2, 'sales')) : '-'}, 평균 월수익 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '-'}.`, path: `/category/${c.slug}/${k[0]}/`, active: 'listings', keywords: [`${k[1]} 창업`, `${k[1]} 양도양수`, `${k[1]} 창업비용`],
        body: hubBody({ eyebrow: c.name, h1: `${esc(k[1])} <span class="hl">창업 매장</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '매장 검색', href: '/listings/' }, { name: c.name, href: `/category/${c.slug}/` }, { name: k[1], href: `/category/${c.slug}/${k[0]}/` }], filterLink: u(`/listings/?code=${c.code}&kind=${k[0]}`), items: items2,
          faq: [{ q: `${k[1]} 창업 비용은 얼마인가요?`, a: `등록 매장 기준 권리금 ${min(items2, 'premium') ? `${fmtWon(min(items2, 'premium'))}부터 ${fmtWon(max(items2, 'premium'))}까지` : '협의'}이며 임대보증금은 별도입니다. 평균 월수익(세전)은 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '매장별 상이'}입니다.` }, { q: `${k[1]} 매장은 어느 지역에 많나요?`, a: `${Object.entries(items2.reduce((m, l) => { const kk = [l.sido, l.gugun].filter(Boolean).join(' '); if (kk) m[kk] = (m[kk] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([kk, n]) => `${kk}(${n}건)`).join(', ')} 순입니다.` }],
          lead: `${k[1]} 업종의 양도양수 창업 매장입니다. 월매출·월수익·권리금을 비교하고 담당자와 상담하세요.`, bullets: [`매장 ${items2.length}건 · 평균 월매출 ${avg(items2, 'sales') ? fmtMan(avg(items2, 'sales')) : '-'} · 평균 월수익 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '-'}`, `브랜드: ${Object.entries(items2.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([kk, n]) => `${kk} ${n}건`).join(', ') || '-'}`], extra: categoryViz(items2), leadBox: leadForm({ preset: { category: c.name }, title: `${k[1]} 매장을 조건별로 찾아드립니다` }) }) }) });
    }
  }

  // ---- 키워드 허브 (창업 / 창업 아이템 / 카페 창업 / 치킨집 창업 / 양도양수) ----
  for (const k of KEYWORD_PAGES) {
    let items = listings;
    if (k.filter.code) items = byCode[k.filter.code] || [];
    if (k.filter.kind) items = byKind[k.filter.kind] || [];
    if (k.slug === 'items') items = [...listings].filter(l => l.profit).sort((a, b) => (b.profit || 0) - (a.profit || 0));
    if (k.slug === 'transfer') items = [...listings].sort((a, b) => Number(b.id) - Number(a.id));
    items = photoFirst(items);
    const kinds = Object.entries(items.reduce((m, l) => { const kk = l.kind2 || l.kind1; if (kk) m[kk] = (m[kk] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const brands = Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const leadMap = {
      startup: `창업을 준비할 때 가장 먼저 확인할 것은 실제 운영 중인 매장의 숫자입니다. 창업가이드는 서울·경기·인천의 양도양수 매장 ${items.length}건을 월매출·월수익·권리금과 함께 공개하고, 매장마다 담당 창업전문가가 상담부터 인수까지 함께합니다.`,
      items: `창업 아이템은 유행보다 숫자로 고르는 것이 안전합니다. 월수익이 확인된 매장을 수익 순으로 정렬했습니다. 업종별 수익 구조(재료비·인건비·월비용 비율)를 비교해 보세요.`,
      cafe: `카페 창업은 신규 오픈 시 인테리어·가맹비 부담이 크지만, 운영 중인 카페를 권리금으로 인수하면 매출을 확인한 뒤 시작할 수 있습니다. 메가커피·컴포즈커피·투썸플레이스·이디야 등 카페 양도양수 매장 ${items.length}건입니다.`,
      chicken: `치킨집 창업은 배달 비중과 홀 매출 구조를 함께 봐야 합니다. 교촌·BBQ·BHC 등 치킨 프랜차이즈 양도양수 매장 ${items.length}건의 월매출·월수익·권리금을 공개합니다.`,
      transfer: `양도양수는 운영 중인 점포의 시설·직원·거래처·단골을 그대로 인수하는 창업 방식입니다. 창업가이드는 사업체(권리금) 양도양수를 주업무로 하며, 부동산 중개대상물은 취급하지 않습니다.`,
    };
    const faqMap = {
      startup: [{ q: '창업 매장은 어떻게 고르나요?', a: '지역·브랜드·예산 세 가지를 먼저 정하고, 월매출 대비 월수익 비율과 권리금 회수 기간(권리금 ÷ 월수익)을 비교하세요. 창업가이드 검색창에 "인천 메가커피 1억 이하"처럼 입력하면 조건에 맞는 매장만 보여줍니다.' }, { q: '창업가이드 상담은 무료인가요?', a: '네. 매장 상담·현장 답사 동행은 무료이며, 온라인 문의는 24시간 접수합니다. 거래 성사 시 조건은 담당자가 사전에 안내합니다.' }],
      items: [{ q: '2026년 창업 아이템으로 월수익이 높은 업종은?', a: `창업가이드 등록 매장 기준 평균 월수익이 높은 업종은 ${kinds.slice(0, 5).map(([kk, n]) => kk).join(', ')} 순입니다. 단, 권리금과 투자 규모가 함께 커지므로 회수 기간을 같이 보셔야 합니다.` }, { q: '소자본으로 가능한 창업 아이템은?', a: '권리금 1억 미만 매장은 테이크아웃 카페, 분식·배달 전문점, 스터디카페 등이 많습니다. 예산별 페이지에서 구간별 매장을 확인하세요.' }],
      cafe: [{ q: '카페 창업 비용은 얼마나 드나요?', a: `양도양수 기준 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}이며, 여기에 임대보증금·첫 달 월세·본사 양수 승인 비용이 더해집니다. 신규 가맹보다 인테리어·설비 비용이 들지 않는 것이 장점입니다.` }, { q: '카페 창업 매장에서 꼭 확인할 것은?', a: '월매출의 계절 편차, 테이크아웃·배달 비중, 인건비 구조(점주 근무 시간), 임대차 잔여기간과 본사 리뉴얼 요구 여부입니다.' }],
      chicken: [{ q: '치킨집 창업 비용과 수익은?', a: `등록 매장 기준 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}입니다. 배달 수수료와 재료비 비율이 수익을 좌우합니다.` }, { q: '치킨 프랜차이즈 양도양수 절차는?', a: '매장 상담 → 매출 자료 확인 → 현장 답사 → 본사 양수인 승인(교육) → 계약·인수 순서입니다. 담당 창업전문가가 본사 절차를 함께 진행합니다.' }],
      transfer: [{ q: '양도양수 창업의 장점은?', a: '실제 매출을 확인한 뒤 결정할 수 있고, 인테리어·설비·직원·단골을 그대로 이어받아 오픈 초기 공백이 없습니다. 신규 창업 대비 초기 투자와 시행착오를 줄일 수 있습니다.' }, { q: '양도양수 시 주의할 점은?', a: '임대차 계약 승계(건물주 동의), 권리금 범위(시설·영업권 포함 여부), 미납 공과금·채무, 프랜차이즈 본사 승인 조건을 반드시 확인해야 합니다. 창업가이드 담당자가 체크리스트로 함께 확인합니다.' }],
    };
    out.push({ path: `/${k.slug}/`, priority: 0.9, changefreq: 'daily', ld: [ldList(k.kw, items, `/${k.slug}/`)], html: layout({ title: k.title + ' — 창업가이드', desc: leadMap[k.slug].slice(0, 155), path: `/${k.slug}/`, active: 'listings', keywords: [k.kw, `${k.kw} 비용`, `${k.kw} 추천`, `${k.kw} 매장`],
      body: hubBody({ eyebrow: k.kw.toUpperCase(), h1: esc(k.h1), crumbs: [{ name: '홈', href: '/' }, { name: k.kw, href: `/${k.slug}/` }], filterLink: u(k.filter.code ? `/listings/?code=${k.filter.code}` : k.filter.kind ? `/listings/?kind=${k.filter.kind}` : '/listings/'), items, faq: faqMap[k.slug],
        lead: leadMap[k.slug], bullets: [`매장 ${items.length}건 · 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'} (임대보증금 별도)`, `업종: ${kinds.slice(0, 6).map(([kk, n]) => `${kk} ${n}건`).join(', ')}`, brands.length ? `브랜드: ${brands.slice(0, 8).map(([kk, n]) => `${kk} ${n}건`).join(', ')}` : null].filter(Boolean),
        sideChips: `<div class="chips" style="margin:14px 0">${THEMES.map(t => `<a class="chip" href="${u(`/theme/${t.slug}/`)}">${esc(t.name)}</a>`).join('')}${BUDGETS.map(b => `<a class="chip" href="${u(`/budget/${b.slug}/`)}">${esc(b.name)}</a>`).join('')}</div>` }) }) });
  }

  // ---- 담당 전문가 ----
  const act = agents.filter(a => a.active);
  if (act.length) out.push({ path: '/agents/', priority: 0.6, html: layout({ title: `담당 창업전문가 ${act.length}명 | 브랜드·지역별 전문 분야, 매장별 담당자 직통 상담 — 창업가이드`, desc: `창업가이드의 담당 창업전문가 ${act.length}명. 전문 분야(카페·스크린골프·치킨 등)와 담당 지역, 실적을 공개하며 매장마다 담당자가 정해져 있어 통화·문자로 바로 상담할 수 있습니다.`, path: '/agents/', active: 'agents',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '담당 전문가', href: '/agents/' }])}<section class="sec sec--tight" style="padding-top:6px"><span class="eyebrow">담당 창업전문가</span><h1 class="h1">매장마다 <span class="hl">담당 전문가</span>가 정해져 있습니다</h1><p style="font-size:1.02rem;color:var(--ink-2);margin:14px 0 30px;max-width:64ch">전문 분야와 담당 지역은 각 전문가가 실제로 담당하는 매장 데이터로 계산한 것입니다. 매장 페이지의 전화 버튼을 누르면 담당자에게 바로 연결되고, 어떤 매장을 보셨는지 담당자에게 자동으로 전달됩니다.</p>
      <div class="agents-grid">${act.map(a => agentCard(a, ctx)).join('')}</div></section></div>${ctaBand()}`,
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: act.map((a, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Person', name: a.name, jobTitle: a.role, telephone: phoneTel(a.mobile), worksFor: { '@id': abs('/#org') }, url: abs(`/agents/${a.id}/`), knowsAbout: agentProfile(a, ctx).specialties } })) }] }) });
  for (const a of act) {
    const p = agentProfile(a, ctx); const items = p.items;
    const faq = [
      { q: `${a.name} 창업전문가는 어떤 매장을 주로 담당하나요?`, a: `${p.specialties.length ? p.specialties.join(', ') + ' 등 ' : ''}${items.length}건의 양도양수 매장을 담당하며, ${p.regions.length ? p.regions.map(r => r.k).join('·') + ' 등 ' : ''}${p.sidos.map(s => s.k).join('·')} 지역이 중심입니다.` },
      { q: '상담은 어떻게 신청하나요?', a: `직통 ${a.mobile}로 전화하시거나, 매장 페이지의 문자 상담 신청을 이용하세요.${SITE.phone ? ` 대표번호 ${SITE.phone}로도 24시간 접수` : ' 온라인 문의는 24시간 접수'}됩니다.` },
      { q: '담당자와 현장 답사가 가능한가요?', a: '네. 매출 자료와 임대 조건을 확인한 뒤 담당자가 현장에 동행합니다. 양도인의 영업 보안을 위해 정확한 위치는 상담 후 안내합니다.' },
    ];
    out.push({ path: `/agents/${a.id}/`, priority: 0.5, changefreq: 'weekly', html: layout({ title: `${a.name} ${a.role} | ${p.specialties.slice(0, 3).join('·') || '양도양수'} 전문 창업전문가, 담당 매장 ${items.length}건 — 창업가이드`, desc: `창업가이드 ${a.name} ${a.role}. ${p.summary} 직통 ${a.mobile}.`, path: `/agents/${a.id}/`, active: 'agents',
      ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: a.name, jobTitle: a.role, telephone: phoneTel(a.mobile), email: a.email || undefined, image: a.photo ? abs('/' + imgPath(a.photo)) : undefined, worksFor: { '@id': abs('/#org') }, url: abs(`/agents/${a.id}/`), knowsAbout: p.specialties, areaServed: p.regions.map(r => r.k), description: p.summary }],
      body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '담당 전문가', href: '/agents/' }, { name: a.name, href: `/agents/${a.id}/` }])}
        <section class="sec sec--tight" style="padding-top:6px">
          <div class="agent-hero"><div class="agent-hero__pic">${img(imgPath(a.photo), `${a.name} 창업전문가`, { w: 140, h: 140, lazy: false })}</div>
            <div><span class="eyebrow">담당 창업전문가</span><h1>${esc(a.name)}<small>${esc(a.role)}${p.career ? ` · ${esc(p.career)}` : ''}</small></h1>
              <p style="color:var(--ink-2);max-width:62ch;margin:10px 0 0">${esc(p.summary)}</p>
              <dl class="facts"><div><dt>전문 분야</dt><dd>${p.specialties.length ? `${esc(p.specialties.join(' · '))} 등` : '양도양수 전반'}</dd></div><div><dt>담당 지역</dt><dd>${esc(p.regions.map(r => r.k).join(' · ') || p.sidos.map(s => s.k).join(' · '))}</dd></div></dl>
              <div class="btns"><a class="btn btn--yellow btn--lg" href="tel:${esc(phoneTel(a.mobile))}" data-call="" data-agent="${esc(a.id)}" data-phone="${esc(a.mobile)}">${ICONS.phone}${esc(a.mobile)}</a><button class="btn btn--lg" type="button" data-sms="" data-agent="${esc(a.id)}" data-agent-name="${esc(a.name)}">${ICONS.sms}문자 상담 신청</button>${a.kakao ? `<button class="btn btn--lg" type="button" data-copy="${esc(a.kakao)}" data-copy-label="카카오톡 ID">${ICONS.kakao}카카오톡 ${esc(a.kakao)}</button>` : ''}</div>
              <p class="muted" style="font-size:.84rem;margin:12px 0 0">${a.tel || SITE.phone ? `사무실 ${esc(a.tel || SITE.phone)} · ` : ''}${a.email ? `${esc(a.email)} · ` : ''}${esc(SITE.address)}</p></div></div>
          ${p.brands.length || p.regions.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:20px">${p.brands.length ? `<div class="sales__box"><h3>담당 브랜드</h3><div class="chips">${p.brands.map(b => `<a class="chip" href="${u(`/listings/?brandSlug=${encodeURIComponent((items.find(l => l.brand === b.k) || {}).brandSlug || '')}`)}">${esc(b.k)}<small>${b.v}</small></a>`).join('')}</div></div>` : ''}${p.regions.length ? `<div class="sales__box"><h3>담당 지역</h3><div class="chips">${p.regions.map(r => `<span class="chip">${esc(r.k)}<small>${r.v}</small></span>`).join('')}</div></div>` : ''}${p.kinds.length ? `<div class="sales__box"><h3>담당 업종</h3><div class="chips">${p.kinds.map(k => `<span class="chip">${esc(k.k)}<small>${k.v}</small></span>`).join('')}</div></div>` : ''}</div>` : ''}
          ${p.intro ? `<div class="prose" style="margin-top:20px"><h3>담당자 인사말</h3>${p.intro.split(/\n{2,}/).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
          <div class="sec__head" style="margin-top:44px"><h2 class="h2">${esc(a.name)} 담당 매장 ${items.length}건</h2></div><div class="grid grid--4">${items.map(l => listingCard(l)).join('')}</div>
          <div style="margin-top:44px">${faqBlock(faq, { title: `${a.name} 전문가에게 자주 묻는 질문` })}</div>
        </section></div>${ctaBand()}` }) });
  }
  return out;
}
