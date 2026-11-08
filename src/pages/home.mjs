// 메인 — 기존 창업미디어 홈 구조(이미지 배너 롤링 → 업종별 베스트 → 테마별 → 카테고리별 인기상품 → 지역·예산 → 인기 프랜차이즈 → 고지)를 현대적으로 재구성
import { SITE, SEO, CATEGORIES, THEMES, BUDGETS, HERO_SLIDES, POPULAR_BRANDS, FAQ, SIDO_ORDER } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, CAT_ILLO, badge, listingCard, skeletonCards, faqBlock, ctaBand, img, imgPath } from '../lib/html.mjs';
import { agentCard } from '../lib/agents.mjs';
import { brandByName, fmtMan, fmtWon } from '../lib/text.mjs';

const photoOf = l => l && l.images && l.images[0] && l.images[0].startsWith('photos/') ? imgPath(l.images[0]) : '';

export function homePage(ctx) {
  const { listings, stats, brandsSorted, bySido, byGugun, byTheme, byCode, byKind, byBudget, posts, agents } = ctx;
  const latest = listings.slice(0, 8);

  // ---------- 히어로: 실제 매장 사진 배경 배너 9종 ----------
  const slides = HERO_SLIDES.map((s, i) => {
    const b = brandByName(s.brand); const arr = b ? (ctx.byBrand[b.slug] || []) : [];
    const withPhoto = arr.filter(photoOf);
    const bg = photoOf(withPhoto[0]) || photoOf(latest[i]) || '';
    const minPrem = arr.filter(l => l.premium).length ? Math.min(...arr.filter(l => l.premium).map(l => l.premium)) : 0;
    const avgSales = arr.filter(l => l.sales).length ? Math.round(arr.filter(l => l.sales).reduce((x, l) => x + l.sales, 0) / arr.filter(l => l.sales).length) : 0;
    const href = b && arr.length ? u(`/brand/${b.slug}/`) : u(`/listings/?q=${encodeURIComponent(s.brand)}`);
    const bgUrl = bg ? (/^https?:/.test(bg) ? bg : u('/' + bg)) : '';
    return `<div class="hslide hslide--${s.theme}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${HERO_SLIDES.length}" style="${bgUrl ? `background-image:url('${esc(bgUrl)}')` : ''}">
      <div class="hslide__shade"></div>
      <div class="wrap hslide__in">
        <div class="hslide__box glass-dark">
          <span class="hslide__eyebrow">${esc(s.eyebrow)}</span>
          <h2 class="hslide__title">${esc(s.title)}</h2>
          <p class="hslide__sub">${esc(s.sub)}</p>
          <p class="hslide__tags">${s.tags.map(t => `<span>${esc(t)}</span>`).join(' ')}</p>
          <div class="hslide__btns"><a class="btn btn--yellow btn--lg" href="${href}">창업상품 바로가기 ${ICONS.arrow}</a><a class="btn btn--glass btn--lg" href="${u('/inquiry/')}">창업 문의</a></div>
          ${arr.length ? `<dl class="hslide__facts"><div><dt>등록 매물</dt><dd>${arr.length}건</dd></div>${minPrem ? `<div><dt>권리금</dt><dd>${esc(fmtWon(minPrem))}부터</dd></div>` : ''}${avgSales ? `<div><dt>평균 월매출</dt><dd>${esc(fmtMan(avgSales))}</dd></div>` : ''}</dl>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
  const hero = `<section class="hero2" aria-roledescription="carousel" aria-label="추천 브랜드 창업"><div class="hero2__track">${slides}</div>
    <button class="hero2__arrow hero2__arrow--prev" type="button" aria-label="이전 배너">${ICONS.arrow}</button><button class="hero2__arrow hero2__arrow--next" type="button" aria-label="다음 배너">${ICONS.arrow}</button>
    <div class="hero2__pager glass" role="tablist" data-hero-pager></div></section>`;

  // ---------- 검색 바 ----------
  const sidos = SIDO_ORDER.filter(s => bySido[s]);
  const finder = `<section class="finder2"><div class="wrap"><form class="finder2__box glass" action="${u('/listings/')}" method="get" role="search" aria-label="매물 빠른 검색">
    <div class="finder2__q"><span class="finder2__ico">${ICONS.search}</span><input type="search" name="q" placeholder="예) 강남구 메가커피, 인천 카페 1억 이하" aria-label="매물 검색" data-suggest autocomplete="off"><button class="btn btn--ink" type="submit">검색</button></div>
    <div class="finder2__sel">
      <select name="sido" aria-label="지역"><option value="">지역 전체</option>${sidos.map(s => `<option value="${s}">${s} (${bySido[s].length})</option>`).join('')}</select>
      <select name="brandSlug" aria-label="브랜드"><option value="">브랜드 전체</option>${brandsSorted.slice(0, 40).map(b => `<option value="${b.slug}">${esc(b.name)} (${b.n})</option>`).join('')}</select>
      <select name="budget" aria-label="예산"><option value="">예산 전체</option>${BUDGETS.map(b => `<option value="${b.slug}">권리금 ${b.name}</option>`).join('')}</select>
      <select name="code" aria-label="업종"><option value="">업종 전체</option>${CATEGORIES.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}</select>
    </div>
    <p class="finder2__hint">인기 검색어 ${brandsSorted.slice(0, 6).map(b => `<a href="${u(`/brand/${b.slug}/`)}">#${esc(b.name)}</a>`).join(' ')} <a href="${u('/theme/beginner/')}">#초보창업</a> <a href="${u('/theme/low-capital/')}">#소자본창업</a></p>
  </form></div></section>`;

  // ---------- 업종별 베스트창업 (아이콘 탭) ----------
  const bestTabs = [
    ['베이커리', 'katsu', l => /베이커리|제과/.test(l.kind2)], ['대형커피', 'coffee', l => /대형커피|커피전문점/.test(l.kind2)], ['소형커피', 'cup', l => /소형카페|테이크아웃/.test(l.kind2)],
    ['아이스크림', 'icecream', l => /아이스크림/.test(l.kind2)], ['패스트푸드', 'burger', l => /패스트푸드/.test(l.kind2)], ['일반음식점', 'bowl', l => l.kind1 === '일반음식점'],
    ['치킨·호프', 'chicken', l => l.kind1 === '주류/치킨/호프'], ['스크린골프', 'golf', l => /스크린골프/.test(l.kind2)], ['스터디카페', 'shop', l => /스터디카페/.test(l.kind2)],
  ].map(([name, icon, fn]) => ({ name, icon, items: listings.filter(fn) })).filter(t => t.items.length);
  const best = `<section class="sec sec--tight"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">업종별</span><h2 class="h2"><span class="hl">업종별</span> 베스트 창업</h2></div><a class="more" href="${u('/listings/')}">전체 매물 ${ICONS.arrow}</a></div>
    <div class="tabs tabs--icons" data-tabs>
      <div class="tabs__nav" role="tablist">${bestTabs.map((t, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="best-${i}" id="best-tab-${i}" type="button">${ILLO[t.icon]}<span>${esc(t.name)}</span><small>${t.items.length}</small></button>`).join('')}</div>
      <div class="tabs__panels">${bestTabs.map((t, i) => `<div class="tabs__panel" role="tabpanel" id="best-${i}" aria-labelledby="best-tab-${i}" ${i ? 'hidden' : ''}><div class="grid grid--4">${t.items.slice(0, 8).map(l => listingCard(l)).join('')}</div></div>`).join('')}<div class="tabs__skeleton grid grid--4" hidden>${skeletonCards(8)}</div></div>
    </div></div></section>`;

  // ---------- 테마별 창업 (배너 + 탭) ----------
  const themeTabs = THEMES.filter(t => (byTheme[t.name] || []).length >= 3).slice(0, 6).map(t => ({ ...t, items: byTheme[t.name] }));
  const themeCopy = { 초보창업: ['첫 창업이 막막할 때', '운영 매뉴얼이 갖춰진 매장부터, 담당자가 처음부터 끝까지 동행합니다.'], 소자본창업: ['권리금 1억 미만으로 시작', '테이크아웃·배달·소형 매장 중심의 소자본 창업 매물입니다.'], 여성창업: ['혼자서도 운영 가능한 매장', '규칙적인 영업시간과 1인 운영이 가능한 업종을 골랐습니다.'], 고수익창업: ['수익 구조가 확인된 매장', '월매출·월지출·월수익을 항목별로 공개합니다.'], 프랜차이즈창업: ['운영 중인 가맹점 인수', '신규 오픈 비용 없이 매출이 검증된 가맹점으로 시작합니다.'], 시니어창업: ['체력 부담이 적은 업종', '안정 상권과 간편 운영, 본사 교육이 있는 매물입니다.'], 수익형창업: ['상주하지 않아도 돌아가는 매장', '오토·반오토 운영 구조의 투자형 매물입니다.'], 신도시창업: ['입주가 진행 중인 상권', '신도시·택지지구의 성장 상권 매물입니다.'] };
  const themeSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">테마별</span><h2 class="h2">창업미디어 <span class="hl">추천 테마</span></h2></div><a class="more" href="${u('/theme/')}">테마 전체 ${ICONS.arrow}</a></div>
    <div class="tabs tabs--pills" data-tabs>
      <div class="tabs__nav" role="tablist">${themeTabs.map((t, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="theme-${i}" id="theme-tab-${i}" type="button">${esc(t.name)}<small>${t.items.length}</small></button>`).join('')}</div>
      <div class="tabs__panels">${themeTabs.map((t, i) => { const copy = themeCopy[t.name] || [t.h1, t.desc]; const feat = t.items.find(photoOf) || t.items[0]; return `<div class="tabs__panel" role="tabpanel" id="theme-${i}" aria-labelledby="theme-tab-${i}" ${i ? 'hidden' : ''}><div class="theme-row">
        <a class="theme-banner" href="${u(`/theme/${t.slug}/`)}" style="${photoOf(feat) ? `background-image:url('${esc(u('/' + photoOf(feat)))}')` : ''}"><div class="theme-banner__shade"></div><div class="theme-banner__txt"><span class="badge badge--yellow">창업미디어 추천테마</span><strong>${esc(copy[0])}</strong><h3>${esc(t.name)}</h3><p>${esc(copy[1])}</p><span class="theme-banner__cta">창업상품 보러가기 ${ICONS.arrow}</span></div></a>
        <div class="grid grid--3">${t.items.slice(0, 6).map(l => listingCard(l)).join('')}</div></div></div>`; }).join('')}<div class="tabs__skeleton grid grid--4" hidden>${skeletonCards(8)}</div></div>
    </div></div></section>`;

  // ---------- 카테고리별 인기상품 (좌 패널 + 우 카드 6) ----------
  const catKeywords = { 100: ['#메가커피', '#컴포즈커피', '#파리바게뜨', '#배스킨라빈스', '#롯데리아'], 300: ['#한양화로', '#한솥도시락', '#죽이야기', '#고기전문점', '#디저트/브런치'], 200: ['#교촌치킨', '#BHC치킨', '#치킨전문점', '#BBQ치킨', '#역전할머니맥주'], 500: ['#골프존', '#스터디카페', '#필라테스', '#PC방', '#키즈카페'], 400: ['#올리브영', '#편의점', '#정관장', '#무인매장', '#셀프빨래방'], 600: ['#백소정', '#대형마트', '#백화점', '#영화관', '#대학교'] };
  const catSecs = CATEGORIES.map((c, idx) => {
    const items = (byCode[c.code] || []); if (!items.length) return '';
    const kinds = c.kinds.map(k => [k, (byKind[k[0]] || []).length]).filter(([, n]) => n).slice(0, 7);
    const feat = items.find(photoOf);
    const kw = (catKeywords[c.code] || []).map(k => { const name = k.slice(1); const b = brandByName(name); return `<a class="chip" href="${b && !b.generic && ctx.byBrand[b.slug] ? u(`/brand/${b.slug}/`) : u(`/listings/?q=${encodeURIComponent(name)}&code=${c.code}`)}">${esc(k)}</a>`; }).join('');
    return `<section class="sec sec--tight catsec ${idx % 2 ? 'sec--paper' : ''}"><div class="wrap"><div class="catsec__in">
      <aside class="catsec__side glass">
        <span class="eyebrow">카테고리별 인기상품</span><h2 class="h2"><a href="${u(`/category/${c.slug}/`)}">${esc(c.name)}</a></h2>
        <ul class="catsec__kinds">${kinds.map(([k, n]) => `<li><a href="${u(`/category/${c.slug}/${k[0]}/`)}">${esc(k[1])}<small>${n}</small></a></li>`).join('')}</ul>
        <p class="catsec__label">인기 키워드</p><div class="chips">${kw}</div>
        ${feat ? `<a class="catsec__banner" href="${u(`/category/${c.slug}/`)}" style="background-image:url('${esc(u('/' + photoOf(feat)))}')"><span>${esc(c.name)} 매물 ${items.length}건 보기 ${ICONS.arrow}</span></a>` : ''}
      </aside>
      <div class="grid grid--3">${items.slice(0, 6).map(l => listingCard(l)).join('')}</div>
    </div></div></section>`;
  }).join('');

  // ---------- 지역별 · 예산별 ----------
  const seoulGu = Object.entries(byGugun).filter(([k]) => k.startsWith('서울/')).sort((a, b) => b[1].length - a[1].length).slice(0, 14);
  const gyeonggi = Object.entries(byGugun).filter(([k]) => k.startsWith('경기/') || k.startsWith('인천/')).sort((a, b) => b[1].length - a[1].length).slice(0, 14);
  const regionSec = `<section class="sec"><div class="wrap"><div class="region-budget">
    <div class="panel-card"><div class="sec__head" style="margin-bottom:16px"><div><span class="eyebrow">지역별 주요상권</span><h2 class="h2">지역으로 찾기</h2></div><a class="more" href="${u('/region/')}">전체 ${ICONS.arrow}</a></div>
      <div class="tabs tabs--pills tabs--sm" data-tabs><div class="tabs__nav" role="tablist"><button class="tabs__tab" role="tab" aria-selected="true" aria-controls="rg-0" id="rg-tab-0" type="button">서울</button><button class="tabs__tab" role="tab" aria-selected="false" aria-controls="rg-1" id="rg-tab-1" type="button">경기·인천</button></div>
      <div class="tabs__panels"><div class="tabs__panel" role="tabpanel" id="rg-0"><div class="regions">${seoulGu.map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent('서울')}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${arr.length}</small></a>`).join('')}</div></div><div class="tabs__panel" role="tabpanel" id="rg-1" hidden><div class="regions">${gyeonggi.map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(k.split('/')[0])}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.replace('/', ' '))}<small>${arr.length}</small></a>`).join('')}</div></div></div></div></div>
    <div class="panel-card"><div class="sec__head" style="margin-bottom:16px"><div><span class="eyebrow">예산별 창업상품</span><h2 class="h2">권리금으로 찾기</h2></div><a class="more" href="${u('/budget/')}">전체 ${ICONS.arrow}</a></div>
      <ol class="budget-list">${BUDGETS.map(b => { const arr = byBudget[b.slug] || []; const avgP = arr.filter(l => l.profit).length ? Math.round(arr.filter(l => l.profit).reduce((s, l) => s + l.profit, 0) / arr.filter(l => l.profit).length) : 0; return `<li><a href="${u(`/budget/${b.slug}/`)}"><span class="budget-list__name">${esc(b.name)}</span><span class="budget-list__meta">${arr.length}건${avgP ? ` · 평균 월수익 ${esc(fmtMan(avgP))}` : ''}</span>${ICONS.arrow}</a></li>`; }).join('')}</ol>
      <p class="muted" style="font-size:.82rem;margin-top:10px">표시 금액은 임대보증금을 제외한 권리금입니다.</p></div>
  </div></div></section>`;

  // ---------- 인기 프랜차이즈 ----------
  const brandSec = `<section class="sec sec--tight sec--paper sec--bordered"><div class="wrap"><div class="sec__head" style="margin-bottom:18px"><div><span class="eyebrow">인기 프랜차이즈</span><h2 class="h2">브랜드로 찾는 양도양수</h2></div><a class="more" href="${u('/brand/')}">브랜드 전체 ${ICONS.arrow}</a></div>
    <div class="brand-wall">${brandsSorted.slice(0, 30).map(b => `<a class="brand-wall__item" href="${u(`/brand/${b.slug}/`)}"><strong>${esc(b.name)}</strong><small>${b.n}건</small></a>`).join('')}</div></div></section>`;

  // ---------- 숫자 · 절차 · 담당자 · 글 ----------
  const statsSec = `<section class="sec sec--tight"><div class="wrap"><div class="stats">
    <div class="stat"><strong data-count="${stats.total}" data-suffix="건">${stats.total}건</strong><span>등록 창업 매물</span></div>
    <div class="stat"><strong data-count="${stats.brands}" data-suffix="개">${stats.brands}개</strong><span>프랜차이즈 브랜드</span></div>
    <div class="stat"><strong data-count="${stats.regions}" data-suffix="곳">${stats.regions}곳</strong><span>시·구 단위 상권</span></div>
    <div class="stat"><strong data-count="${stats.agents}" data-suffix="명">${stats.agents}명</strong><span>담당 창업전문가 · 24시간 상담</span></div>
  </div></div></section>`;
  const process = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">진행 절차</span><h2 class="h2">상담부터 인수까지, 담당자가 함께합니다</h2></div></div>
    <ol class="steps">
      <li class="step reveal"><h3>매물 선택·전화 연결</h3><p>매물에서 담당자에게 바로 전화하거나 문자 상담을 남깁니다. 어떤 매물을 보셨는지 담당자에게 자동으로 전달됩니다.</p></li>
      <li class="step reveal"><h3>자료 확인</h3><p>월매출·월지출 근거 자료, 임대 조건(보증금·월세), 시설 상태를 담당자가 설명합니다.</p></li>
      <li class="step reveal"><h3>현장 답사</h3><p>양도인의 보안 요청에 따라 정확한 위치는 상담 후 안내하며, 담당자가 동행해 상권과 매장을 확인합니다.</p></li>
      <li class="step reveal"><h3>조건 협의·계약</h3><p>권리금·인수 시점·본사 승인(프랜차이즈) 절차를 조율하고 계약을 진행합니다.</p></li>
      <li class="step reveal"><h3>인수·오픈</h3><p>교육과 인수인계를 거쳐 영업을 이어갑니다. 인수 후에도 담당자가 운영 문의에 응대합니다.</p></li>
    </ol></div></section>`;
  const agentSec = `<section class="sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">담당 창업전문가</span><h2 class="h2">매물마다 담당자가 정해져 있습니다</h2></div><a class="more" href="${u('/agents/')}">전체 보기 ${ICONS.arrow}</a></div>
    <div class="agents-grid">${agents.filter(a => a.active).slice(0, 4).map(a => agentCard(a, ctx)).join('')}</div></div></section>`;
  const blogSec = posts.length ? `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">창업 인사이트 · 매일 3편</span><h2 class="h2">지역·브랜드·예산으로 읽는 창업</h2></div><a class="more" href="${u('/blog/')}">전체 글 ${ICONS.arrow}</a></div>
    <div class="post-grid">${posts.slice(0, 3).map(p => `<a class="post-card reveal" href="${u(`/blog/${p.slug}/`)}"><div class="post-card__cover">${p.cover ? img(p.cover, p.title, { w: 600, h: 338 }) : ILLO.shop}</div><div class="post-card__body">${badge(p.category || '매물 분석', 'yellow')}<h3>${esc(p.title)}</h3><div class="post-card__meta"><span>${esc(p.date.slice(0, 10))}</span></div></div></a>`).join('')}</div></div></section>` : '';
  const noticeSec = `<section class="sec sec--tight"><div class="wrap"><div class="notice-box glass"><div><strong>창업미디어에서 알려드립니다</strong><p>${esc(SITE.legalNotice[0])}</p></div><button class="btn btn--sm" type="button" data-modal-open="modal-notice">전문 보기</button></div></div></section>
  <div class="modal" id="modal-notice" aria-hidden="true" role="dialog" aria-labelledby="modal-notice-title"><div class="modal__panel"><button class="modal__close" type="button" data-modal-close aria-label="닫기">${ICONS.close}</button><h3 id="modal-notice-title" class="h3" style="margin-bottom:12px">창업미디어 고지 사항</h3>${SITE.legalNotice.map(p => `<p style="font-size:.92rem;color:var(--ink-2);line-height:1.7">${esc(p)}</p>`).join('')}</div><button class="modal__backdrop" type="button" data-modal-close aria-label="닫기"></button></div>`;
  const recent = `<section class="sec sec--tight"><div class="wrap"><span class="eyebrow">최근 본 매물</span><div class="chips" data-recent></div></div></section>`;

  const body = hero + finder + best + themeSec + catSecs + regionSec + brandSec + statsSec + process + agentSec + blogSec + recent + ctaBand() + `<section class="sec"><div class="wrap">${faqBlock(FAQ)}</div></section>` + noticeSec;
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: '최신 창업 매물', itemListElement: latest.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/listing/${l.id}/`), name: l.title })) }];
  return layout({ title: SEO.homeTitle, desc: SEO.homeDesc, path: '/', body, active: 'home', ld, keywords: SEO.keywords, bodyClass: 'is-home' });
}
