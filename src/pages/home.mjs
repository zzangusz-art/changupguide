import { SITE, SEO, CATEGORIES, THEMES, BUDGETS, HERO_SLIDES, POPULAR_BRANDS, FAQ, SIDO_ORDER } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, CAT_ILLO, sticker, listingCard, faqBlock, ctaBand, img, imgPath } from '../lib/html.mjs';
import { agentCard } from '../lib/agents.mjs';
import { brandByName, fmtMan, fmtWon } from '../lib/text.mjs';

export function homePage(ctx) {
  const { listings, stats, brandsSorted, bySido, byGugun, byTheme, byCode, posts, agents } = ctx;
  const latest = listings.slice(0, 8);
  const highProfit = [...listings].filter(l => l.profit).sort((a, b) => b.profit - a.profit).slice(0, 4);
  const lowCap = [...listings].filter(l => l.premium && l.premium < 10000 && l.profit).sort((a, b) => b.profit - a.profit).slice(0, 4);

  // ---- 히어로: 텍스트 좌 · 브랜드 매장 사진 크게 우 ----
  const slides = HERO_SLIDES.map((s, i) => {
    const b = brandByName(s.brand); const arr = b ? (ctx.byBrand[b.slug] || []) : [];
    const seen = new Set(); const photos = arr.filter(l => l.images && l.images[0] && l.images[0].startsWith('photos/') && !seen.has(l.images[0]) && seen.add(l.images[0])).slice(0, 3).map(l => ({ src: imgPath(l.images[0]), alt: `${l.title} 매장 사진` }));
    const avgSales = arr.filter(l => l.sales).length ? Math.round(arr.filter(l => l.sales).reduce((x, l) => x + l.sales, 0) / arr.filter(l => l.sales).length) : 0;
    const minPrem = arr.filter(l => l.premium).length ? Math.min(...arr.filter(l => l.premium).map(l => l.premium)) : 0;
    const href = b && arr.length ? u(`/brand/${b.slug}/`) : u(`/listings/?q=${encodeURIComponent(s.brand)}`);
    const [first, ...restWords] = s.title.split(' ');
    return `<div class="slide slide--${s.theme}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${HERO_SLIDES.length}">
      <div class="slide__bg"></div>
      <div class="slide__txt">
        <span class="eyebrow">${esc(s.eyebrow)}</span>
        <h2 class="slide__title"><span class="hl">${esc(first)}</span> ${esc(restWords.join(' '))}</h2>
        <p class="slide__sub">${esc(s.sub)}</p>
        <div class="slide__tags">${s.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="slide__btns"><a class="btn btn--ink btn--lg" href="${href}">${esc(s.brand)} 매물 ${arr.length ? arr.length + '건 ' : ''}보기</a><a class="btn btn--lg" href="${u('/inquiry/')}">창업 문의</a></div>
      </div>
      <div class="slide__art">
        ${photos.map((p, k) => `<figure class="slide__photo slide__photo--${'abc'[k]}">${img(p.src, p.alt, { lazy: i > 0, w: 900, h: 675 })}</figure>`).join('')}
        ${arr.length ? `<div class="slide__stat slide__stat--1">${sticker(`현재 매물 ${arr.length}건${minPrem ? ` · 권리금 ${fmtWon(minPrem)}부터` : ''}`, { tone: 'white' })}</div>` : ''}
        ${avgSales ? `<div class="slide__stat slide__stat--2">${sticker(`평균 월매출 ${fmtMan(avgSales)}`, { tone: 'white' })}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  const hero = `<section class="hero" aria-roledescription="carousel" aria-label="추천 브랜드 창업"><div class="hero__track">${slides}</div>
    <button class="hero__arrow hero__arrow--prev" type="button" aria-label="이전 배너">${ICONS.arrow}</button><button class="hero__arrow hero__arrow--next" type="button" aria-label="다음 배너">${ICONS.arrow}</button>
    <div class="hero__dots" role="tablist"></div><div class="hero__counter">1 / ${HERO_SLIDES.length}</div></section>`;

  // ---- 빠른 검색 ----
  const sidos = SIDO_ORDER.filter(s => bySido[s]);
  const finder = `<section class="finder"><div class="wrap"><form class="finder__box" action="${u('/listings/')}" method="get" role="search" aria-label="매물 빠른 검색">
    <div class="finder__row">
      <label>키워드<input type="search" name="q" placeholder="인천 메가커피 / 강남 카페 1억 이하" data-suggest autocomplete="off"></label>
      <label>지역<select name="sido"><option value="">전체</option>${sidos.map(s => `<option value="${s}">${s} (${bySido[s].length})</option>`).join('')}</select></label>
      <label>브랜드<select name="brandSlug"><option value="">전체</option>${brandsSorted.slice(0, 40).map(b => `<option value="${b.slug}">${esc(b.name)} (${b.n})</option>`).join('')}</select></label>
      <label>예산(권리금)<select name="budget"><option value="">전체</option>${BUDGETS.map(b => `<option value="${b.slug}">${b.name}</option>`).join('')}</select></label>
      <button class="btn btn--ink" type="submit">${ICONS.search}매물 찾기</button>
    </div>
    <div class="finder__hint"><span class="badge badge--yellow">TIP</span> "인천 메가커피"처럼 지역과 브랜드를 함께 쓰면 두 조건을 모두 만족하는 매물만 보여줍니다. 인기 브랜드: ${brandsSorted.slice(0, 6).map(b => `<a href="${u(`/brand/${b.slug}/`)}">${esc(b.name)}</a>`).join(' ')}</div>
  </form></div></section>`;

  // ---- 숫자 ----
  const statsSec = `<section class="sec sec--tight"><div class="wrap"><div class="stats">
    <div class="stat"><strong data-count="${stats.total}" data-suffix="건">${stats.total}건</strong><span>등록 창업 매물</span></div>
    <div class="stat"><strong data-count="${stats.brands}" data-suffix="개">${stats.brands}개</strong><span>프랜차이즈 브랜드</span></div>
    <div class="stat"><strong data-count="${stats.regions}" data-suffix="곳">${stats.regions}곳</strong><span>시·구 단위 상권</span></div>
    <div class="stat"><strong data-count="${stats.agents}" data-suffix="명">${stats.agents}명</strong><span>담당 창업전문가 · 24시간 상담</span></div>
  </div></div></section>`;

  // ---- 업종 타일 ----
  const tiles = `<section class="sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">업종별 창업</span><h2 class="h2">어떤 업종으로 시작할까요</h2></div><a class="more" href="${u('/listings/')}">전체 매물 ${ICONS.arrow}</a></div>
    <div class="tiles">${CATEGORIES.map(c => `<a class="tile reveal" href="${u(`/category/${c.slug}/`)}">${ILLO[CAT_ILLO[c.icon]]}<strong>${esc(c.name)}</strong><small>${(byCode[c.code] || []).length}건</small></a>`).join('')}</div>
  </div></section>`;

  // ---- 최신 매물 ----
  const latestSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">NEW ARRIVALS</span><h2 class="h2">새로 등록된 <span class="hl">창업 매물</span></h2></div><a class="more" href="${u('/listings/')}">더 보기 ${ICONS.arrow}</a></div>
    <div class="grid grid--4">${latest.map((l, i) => listingCard(l, { eager: i < 4 })).join('')}</div></div></section>`;

  // ---- 브랜드 소개 (메가커피 #mega 스타일 2단) ----
  const topBrand = brandsSorted[0]; const topArr = topBrand ? ctx.byBrand[topBrand.slug] : [];
  const brandPhoto = topArr.find(l => l.images && l.images[0] && l.images[0].startsWith('photos/'));
  const introSec = `<section class="sec"><div class="wrap"><div class="about-grid" style="align-items:center">
    <div><span class="eyebrow">창업가이드 이야기</span><h2 class="h1" style="margin-bottom:18px">숫자로 확인하고,<br><span class="hl">담당자와 바로</span> 상담합니다</h2>
      <p style="font-size:1.05rem;color:var(--ink-2);max-width:48ch;line-height:1.8">창업가이드(구 창업미디어)는 사업체 양도양수를 전문으로 하는 창업 컨설팅 회사입니다. 운영 중인 매장의 월매출·월지출·월수익과 권리금을 공개하고, 매물마다 정해진 담당 창업전문가가 자료 확인부터 현장 답사, 계약과 본사 승인까지 함께합니다.</p>
      <p class="muted" style="font-size:.92rem">일반 부동산 중개대상물은 취급하지 않으며, 양도인의 영업 보안을 위해 정확한 위치는 상담 후 안내합니다.</p>
      <div class="chips" style="margin-top:22px;gap:10px"><a class="btn btn--ink" href="${u('/about/')}">회사 소개</a><a class="btn" href="${u('/inquiry/')}">창업 문의</a></div></div>
    <div style="position:relative">${brandPhoto ? `<div style="border-radius:var(--r-lg);overflow:hidden;aspect-ratio:4/3;box-shadow:var(--shadow-lg)">${img(imgPath(brandPhoto.images[0]), `${brandPhoto.title} 매장`, { w: 900, h: 675 })}</div>` : ''}</div>
  </div></div></section>`;

  // ---- 테마 ----
  const tones = ['yellow', 'white', 'white', 'white', 'white', 'ink', 'white', 'white'];
  const themesSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">창업 테마</span><h2 class="h2">상황에 맞는 창업 방식부터</h2></div></div>
    <div class="themes">${THEMES.map((t, i) => `<a class="theme-card theme-card--${tones[i]} reveal" href="${u(`/theme/${t.slug}/`)}">${sticker(`${(byTheme[t.name] || []).length}건`, { tone: 'white', size: 'sm' })}<h3>${esc(t.name)}</h3><p>${esc(t.h1)}</p></a>`).join('')}</div>
  </div></section>`;

  // ---- 고수익 / 소자본 ----
  const twoSec = `<section class="sec"><div class="wrap">
    <div class="sec__head"><div><span class="eyebrow">월수익 상위</span><h2 class="h2">수익 구조가 확인된 매물</h2></div><a class="more" href="${u('/listings/?sort=profit')}">수익순 보기 ${ICONS.arrow}</a></div>
    <div class="grid grid--4">${highProfit.map(l => listingCard(l)).join('')}</div>
    <div class="sec__head" style="margin-top:64px"><div><span class="eyebrow">소자본 창업</span><h2 class="h2">권리금 1억 미만으로 시작</h2></div><a class="more" href="${u('/budget/under-1/')}">1억 미만 전체 ${ICONS.arrow}</a></div>
    <div class="grid grid--4">${lowCap.map(l => listingCard(l)).join('')}</div>
  </div></section>`;

  // ---- 지역 ----
  const seoulGu = Object.entries(byGugun).filter(([k]) => k.startsWith('서울/')).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  const gyeonggi = Object.entries(byGugun).filter(([k]) => k.startsWith('경기/') || k.startsWith('인천/')).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  const regionSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">지역별 주요 상권</span><h2 class="h2">우리 동네 창업 매물</h2></div><a class="more" href="${u('/region/')}">전체 지역 ${ICONS.arrow}</a></div>
    <h3 class="h3" style="margin:6px 0 12px">서울</h3><div class="regions">${seoulGu.map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(k.split('/')[0])}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${arr.length}</small></a>`).join('')}</div>
    <h3 class="h3" style="margin:28px 0 12px">경기 · 인천</h3><div class="regions">${gyeonggi.map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(k.split('/')[0])}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.replace('/', ' '))}<small>${arr.length}</small></a>`).join('')}</div>
  </div></section>`;

  // ---- 브랜드 ----
  const brandSec = `<section class="sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">프랜차이즈 브랜드</span><h2 class="h2">브랜드로 찾는 양도양수</h2></div><a class="more" href="${u('/brand/')}">브랜드 전체 ${ICONS.arrow}</a></div>
    <div class="chips">${brandsSorted.slice(0, 36).map(b => `<a class="chip" href="${u(`/brand/${b.slug}/`)}">${esc(b.name)}<small>${b.n}</small></a>`).join('')}</div></div></section>`;

  // ---- 프로세스 ----
  const process = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">진행 절차</span><h2 class="h2">상담부터 인수까지, 담당자가 함께합니다</h2></div></div>
    <ol class="steps">
      <li class="step reveal"><h3>매물 선택·전화 연결</h3><p>매물에서 담당자에게 바로 전화하거나 문자 상담을 남깁니다. 어떤 매물을 보셨는지 담당자에게 자동으로 전달됩니다.</p></li>
      <li class="step reveal"><h3>자료 확인</h3><p>월매출·월지출 근거 자료, 임대 조건(보증금·월세), 시설 상태를 담당자가 설명합니다.</p></li>
      <li class="step reveal"><h3>현장 답사</h3><p>양도인의 보안 요청에 따라 정확한 위치는 상담 후 안내하며, 담당자가 동행해 상권과 매장을 확인합니다.</p></li>
      <li class="step reveal"><h3>조건 협의·계약</h3><p>권리금·인수 시점·본사 승인(프랜차이즈) 절차를 조율하고 계약을 진행합니다.</p></li>
      <li class="step reveal"><h3>인수·오픈</h3><p>교육과 인수인계를 거쳐 영업을 이어갑니다. 인수 후에도 담당자가 운영 문의에 응대합니다.</p></li>
    </ol></div></section>`;

  // ---- 블로그 ----
  const blogSec = posts.length ? `<section class="sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">창업 인사이트 · 매일 3편</span><h2 class="h2">지역·브랜드·예산으로 읽는 창업</h2></div><a class="more" href="${u('/blog/')}">전체 글 ${ICONS.arrow}</a></div>
    <div class="post-grid">${posts.slice(0, 3).map(p => `<a class="post-card reveal" href="${u(`/blog/${p.slug}/`)}"><div class="post-card__cover">${p.cover ? img(p.cover, p.title, { w: 600, h: 338 }) : ILLO.shop}</div><div class="post-card__body"><h3>${esc(p.title)}</h3><p class="muted" style="font-size:.9rem">${esc(p.desc.slice(0, 80))}…</p><div class="post-card__meta"><span>${esc(p.date.slice(0, 10))}</span><span>·</span><span>${esc(p.category || '매물 분석')}</span></div></div></a>`).join('')}</div></div></section>` : '';

  // ---- 담당자 ----
  const agentSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">담당 창업전문가</span><h2 class="h2">매물마다 담당자가 정해져 있습니다</h2></div><a class="more" href="${u('/agents/')}">전체 보기 ${ICONS.arrow}</a></div>
    <div class="agents-grid">${agents.filter(a => a.active).slice(0, 4).map(a => agentCard(a, ctx)).join('')}</div></div></section>`;

  const recent = `<section class="sec sec--tight"><div class="wrap"><span class="eyebrow">최근 본 매물</span><div class="chips" data-recent></div></div></section>`;

  const body = hero + finder + statsSec + tiles + latestSec + introSec + themesSec + twoSec + regionSec + brandSec + process + blogSec + agentSec + recent + ctaBand() + `<section class="sec"><div class="wrap">${faqBlock(FAQ)}</div></section>`;

  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: '최신 창업 매물', itemListElement: latest.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/listing/${l.id}/`), name: l.title })) }];
  return layout({ title: SEO.homeTitle, desc: SEO.homeDesc, path: '/', body, active: 'home', ld, keywords: SEO.keywords, bodyClass: 'is-home' });
}
