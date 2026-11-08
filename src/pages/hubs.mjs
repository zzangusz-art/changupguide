// 허브 페이지: 매물 검색, 브랜드/지역/테마/예산/업종/키워드 허브, 담당 전문가
import { SITE, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER, SIDO_FULL, KEYWORD_PAGES, FAQ } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, CAT_ILLO, sticker, starburst, badge, listingCard, skeletonCards, breadcrumb, faqBlock, ctaBand, img, imgPath, jsonld } from '../lib/html.mjs';
import { fmtWon, fmtMan, fmtNum, phoneTel, GUGUN } from '../lib/text.mjs';
import { agentCard, agentProfile } from '../lib/agents.mjs';

const avg = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.round(v.reduce((s, l) => s + l[k], 0) / v.length) : 0; };
const min = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.min(...v.map(l => l[k])) : 0; };
const max = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.max(...v.map(l => l[k])) : 0; };

// 허브 공통: 통계 + 직답 문단 + 카드 그리드 + FAQ + CTA
function hubBody({ h1, lead, bullets, items, crumbs, filterLink, faq, sideChips = '', eyebrow = '', extra = '' }) {
  const stat = items.length ? `<div class="stats" style="margin:18px 0 26px">
    <div class="stat"><strong>${items.length}건</strong><span>등록 매물</span></div>
    <div class="stat"><strong>${avg(items, 'sales') ? esc(fmtMan(avg(items, 'sales'))) : '-'}</strong><span>평균 월매출</span></div>
    <div class="stat"><strong>${avg(items, 'profit') ? esc(fmtMan(avg(items, 'profit'))) : '-'}</strong><span>평균 월수익(세전)</span></div>
    <div class="stat"><strong>${min(items, 'premium') ? esc(fmtWon(min(items, 'premium'))) : '-'}<span style="font-size:1rem;color:var(--ink)">부터</span></strong><span>권리금 (보증금 별도)</span></div>
  </div>` : '';
  return `<div class="wrap">${breadcrumb(crumbs)}
    <section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="h1">${h1}</h1>
      <div class="summary-box" style="margin-top:16px"><p style="font-weight:700;margin:0 0 8px">${esc(lead)}</p><ul>${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>
      ${sideChips}${stat}${extra}
      <div class="sec__head"><h2 class="h2">매물 ${items.length}건</h2><a class="more" href="${filterLink}">검색에서 조건 추가 ${ICONS.arrow}</a></div>
      ${items.length ? `<div class="grid grid--4">${items.slice(0, 48).map((l, i) => listingCard(l, { eager: i < 4 })).join('')}</div>${items.length > 48 ? `<p style="text-align:center;margin-top:20px"><a class="btn btn--ink btn--lg" href="${filterLink}">나머지 ${items.length - 48}건 검색에서 보기 ${ICONS.arrow}</a></p>` : ''}` : `<div class="results__empty"><h3 class="h3">현재 등록된 매물이 없습니다</h3><p class="muted">창업 의뢰를 남기시면 조건에 맞는 매물이 등록될 때 담당자가 연락드립니다.</p><a class="btn btn--red btn--lg" href="${u('/inquiry/')}">창업 의뢰 남기기</a></div>`}
    </section>
    ${faq ? `<section class="sec sec--tight">${faqBlock(faq)}</section>` : ''}
  </div>${ctaBand()}`;
}

export function hubPages(ctx) {
  const out = []; const { listings, byBrand, bySido, byGugun, byTheme, byCode, byKind, byBudget, byAgent, agents, brandsSorted, brandNames } = ctx;
  const ldList = (name, items, path) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: abs(path), mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.slice(0, 30).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/listing/${l.id}/`), name: l.title })) } });

  // ---- 매물 검색 페이지 (클라이언트 필터) ----
  const regionsMeta = {}; for (const s of SIDO_ORDER) if (bySido[s]) regionsMeta[s] = Object.entries(byGugun).filter(([k]) => k.startsWith(s + '/')).map(([k, arr]) => ({ name: k.split('/')[1], n: arr.length })).sort((a, b) => b.n - a.n);
  const meta = { regions: regionsMeta, brands: brandsSorted };
  out.push({ path: '/listings/', priority: 0.9, changefreq: 'daily', html: layout({ title: `창업 매물 검색 | 지역·브랜드·예산·업종으로 ${listings.length}건 비교 — 창업가이드`, desc: '서울·경기·인천 양도양수 창업 매물을 지역, 브랜드(메가커피·배스킨라빈스 등), 예산(권리금), 업종, 테마로 검색하세요. "인천 메가커피"처럼 지역과 브랜드를 함께 입력하면 해당 조건만 보여줍니다.', path: '/listings/', active: 'listings', bodyClass: 'is-search',
    extraHead: `<script id="search-meta" type="application/json">${JSON.stringify(meta).replace(/</g, '\\u003c')}</script>`,
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '매물 검색', href: '/listings/' }])}
      <div class="search-layout"><aside class="filters glass" id="filters" aria-label="검색 필터"></aside>
      <section><div class="results__head"><h1>창업 매물 <span class="hl">검색</span> <small class="muted" style="font-size:.9rem">총 <b id="resultCount">${listings.length}</b>건</small></h1><label>정렬 <select id="sort"><option value="recent">최신순</option><option value="profit">월수익 높은순</option><option value="sales">월매출 높은순</option><option value="premium-asc">권리금 낮은순</option><option value="premium-desc">권리금 높은순</option></select></label></div>
      <div class="results__parsed" id="parsed"></div>
      <div class="grid grid--4" id="results">${skeletonCards(8)}</div><nav class="pager" id="pager" aria-label="페이지"></nav>
      <noscript><div class="grid grid--4">${listings.slice(0, 24).map(l => listingCard(l)).join('')}</div></noscript></section></div>
      <button type="button" class="btn btn--ink filter-fab">${ICONS.menu}필터</button></div>
      <script type="module" src="${u('/js/search.js')}"></script>`,
    ld: [ldList('창업 매물 검색', listings, '/listings/')] }) });

  // ---- 브랜드 허브 ----
  out.push({ path: '/brand/', priority: 0.8, html: layout({ title: `브랜드별 창업 매물 | 메가커피·배스킨라빈스·롯데리아 등 ${brandsSorted.length}개 프랜차이즈 양도양수 — 창업가이드`, desc: `프랜차이즈 브랜드별 양도양수 창업 매물. ${brandsSorted.slice(0, 8).map(b => b.name).join(', ')} 등 ${brandsSorted.length}개 브랜드의 권리금·월매출·월수익을 비교하세요.`, path: '/brand/', active: 'brand',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '브랜드별', href: '/brand/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">BRANDS</p><h1 class="h1">브랜드별 <span class="hl">창업 매물</span></h1><p style="font-weight:700;margin:12px 0 20px">운영 중인 가맹점을 권리금으로 인수하는 양도양수 매물을 브랜드별로 모았습니다. 브랜드를 선택하면 평균 월매출·월수익과 권리금 범위를 바로 확인할 수 있습니다.</p>
      <div class="grid">${brandsSorted.map(b => { const arr = byBrand[b.slug]; return `<a class="card reveal" href="${u(`/brand/${b.slug}/`)}"><div class="card__body"><div class="card__loc">${badge(`${b.n}건`, 'yellow')}</div><h3 class="card__title" style="min-height:auto;font-size:1.25rem">${esc(b.name)} 창업</h3><dl class="card__nums"><div><dt>평균 월매출</dt><dd>${avg(arr, 'sales') ? esc(fmtMan(avg(arr, 'sales'))) : '-'}</dd></div><div><dt>평균 월수익</dt><dd class="hot">${avg(arr, 'profit') ? esc(fmtMan(avg(arr, 'profit'))) : '-'}</dd></div><div><dt>권리금</dt><dd class="cool">${min(arr, 'premium') ? esc(fmtWon(min(arr, 'premium'))) + '~' : '협의'}</dd></div></dl></div></a>`; }).join('')}</div></section></div>${ctaBand()}` }) });
  for (const b of brandsSorted) {
    const arr = byBrand[b.slug]; const regions = Object.entries(arr.reduce((m, l) => { const k = [l.sido, l.gugun].filter(Boolean).join(' '); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, c) => c[1] - a[1]);
    const name = b.name;
    const faq = [
      { q: `${name} 양도양수 창업 비용은 얼마인가요?`, a: `현재 창업가이드에 등록된 ${name} 매물 ${arr.length}건의 권리금은 ${min(arr, 'premium') ? `${fmtWon(min(arr, 'premium'))}부터 ${fmtWon(max(arr, 'premium'))}까지` : '담당자 협의'}이며, 임대보증금은 별도입니다. 매장 규모·상권·매출에 따라 달라지므로 각 매물의 담당자에게 총 창업비용을 확인하세요.` },
      { q: `${name} 매장의 월매출·월수익은 어느 정도인가요?`, a: `등록 매물 기준 평균 월매출은 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '매물별 상이'}, 평균 월수익(세전)은 ${avg(arr, 'profit') ? fmtMan(avg(arr, 'profit')) : '매물별 상이'}입니다. 각 매물 페이지에서 재료비·인건비·월비용·관리비·기타경비 비율까지 확인할 수 있습니다.` },
      { q: `${name} 가맹점을 인수하면 본사 승인이 필요한가요?`, a: `프랜차이즈 가맹점 양도양수는 본사의 양수인 승인(교육 이수, 계약 승계)이 필요합니다. 창업가이드 담당 창업전문가가 양도인·본사와의 절차를 함께 진행합니다.` },
      { q: `${name} 매물은 어느 지역에 있나요?`, a: `현재 ${regions.slice(0, 6).map(([k, n]) => `${k}(${n}건)`).join(', ')} 등에 등록되어 있습니다. 정확한 위치는 양도인 보안을 위해 상담 후 안내합니다.` },
    ];
    out.push({ path: `/brand/${b.slug}/`, priority: 0.8, changefreq: 'daily', html: layout({ title: `${name} 창업 매물 ${arr.length}건 | ${name} 양도양수 권리금·월매출·월수익 비교 — 창업가이드`, desc: `${name} 창업을 준비한다면 운영 중인 ${name} 매장 양도양수 매물 ${arr.length}건을 비교하세요. 평균 월매출 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '-'}, 권리금 ${min(arr, 'premium') ? fmtWon(min(arr, 'premium')) + '부터' : '협의'}. ${regions.slice(0, 4).map(r => r[0]).join('·')} 등. 담당 창업전문가 바로 통화.`, path: `/brand/${b.slug}/`, active: 'brand', keywords: [`${name} 창업`, `${name} 양도양수`, `${name} 창업비용`, `${name} 권리금`, `${name} 월매출`], ld: [ldList(`${name} 창업 매물`, arr, `/brand/${b.slug}/`)],
      body: hubBody({ eyebrow: '브랜드별 창업', h1: `${esc(name)} 창업 매물 <span class="hl">${arr.length}건</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '브랜드별', href: '/brand/' }, { name, href: `/brand/${b.slug}/` }], filterLink: u(`/listings/?brandSlug=${b.slug}`), items: arr, faq,
        lead: `${name} 창업은 신규 가맹보다 운영 중인 매장을 권리금으로 인수하는 양도양수가 매출을 검증한 뒤 시작할 수 있어 안전합니다. 창업가이드에 등록된 ${name} 매물 ${arr.length}건의 핵심 숫자입니다.`,
        bullets: [`권리금 범위: ${min(arr, 'premium') ? `${fmtWon(min(arr, 'premium'))} ~ ${fmtWon(max(arr, 'premium'))}` : '담당자 협의'} (임대보증금 별도)`, `월매출: 평균 ${avg(arr, 'sales') ? fmtMan(avg(arr, 'sales')) : '-'} · 월수익(세전): 평균 ${avg(arr, 'profit') ? fmtMan(avg(arr, 'profit')) : '-'}`, `지역: ${regions.slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ')}`, `담당: ${[...new Set(arr.map(l => l.agentName))].filter(Boolean).slice(0, 6).join(', ')} 창업전문가`],
        sideChips: `<div class="chips" style="margin:14px 0">${regions.slice(0, 12).map(([k, n]) => `<a class="chip" href="${u(`/listings/?q=${encodeURIComponent(k.split(' ')[0] + ' ' + name)}`)}">${esc(k)} ${esc(name)}<small>${n}</small></a>`).join('')}</div>` }) }) });
  }

  // ---- 지역 허브 ----
  out.push({ path: '/region/', priority: 0.8, html: layout({ title: `지역별 창업 매물 | 서울·경기·인천 구·시별 양도양수 창업 — 창업가이드`, desc: `지역별 양도양수 창업 매물. 서울 ${(bySido['서울'] || []).length}건, 경기 ${(bySido['경기'] || []).length}건, 인천 ${(bySido['인천'] || []).length}건. 구·시 단위로 권리금·월매출을 비교하세요.`, path: '/region/', active: 'region',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">REGIONS</p><h1 class="h1">지역별 <span class="hl">창업 매물</span></h1>
      ${SIDO_ORDER.filter(s => bySido[s]).map(s => `<h2 class="h2" style="margin:26px 0 10px"><a href="${u(`/region/${encodeURIComponent(s)}/`)}">${esc(SIDO_FULL[s] || s)} <small class="muted">${bySido[s].length}건</small></a></h2><div class="regions">${Object.entries(byGugun).filter(([k]) => k.startsWith(s + '/')).sort((a, b) => b[1].length - a[1].length).map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(s)}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${arr.length}</small></a>`).join('')}</div>`).join('')}
    </section></div>${ctaBand()}` }) });
  for (const s of SIDO_ORDER.filter(s => bySido[s])) {
    const arr = bySido[s]; const gus = Object.entries(byGugun).filter(([k]) => k.startsWith(s + '/')).sort((a, b) => b[1].length - a[1].length);
    const brands = Object.entries(arr.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
    const full = SIDO_FULL[s] || s;
    const mk = (name, path, items, crumbs, isGu) => {
      const bl = Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
      const kinds = Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
      const faq = [
        { q: `${name} 창업 매물의 권리금은 얼마부터인가요?`, a: `${name}에 등록된 양도양수 매물 ${items.length}건의 권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터 ${fmtWon(max(items, 'premium'))}까지` : '담당자 협의'}입니다(임대보증금 별도). 업종별로는 ${kinds.slice(0, 4).map(([k, n]) => `${k} ${n}건`).join(', ')} 순으로 많습니다.` },
        { q: `${name}에서 많이 나오는 창업 브랜드는?`, a: bl.length ? `${bl.slice(0, 6).map(([k, n]) => `${k}(${n}건)`).join(', ')} 순입니다. "${name.split(' ').pop()} ${bl[0][0]}"처럼 지역과 브랜드를 함께 검색하면 해당 조건의 매물만 볼 수 있습니다.` : '브랜드 매물은 수시로 등록됩니다. 창업 의뢰를 남기시면 조건에 맞는 매물이 나올 때 연락드립니다.' },
        { q: `${name} 매장의 정확한 위치를 알 수 있나요?`, a: '양도인의 영업 보안을 위해 사이트에는 시·구 단위까지만 표시합니다. 담당 창업전문가와 상담하면 정확한 위치와 임대 조건을 안내하고 현장 답사를 함께 진행합니다.' },
      ];
      return { path, priority: 0.8, changefreq: 'daily', ld: [ldList(`${name} 창업 매물`, items, path)], html: layout({ title: `${name} 창업 매물 ${items.length}건 | ${name} 양도양수 권리금·월매출 — 창업가이드`, desc: `${name} 양도양수 창업 매물 ${items.length}건. ${bl.slice(0, 5).map(b => b[0]).join('·')} 등 브랜드, ${kinds.slice(0, 4).map(k => k[0]).join('·')} 업종. 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}.`, path, active: 'region', keywords: [`${name} 창업`, `${name} 양도양수`, `${name} 카페 창업`, `${name} 창업 매물`],
        body: hubBody({ eyebrow: '지역별 창업', h1: `${esc(name)} 창업 매물 <span class="hl">${items.length}건</span>`, crumbs, filterLink: u(`/listings/?q=${encodeURIComponent(name)}`), items, faq,
          lead: `${name}에서 운영 중인 매장을 권리금으로 인수하는 양도양수 창업 매물입니다. 월매출·월수익·권리금을 숫자로 비교하고 담당자와 바로 통화하세요.`,
          bullets: [`권리금 범위: ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '담당자 협의'} (임대보증금 별도)`, `평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `브랜드: ${bl.slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ') || '-'}`, `업종: ${kinds.slice(0, 6).map(([k, n]) => `${k} ${n}건`).join(', ')}`],
          sideChips: isGu ? `<div class="chips" style="margin:14px 0">${bl.slice(0, 10).map(([k, n]) => `<a class="chip" href="${u(`/listings/?q=${encodeURIComponent(name.split(' ').pop() + ' ' + k)}`)}">${esc(name.split(' ').pop())} ${esc(k)}<small>${n}</small></a>`).join('')}</div>` : `<div class="regions" style="margin:14px 0">${gus.map(([k, a2]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(s)}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${a2.length}</small></a>`).join('')}</div>` }) }) };
    };
    out.push(mk(full, `/region/${encodeURIComponent(s)}/`, arr, [{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }, { name: full, href: `/region/${encodeURIComponent(s)}/` }], false));
    for (const [k, items] of gus) { const g = k.split('/')[1]; out.push(mk(`${s} ${g}`, `/region/${encodeURIComponent(s)}/${encodeURIComponent(g)}/`, items, [{ name: '홈', href: '/' }, { name: '지역별', href: '/region/' }, { name: full, href: `/region/${encodeURIComponent(s)}/` }, { name: g, href: `/region/${encodeURIComponent(s)}/${encodeURIComponent(g)}/` }], true)); }
  }

  // ---- 테마 허브 ----
  out.push({ path: '/theme/', priority: 0.7, html: layout({ title: '테마별 창업 | 초보창업·소자본창업·여성창업·시니어창업·고수익·프랜차이즈 매물 — 창업가이드', desc: '창업 방식과 상황에 맞춘 테마별 양도양수 매물. 초보창업, 소자본창업, 여성창업, 시니어창업, 고수익창업, 프랜차이즈창업, 수익형(투자) 창업.', path: '/theme/', active: 'theme',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '테마별', href: '/theme/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">THEMES</p><h1 class="h1">테마별 <span class="hl">창업</span></h1><div class="themes" style="margin-top:20px">${THEMES.map((t, i) => `<a class="theme-card theme-card--${['yellow', 'red', 'blue', 'pink', 'white', 'ink', 'yellow', 'red'][i]}" href="${u(`/theme/${t.slug}/`)}">${sticker(`${(byTheme[t.name] || []).length}건`, { tone: 'white', rot: 6, size: 'sm' })}<h3>${esc(t.name)}</h3><p>${esc(t.h1)}</p></a>`).join('')}</div></section></div>${ctaBand()}` }) });
  for (const t of THEMES) {
    let items = byTheme[t.name] || [];
    if (t.slug === 'profit') items = [...new Set([...items, ...listings.filter(l => l.tags.includes('풀오토') || l.tags.includes('오토운영') || l.tags.includes('투잡'))])];
    if (t.slug === 'low-capital') items = [...new Set([...items, ...listings.filter(l => l.premium && l.premium < 10000)])];
    if (t.slug === 'new-town') items = [...new Set([...items, ...listings.filter(l => l.newTown)])];
    if (t.slug === 'franchise') items = [...new Set([...items, ...listings.filter(l => l.brand)])];
    if (t.slug === 'high-profit') items = [...new Set([...items, ...listings.filter(l => l.profit && l.profit >= 1500)])].sort((a, b) => (b.profit || 0) - (a.profit || 0));
    const faq = [
      { q: `${t.kw}에 맞는 업종은 무엇인가요?`, a: `창업가이드 ${t.name} 매물 ${items.length}건 중 ${Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k}(${n}건)`).join(', ')} 순으로 많습니다. ${t.desc}` },
      { q: `${t.kw} 예산은 얼마나 필요한가요?`, a: `등록 매물 기준 권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'}이며 임대보증금이 별도로 필요합니다. 평균 월수익(세전)은 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '매물별 상이'}입니다.` },
      { q: '처음 창업인데 어떤 순서로 진행하나요?', a: '매물 선택 → 담당자 전화·문자 상담 → 매출 자료와 임대 조건 확인 → 현장 답사(담당자 동행) → 권리금·인수 조건 협의 → 계약·인수 순서로 진행합니다. 프랜차이즈는 본사 승인과 교육이 추가됩니다.' },
    ];
    out.push({ path: `/theme/${t.slug}/`, priority: 0.8, changefreq: 'daily', ld: [ldList(t.name, items, `/theme/${t.slug}/`)], html: layout({ title: `${t.kw} 매물 ${items.length}건 | ${t.h1} — 창업가이드`, desc: `${t.desc} 현재 ${items.length}건, 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}.`, path: `/theme/${t.slug}/`, active: 'theme', keywords: [t.kw, t.name, `${t.kw} 매물`, `${t.kw} 추천`],
      body: hubBody({ eyebrow: t.name, h1: esc(t.h1), crumbs: [{ name: '홈', href: '/' }, { name: '테마별', href: '/theme/' }, { name: t.name, href: `/theme/${t.slug}/` }], filterLink: u(`/listings/?theme=${encodeURIComponent(t.name)}`), items, faq,
        lead: t.desc, bullets: [`현재 ${t.name} 매물 ${items.length}건`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '협의'} (임대보증금 별도)`, `평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`] }) }) });
  }

  // ---- 예산 허브 ----
  out.push({ path: '/budget/', priority: 0.7, html: layout({ title: '예산별 창업 매물 | 권리금 1억 미만부터 6억 이상까지 — 창업가이드', desc: '창업 예산(권리금)별 양도양수 매물. 1억 미만 소자본 창업부터 6억 이상 대형 매장까지 구간별로 월매출·월수익을 비교하세요. 임대보증금 별도.', path: '/budget/', active: 'budget',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '예산별', href: '/budget/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">BUDGET</p><h1 class="h1">예산별 <span class="hl">창업 매물</span></h1><p style="font-weight:700;margin:12px 0">표시 금액은 임대보증금을 제외한 권리금입니다. 총 창업비용은 담당자가 매물별로 안내합니다.</p><div class="themes" style="margin-top:20px">${BUDGETS.map((b, i) => `<a class="theme-card theme-card--${['white', 'yellow', 'red', 'blue', 'pink', 'ink'][i]}" href="${u(`/budget/${b.slug}/`)}">${sticker(`${(byBudget[b.slug] || []).length}건`, { tone: 'white', rot: 6, size: 'sm' })}<h3>권리금 ${esc(b.name)}</h3><p>평균 월수익 ${avg(byBudget[b.slug] || [], 'profit') ? esc(fmtMan(avg(byBudget[b.slug], 'profit'))) : '-'}</p></a>`).join('')}</div></section></div>${ctaBand()}` }) });
  for (const b of BUDGETS) {
    const items = (byBudget[b.slug] || []).slice().sort((a, c) => (c.profit || 0) - (a.profit || 0));
    const faq = [
      { q: `권리금 ${b.name} 창업 매물은 어떤 업종이 많나요?`, a: `${Object.entries(items.reduce((m, l) => { const k = l.kind2 || l.kind1; if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, n]) => `${k}(${n}건)`).join(', ') || '등록 대기'} 순입니다.` },
      { q: '권리금 외에 추가로 드는 비용은?', a: '임대보증금, 첫 달 월세, 프랜차이즈 본사 승인 관련 비용(교육비·양수 수수료 등), 필요 시 시설 보수비가 추가됩니다. 담당자가 매물별 총 창업비용을 정리해 드립니다.' },
      { q: '권리금은 협상이 가능한가요?', a: '양도인의 사정과 매물 상태에 따라 조정되는 경우가 있습니다. 담당 창업전문가가 양도인과 협의해 조건을 조율합니다.' },
    ];
    out.push({ path: `/budget/${b.slug}/`, priority: 0.7, changefreq: 'daily', ld: [ldList(`권리금 ${b.name} 창업 매물`, items, `/budget/${b.slug}/`)], html: layout({ title: `권리금 ${b.name} 창업 매물 ${items.length}건 | 예산별 양도양수 — 창업가이드`, desc: `창업 예산 권리금 ${b.name} 구간의 양도양수 매물 ${items.length}건. 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}. 임대보증금 별도.`, path: `/budget/${b.slug}/`, active: 'budget', keywords: [`${b.name} 창업`, '소자본 창업', '창업 비용', '권리금'],
      body: hubBody({ eyebrow: '예산별 창업', h1: `권리금 ${esc(b.name)} <span class="hl">창업 매물</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '예산별', href: '/budget/' }, { name: b.name, href: `/budget/${b.slug}/` }], filterLink: u(`/listings/?budget=${b.slug}`), items, faq,
        lead: `권리금 ${b.name} 예산으로 시작할 수 있는 양도양수 창업 매물입니다. 월수익이 높은 순으로 정렬했습니다. 임대보증금은 별도입니다.`, bullets: [`매물 ${items.length}건 · 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `브랜드: ${Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, n]) => `${k} ${n}건`).join(', ') || '-'}`] }) }) });
  }

  // ---- 업종 허브 ----
  for (const c of CATEGORIES) {
    const items = byCode[c.code] || [];
    const kinds = c.kinds.map(k => [k, byKind[k[0]] || []]).filter(([, a]) => a.length);
    const faq = [
      { q: `${c.name} 창업은 어떤 세부 업종이 있나요?`, a: `${kinds.map(([k, a]) => `${k[1]}(${a.length}건)`).join(', ')} 매물이 등록되어 있습니다.` },
      { q: `${c.name} 매물의 평균 권리금과 월수익은?`, a: `권리금은 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'}, 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'}, 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}입니다.` },
    ];
    out.push({ path: `/category/${c.slug}/`, priority: 0.8, changefreq: 'daily', ld: [ldList(`${c.name} 창업 매물`, items, `/category/${c.slug}/`)], html: layout({ title: `${c.name} 창업 매물 ${items.length}건 | ${kinds.slice(0, 4).map(k => k[0][1]).join('·')} 양도양수 — 창업가이드`, desc: `${c.name} 업종 양도양수 창업 매물 ${items.length}건. ${kinds.slice(0, 6).map(k => k[0][1]).join(', ')}. 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}.`, path: `/category/${c.slug}/`, active: 'listings', keywords: [`${c.name} 창업`, ...kinds.slice(0, 5).map(k => `${k[0][1]} 창업`)],
      body: hubBody({ eyebrow: '업종별 창업', h1: `${esc(c.name)} <span class="hl">창업 매물</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '매물 검색', href: '/listings/' }, { name: c.name, href: `/category/${c.slug}/` }], filterLink: u(`/listings/?code=${c.code}`), items, faq,
        lead: `${c.name} 업종의 운영 중인 매장을 권리금으로 인수하는 양도양수 매물입니다.`, bullets: [`세부 업종: ${kinds.map(([k, a]) => `${k[1]} ${a.length}건`).join(', ')}`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))} ~ ${fmtWon(max(items, 'premium'))}` : '협의'} (보증금 별도) · 평균 월수익 ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`],
        sideChips: `<div class="chips" style="margin:14px 0">${kinds.map(([k, a]) => `<a class="chip" href="${u(`/category/${c.slug}/${k[0]}/`)}">${esc(k[1])}<small>${a.length}</small></a>`).join('')}</div>` }) }) });
    for (const [k, items2] of kinds) {
      out.push({ path: `/category/${c.slug}/${k[0]}/`, priority: 0.7, changefreq: 'daily', ld: [ldList(`${k[1]} 창업 매물`, items2, `/category/${c.slug}/${k[0]}/`)], html: layout({ title: `${k[1]} 창업 매물 ${items2.length}건 | ${k[1]} 양도양수 권리금·월매출 — 창업가이드`, desc: `${k[1]} 양도양수 창업 매물 ${items2.length}건. 권리금 ${min(items2, 'premium') ? fmtWon(min(items2, 'premium')) + '부터' : '협의'}, 평균 월매출 ${avg(items2, 'sales') ? fmtMan(avg(items2, 'sales')) : '-'}, 평균 월수익 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '-'}.`, path: `/category/${c.slug}/${k[0]}/`, active: 'listings', keywords: [`${k[1]} 창업`, `${k[1]} 양도양수`, `${k[1]} 창업비용`],
        body: hubBody({ eyebrow: c.name, h1: `${esc(k[1])} <span class="hl">창업 매물</span>`, crumbs: [{ name: '홈', href: '/' }, { name: '매물 검색', href: '/listings/' }, { name: c.name, href: `/category/${c.slug}/` }, { name: k[1], href: `/category/${c.slug}/${k[0]}/` }], filterLink: u(`/listings/?code=${c.code}&kind=${k[0]}`), items: items2,
          faq: [{ q: `${k[1]} 창업 비용은 얼마인가요?`, a: `등록 매물 기준 권리금 ${min(items2, 'premium') ? `${fmtWon(min(items2, 'premium'))}부터 ${fmtWon(max(items2, 'premium'))}까지` : '협의'}이며 임대보증금은 별도입니다. 평균 월수익(세전)은 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '매물별 상이'}입니다.` }, { q: `${k[1]} 매물은 어느 지역에 많나요?`, a: `${Object.entries(items2.reduce((m, l) => { const kk = [l.sido, l.gugun].filter(Boolean).join(' '); if (kk) m[kk] = (m[kk] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([kk, n]) => `${kk}(${n}건)`).join(', ')} 순입니다.` }],
          lead: `${k[1]} 업종의 양도양수 창업 매물입니다. 월매출·월수익·권리금을 비교하고 담당자와 상담하세요.`, bullets: [`매물 ${items2.length}건 · 평균 월매출 ${avg(items2, 'sales') ? fmtMan(avg(items2, 'sales')) : '-'} · 평균 월수익 ${avg(items2, 'profit') ? fmtMan(avg(items2, 'profit')) : '-'}`, `브랜드: ${Object.entries(items2.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([kk, n]) => `${kk} ${n}건`).join(', ') || '-'}`] }) }) });
    }
  }

  // ---- 키워드 허브 (창업 / 창업 아이템 / 카페 창업 / 치킨집 창업 / 양도양수) ----
  for (const k of KEYWORD_PAGES) {
    let items = listings;
    if (k.filter.code) items = byCode[k.filter.code] || [];
    if (k.filter.kind) items = byKind[k.filter.kind] || [];
    if (k.slug === 'items') items = [...listings].filter(l => l.profit).sort((a, b) => (b.profit || 0) - (a.profit || 0));
    if (k.slug === 'transfer') items = [...listings].sort((a, b) => Number(b.id) - Number(a.id));
    const kinds = Object.entries(items.reduce((m, l) => { const kk = l.kind2 || l.kind1; if (kk) m[kk] = (m[kk] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const brands = Object.entries(items.reduce((m, l) => { if (l.brand) m[l.brand] = (m[l.brand] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const leadMap = {
      startup: `창업을 준비할 때 가장 먼저 확인할 것은 실제 운영 중인 매장의 숫자입니다. 창업가이드는 서울·경기·인천의 양도양수 매물 ${items.length}건을 월매출·월수익·권리금과 함께 공개하고, 매물마다 담당 창업전문가가 상담부터 인수까지 함께합니다.`,
      items: `창업 아이템은 유행보다 숫자로 고르는 것이 안전합니다. 월수익이 확인된 매물을 수익 순으로 정렬했습니다. 업종별 수익 구조(재료비·인건비·월비용 비율)를 비교해 보세요.`,
      cafe: `카페 창업은 신규 오픈 시 인테리어·가맹비 부담이 크지만, 운영 중인 카페를 권리금으로 인수하면 매출을 확인한 뒤 시작할 수 있습니다. 메가커피·컴포즈커피·투썸플레이스·이디야 등 카페 양도양수 매물 ${items.length}건입니다.`,
      chicken: `치킨집 창업은 배달 비중과 홀 매출 구조를 함께 봐야 합니다. 교촌·BBQ·BHC 등 치킨 프랜차이즈 양도양수 매물 ${items.length}건의 월매출·월수익·권리금을 공개합니다.`,
      transfer: `양도양수는 운영 중인 점포의 시설·직원·거래처·단골을 그대로 인수하는 창업 방식입니다. 창업가이드는 사업체(권리금) 양도양수를 주업무로 하며, 부동산 중개대상물은 취급하지 않습니다.`,
    };
    const faqMap = {
      startup: [{ q: '창업 매물은 어떻게 고르나요?', a: '지역·브랜드·예산 세 가지를 먼저 정하고, 월매출 대비 월수익 비율과 권리금 회수 기간(권리금 ÷ 월수익)을 비교하세요. 창업가이드 검색창에 "인천 메가커피 1억 이하"처럼 입력하면 조건에 맞는 매물만 보여줍니다.' }, { q: '창업가이드 상담은 무료인가요?', a: '네. 매물 상담·현장 답사 동행은 무료이며, 대표번호 010-5548-6188로 24시간 상담할 수 있습니다. 거래 성사 시 조건은 담당자가 사전에 안내합니다.' }],
      items: [{ q: '2026년 창업 아이템으로 월수익이 높은 업종은?', a: `창업가이드 등록 매물 기준 평균 월수익이 높은 업종은 ${kinds.slice(0, 5).map(([kk, n]) => kk).join(', ')} 순입니다. 단, 권리금과 투자 규모가 함께 커지므로 회수 기간을 같이 보셔야 합니다.` }, { q: '소자본으로 가능한 창업 아이템은?', a: '권리금 1억 미만 매물은 테이크아웃 카페, 분식·배달 전문점, 스터디카페 등이 많습니다. 예산별 페이지에서 구간별 매물을 확인하세요.' }],
      cafe: [{ q: '카페 창업 비용은 얼마나 드나요?', a: `양도양수 기준 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}이며, 여기에 임대보증금·첫 달 월세·본사 양수 승인 비용이 더해집니다. 신규 가맹보다 인테리어·설비 비용이 들지 않는 것이 장점입니다.` }, { q: '카페 창업 매물에서 꼭 확인할 것은?', a: '월매출의 계절 편차, 테이크아웃·배달 비중, 인건비 구조(점주 근무 시간), 임대차 잔여기간과 본사 리뉴얼 요구 여부입니다.' }],
      chicken: [{ q: '치킨집 창업 비용과 수익은?', a: `등록 매물 기준 권리금 ${min(items, 'premium') ? fmtWon(min(items, 'premium')) + '부터' : '협의'}, 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}입니다. 배달 수수료와 재료비 비율이 수익을 좌우합니다.` }, { q: '치킨 프랜차이즈 양도양수 절차는?', a: '매물 상담 → 매출 자료 확인 → 현장 답사 → 본사 양수인 승인(교육) → 계약·인수 순서입니다. 담당 창업전문가가 본사 절차를 함께 진행합니다.' }],
      transfer: [{ q: '양도양수 창업의 장점은?', a: '실제 매출을 확인한 뒤 결정할 수 있고, 인테리어·설비·직원·단골을 그대로 이어받아 오픈 초기 공백이 없습니다. 신규 창업 대비 초기 투자와 시행착오를 줄일 수 있습니다.' }, { q: '양도양수 시 주의할 점은?', a: '임대차 계약 승계(건물주 동의), 권리금 범위(시설·영업권 포함 여부), 미납 공과금·채무, 프랜차이즈 본사 승인 조건을 반드시 확인해야 합니다. 창업가이드 담당자가 체크리스트로 함께 확인합니다.' }],
    };
    out.push({ path: `/${k.slug}/`, priority: 0.9, changefreq: 'daily', ld: [ldList(k.kw, items, `/${k.slug}/`)], html: layout({ title: k.title + ' — 창업가이드', desc: leadMap[k.slug].slice(0, 155), path: `/${k.slug}/`, active: 'listings', keywords: [k.kw, `${k.kw} 비용`, `${k.kw} 추천`, `${k.kw} 매물`],
      body: hubBody({ eyebrow: k.kw.toUpperCase(), h1: esc(k.h1), crumbs: [{ name: '홈', href: '/' }, { name: k.kw, href: `/${k.slug}/` }], filterLink: u(k.filter.code ? `/listings/?code=${k.filter.code}` : k.filter.kind ? `/listings/?kind=${k.filter.kind}` : '/listings/'), items, faq: faqMap[k.slug],
        lead: leadMap[k.slug], bullets: [`매물 ${items.length}건 · 평균 월매출 ${avg(items, 'sales') ? fmtMan(avg(items, 'sales')) : '-'} · 평균 월수익(세전) ${avg(items, 'profit') ? fmtMan(avg(items, 'profit')) : '-'}`, `권리금 ${min(items, 'premium') ? `${fmtWon(min(items, 'premium'))}부터` : '협의'} (임대보증금 별도)`, `업종: ${kinds.slice(0, 6).map(([kk, n]) => `${kk} ${n}건`).join(', ')}`, brands.length ? `브랜드: ${brands.slice(0, 8).map(([kk, n]) => `${kk} ${n}건`).join(', ')}` : null].filter(Boolean),
        sideChips: `<div class="chips" style="margin:14px 0">${THEMES.map(t => `<a class="chip" href="${u(`/theme/${t.slug}/`)}">${esc(t.name)}</a>`).join('')}${BUDGETS.map(b => `<a class="chip" href="${u(`/budget/${b.slug}/`)}">${esc(b.name)}</a>`).join('')}</div>` }) }) });
  }

  // ---- 담당 전문가 ----
  const act = agents.filter(a => a.active);
  out.push({ path: '/agents/', priority: 0.6, html: layout({ title: `담당 창업전문가 ${act.length}명 | 브랜드·지역별 전문 분야, 매물별 담당자 직통 상담 — 창업가이드`, desc: `창업가이드의 담당 창업전문가 ${act.length}명. 전문 분야(카페·스크린골프·치킨 등)와 담당 지역, 실적을 공개하며 매물마다 담당자가 정해져 있어 통화·문자로 바로 상담할 수 있습니다.`, path: '/agents/', active: 'agents',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '담당 전문가', href: '/agents/' }])}<section class="sec sec--tight" style="padding-top:6px"><span class="eyebrow">담당 창업전문가</span><h1 class="h1">매물마다 <span class="hl">담당 전문가</span>가 정해져 있습니다</h1><p style="font-size:1.02rem;color:var(--ink-2);margin:14px 0 30px;max-width:64ch">전문 분야와 담당 지역은 각 전문가가 실제로 담당하는 매물 데이터로 계산한 것입니다. 매물 페이지의 전화 버튼을 누르면 담당자에게 바로 연결되고, 어떤 매물을 보셨는지 담당자에게 자동으로 전달됩니다.</p>
      <div class="agents-grid">${act.map(a => agentCard(a, ctx)).join('')}</div></section></div>${ctaBand()}`,
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: act.map((a, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Person', name: a.name, jobTitle: a.role, telephone: phoneTel(a.mobile), worksFor: { '@id': abs('/#org') }, url: abs(`/agents/${a.id}/`), knowsAbout: agentProfile(a, ctx).specialties } })) }] }) });
  for (const a of act) {
    const p = agentProfile(a, ctx); const items = p.items;
    const faq = [
      { q: `${a.name} 창업전문가는 어떤 매물을 주로 담당하나요?`, a: `${p.specialties.length ? p.specialties.join(', ') + ' 등 ' : ''}${items.length}건의 양도양수 매물을 담당하며, ${p.regions.length ? p.regions.map(r => r.k).join('·') + ' 등 ' : ''}${p.sidos.map(s => s.k).join('·')} 지역이 중심입니다.` },
      { q: '상담은 어떻게 신청하나요?', a: `직통 ${a.mobile}로 전화하시거나, 매물 페이지의 문자 상담 신청을 이용하세요. 대표번호 ${SITE.phone}로도 24시간 접수됩니다.` },
      { q: '담당자와 현장 답사가 가능한가요?', a: '네. 매출 자료와 임대 조건을 확인한 뒤 담당자가 현장에 동행합니다. 양도인의 영업 보안을 위해 정확한 위치는 상담 후 안내합니다.' },
    ];
    out.push({ path: `/agents/${a.id}/`, priority: 0.5, changefreq: 'weekly', html: layout({ title: `${a.name} ${a.role} | ${p.specialties.slice(0, 3).join('·') || '양도양수'} 전문 창업전문가, 담당 매물 ${items.length}건 — 창업가이드`, desc: `창업가이드 ${a.name} ${a.role}. ${p.summary} 직통 ${a.mobile}.`, path: `/agents/${a.id}/`, active: 'agents',
      ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: a.name, jobTitle: a.role, telephone: phoneTel(a.mobile), email: a.email || undefined, image: a.photo ? abs('/' + imgPath(a.photo)) : undefined, worksFor: { '@id': abs('/#org') }, url: abs(`/agents/${a.id}/`), knowsAbout: p.specialties, areaServed: p.regions.map(r => r.k), description: p.summary }],
      body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '담당 전문가', href: '/agents/' }, { name: a.name, href: `/agents/${a.id}/` }])}
        <section class="sec sec--tight" style="padding-top:6px">
          <div class="agent-hero"><div class="agent-hero__pic">${img(imgPath(a.photo), `${a.name} 창업전문가`, { w: 140, h: 140, lazy: false })}</div>
            <div><span class="eyebrow">담당 창업전문가</span><h1>${esc(a.name)}<small>${esc(a.role)}${p.career ? ` · ${esc(p.career)}` : ''}</small></h1>
              <p style="color:var(--ink-2);max-width:62ch;margin:10px 0 0">${esc(p.summary)}</p>
              <dl class="facts"><div><dt>전문 분야</dt><dd>${esc(p.specialties.join(' · ') || '양도양수 전반')}</dd></div><div><dt>담당 지역</dt><dd>${esc(p.regions.map(r => r.k).join(' · ') || p.sidos.map(s => s.k).join(' · '))}</dd></div><div><dt>담당 매물</dt><dd>${items.length}건${p.avgProfit ? ` · 평균 월수익 ${esc(fmtMan(p.avgProfit))}` : ''}</dd></div></dl>
              <div class="btns"><a class="btn btn--yellow btn--lg" href="tel:${esc(phoneTel(a.mobile))}" data-call="" data-agent="${esc(a.id)}" data-phone="${esc(a.mobile)}">${ICONS.phone}${esc(a.mobile)}</a><button class="btn btn--lg" type="button" data-sms="" data-agent="${esc(a.id)}" data-agent-name="${esc(a.name)}">${ICONS.sms}문자 상담 신청</button>${a.kakao ? `<button class="btn btn--lg" type="button" data-copy="${esc(a.kakao)}" data-copy-label="카카오톡 ID">${ICONS.kakao}카카오톡 ${esc(a.kakao)}</button>` : ''}</div>
              <p class="muted" style="font-size:.84rem;margin:12px 0 0">사무실 ${esc(a.tel || SITE.phone)}${a.email ? ` · ${esc(a.email)}` : ''} · ${esc(SITE.address)}</p></div></div>
          ${p.brands.length || p.regions.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:20px">${p.brands.length ? `<div class="sales__box"><h3>담당 브랜드</h3><div class="chips">${p.brands.map(b => `<a class="chip" href="${u(`/listings/?brandSlug=${encodeURIComponent((items.find(l => l.brand === b.k) || {}).brandSlug || '')}`)}">${esc(b.k)}<small>${b.v}</small></a>`).join('')}</div></div>` : ''}${p.regions.length ? `<div class="sales__box"><h3>담당 지역</h3><div class="chips">${p.regions.map(r => `<span class="chip">${esc(r.k)}<small>${r.v}</small></span>`).join('')}</div></div>` : ''}${p.kinds.length ? `<div class="sales__box"><h3>담당 업종</h3><div class="chips">${p.kinds.map(k => `<span class="chip">${esc(k.k)}<small>${k.v}</small></span>`).join('')}</div></div>` : ''}</div>` : ''}
          ${p.intro ? `<div class="prose" style="margin-top:20px"><h3>담당자 인사말</h3>${p.intro.split(/\n{2,}/).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
          <div class="sec__head" style="margin-top:44px"><h2 class="h2">${esc(a.name)} 담당 매물 ${items.length}건</h2></div><div class="grid grid--4">${items.map(l => listingCard(l)).join('')}</div>
          <div style="margin-top:44px">${faqBlock(faq, { title: `${a.name} 전문가에게 자주 묻는 질문` })}</div>
        </section></div>${ctaBand()}` }) });
  }
  return out;
}
