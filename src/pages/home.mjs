// 메인 — 기존 창업가이드 홈 구조(이미지 배너 롤링 → 업종별 베스트 → 테마별 → 카테고리별 인기상품 → 지역·예산 → 인기 프랜차이즈 → 고지)를 현대적으로 재구성
import { SITE, SEO, CATEGORIES, THEMES, BUDGETS, HERO_SLIDES, POPULAR_BRANDS, FAQ, SIDO_ORDER } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, CAT_ILLO, badge, listingCard, skeletonCards, faqBlock, ctaBand, img, imgPath, brandLogoImg, rail, BUILD_ID } from '../lib/html.mjs';
import { PICKS, pickItems, themeItems } from '../lib/picks.mjs';
import { leadForm } from '../lib/lead.mjs';
import { coverFor } from './hubs.mjs';
import { koreaMap } from '../lib/map.mjs';
import { agentCard } from '../lib/agents.mjs';
import { brandByName, fmtMan, fmtWon } from '../lib/text.mjs';

const photoOf = l => l && !l.noPhoto && l.images && l.images[0] && l.images[0].startsWith('photos/') ? imgPath(l.images[0]) : '';

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
    // 원본 비율 이미지(public/img/hero/{slug}.jpg)를 자르지 않고 표시, 같은 이미지를 흐리게 깔아 배경으로 사용
    const heroFile = s.img ? u(`/img/hero/${s.img}.jpg?v=${BUILD_ID}`) : '';
    const bgUrl = s.logo ? '' : heroFile || (bg ? (/^https?:/.test(bg) ? bg : u('/' + bg)) : '');
    const bgStyle = bgUrl && i === 0 ? `--bg:url('${esc(bgUrl)}')` : '';
    const bgData = bgUrl && i > 0 ? ` data-bg="${esc(bgUrl)}"` : '';
    return `<div class="hslide hslide--${s.theme} ${s.logo ? 'hslide--logo' : 'hslide--photo'}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${HERO_SLIDES.length}" style="${s.logo ? `--tint:${s.tint}` : `${bgStyle ? bgStyle + ';' : ''}--ar:${(s.imgW / s.imgH).toFixed(3)}`}"${bgData}>
            <div class="wrap hslide__in">${s.logo ? `<div class="hslide__logo"><img src="${u('/img/hero/' + s.logo)}?v=${BUILD_ID}" alt="${esc(s.brand)} 로고"></div>` : bgUrl ? `<div class="hslide__media"><img src="${esc(bgUrl)}" alt="${esc(s.brand)} 대표 이미지" ${s.imgW ? `width="${s.imgW}" height="${s.imgH}"` : ''} ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></div>` : ''}
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
    <div class="hero2__pager glass" role="tablist" data-hero-pager></div></section>`;

  // ---------- 검색 바 ----------
  const sidos = SIDO_ORDER.filter(s => bySido[s]);
  const finder = `<section class="finder2"><div class="wrap"><form class="finder2__box glass" action="${u('/listings/')}" method="get" role="search" aria-label="매물 빠른 검색">
    <div class="finder2__q"><span class="finder2__ico">${ICONS.search}</span><input type="search" name="q" placeholder="예) 강남구 메가커피, 인천 카페 1억 이하" aria-label="매물 검색" data-suggest autocomplete="off"><button class="btn btn--ink" type="submit">검색</button></div>
    <div class="finder2__sel">
      <select name="sido" aria-label="지역"><option value="">지역 전체</option>${sidos.map(s => `<option value="${s}">${s} (${bySido[s].length})</option>`).join('')}</select>
      <select name="brandSlug" aria-label="브랜드"><option value="">브랜드 전체</option>${brandsSorted.slice(0, 40).map(b => `<option value="${b.slug}">${esc(b.name)} (${b.n})</option>`).join('')}</select>
      <select name="budget" aria-label="예산"><option value="">예산 전체</option>${BUDGETS.map(b => `<option value="${b.slug}">권리금 ${b.name}</option>`).join('')}</select>
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
      <div class="tabs__panels">${bestTabs.map((t, i) => `<div class="tabs__panel" role="tabpanel" id="best-${i}" aria-labelledby="best-tab-${i}" ${i ? 'hidden' : ''}>${rail(t.items.slice(0, 10).map(l => listingCard(l)))}</div>`).join('')}<div class="tabs__skeleton grid grid--4" hidden>${skeletonCards(4)}</div></div>
    </div></div></section>`;

  // ---------- 테마별 창업 (배너 + 탭) ----------
  const themeTabs = THEMES.map(t => ({ ...t, items: themeItems(t, ctx) })).filter(t => t.items.length >= 3);
  const themeCopy = { 초보창업: ['첫 창업이 막막할 때', '운영 매뉴얼이 갖춰진 매장부터, 담당자가 처음부터 끝까지 동행합니다.'], 소자본창업: ['권리금 1억 미만으로 시작', '테이크아웃·배달·소형 매장 중심의 소자본 창업 매물입니다.'], 여성창업: ['혼자서도 운영 가능한 매장', '규칙적인 영업시간과 1인 운영이 가능한 업종을 골랐습니다.'], 고수익창업: ['수익 구조가 확인된 매장', '월매출·월지출·월수익을 항목별로 공개합니다.'], 프랜차이즈창업: ['운영 중인 가맹점 인수', '신규 오픈 비용 없이 매출이 검증된 가맹점으로 시작합니다.'], 시니어창업: ['체력 부담이 적은 업종', '안정 상권과 간편 운영, 본사 교육이 있는 매물입니다.'], 수익형창업: ['상주하지 않아도 돌아가는 매장', '오토·반오토 운영 구조의 투자형 매물입니다.'], 신도시창업: ['입주가 진행 중인 상권', '신도시·택지지구의 성장 상권 매물입니다.'] };
  const themeSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">테마별</span><h2 class="h2">창업가이드 <span class="hl">추천 테마</span></h2></div><a class="more" href="${u('/theme/')}">테마 전체 ${ICONS.arrow}</a></div>
    <div class="tabs tabs--pills" data-tabs>
      <div class="tabs__nav" role="tablist">${themeTabs.map((t, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="theme-${i}" id="theme-tab-${i}" type="button">${esc(t.name)}<small>${t.items.length}</small></button>`).join('')}</div>
      <div class="tabs__panels">${themeTabs.map((t, i) => { const copy = themeCopy[t.name] || [t.h1, t.desc]; const feat = t.items.find(photoOf) || t.items[0]; return `<div class="tabs__panel" role="tabpanel" id="theme-${i}" aria-labelledby="theme-tab-${i}" ${i ? 'hidden' : ''}><div class="theme-row">
        <a class="theme-banner" href="${u(`/theme/${t.slug}/`)}" style="${photoOf(feat) ? `background-image:url('${esc(u('/' + photoOf(feat)))}')` : ''}"><div class="theme-banner__shade"></div><div class="theme-banner__txt"><span class="badge badge--yellow">창업가이드 추천테마</span><strong>${esc(copy[0])}</strong><h3>${esc(t.name)}</h3><p>${esc(copy[1])}</p><span class="theme-banner__cta">창업상품 보러가기 ${ICONS.arrow}</span></div></a>
        <div class="theme-row__cards">${rail(t.items.slice(0, 9).map(l => listingCard(l)), { cols: 3 })}</div></div></div>`; }).join('')}<div class="tabs__skeleton grid grid--4" hidden>${skeletonCards(4)}</div></div>
    </div></div></section>`;

  // ---------- 카테고리별 인기상품 (좌 패널 + 우 카드 6) ----------
  const catKeywords = { 100: ['#메가커피', '#컴포즈커피', '#파리바게뜨', '#배스킨라빈스', '#롯데리아'], 300: ['#한양화로', '#한솥도시락', '#죽이야기', '#고기전문점', '#디저트/브런치'], 200: ['#교촌치킨', '#BHC치킨', '#치킨전문점', '#BBQ치킨', '#역전할머니맥주'], 500: ['#골프존', '#스터디카페', '#필라테스', '#PC방', '#키즈카페'], 400: ['#올리브영', '#편의점', '#정관장', '#무인매장', '#셀프빨래방'], 600: ['#백소정', '#대형마트', '#백화점', '#영화관', '#대학교'] };
  const catList = CATEGORIES.filter(c => (byCode[c.code] || []).length);
  const catSecs = `<section class="sec sec--tight catsec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">카테고리별</span><h2 class="h2">카테고리별 <span class="hl">인기상품</span></h2></div><a class="more" href="${u('/listings/')}">전체 매물 ${ICONS.arrow}</a></div>
    <div class="tabs tabs--pills" data-tabs data-auto="8000"><div class="tabs__nav" role="tablist">${catList.map((c, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="cat-${i}" id="cat-tab-${i}" type="button">${esc(c.name)}<small>${byCode[c.code].length}</small></button>`).join('')}</div>
    <div class="tabs__panels">${catList.map((c, i) => { const items = byCode[c.code];
      const kinds = c.kinds.map(k => [k, (byKind[k[0]] || []).length]).filter(([, n]) => n).slice(0, 6);
      const kw = (catKeywords[c.code] || []).slice(0, 5).map(k => { const name = k.slice(1); const b = brandByName(name); return `<a class="chip" href="${b && !b.generic && ctx.byBrand[b.slug] ? u(`/brand/${b.slug}/`) : u(`/listings/?q=${encodeURIComponent(name)}&code=${c.code}`)}">${esc(k)}</a>`; }).join('');
      return `<div class="tabs__panel" role="tabpanel" id="cat-${i}" aria-labelledby="cat-tab-${i}" ${i ? 'hidden' : ''}><div class="catsec__in">
        <aside class="catsec__side glass"><h3 class="h2"><a href="${u(`/category/${c.slug}/`)}">${esc(c.name)}</a></h3><ul class="catsec__kinds">${kinds.map(([k, n]) => `<li><a href="${u(`/category/${c.slug}/${k[0]}/`)}">${esc(k[1])}<small>${n}</small></a></li>`).join('')}</ul><div class="chips">${kw}</div></aside>
        <div class="catsec__cards">${rail(items.slice(0, 9).map(l => listingCard(l)), { cols: 3 })}</div></div></div>`; }).join('')}</div></div></div></section>`;

  // ---------- 훅 포인트: 등록 매물 숫자로 계산 ----------
  const pickData = PICKS.map(p => ({ ...p, items: pickItems(p, listings) })).filter(p => p.items.length);
  const avgOf = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.round(v.reduce((s, l) => s + l[k], 0) / v.length) : 0; };
  const hooks = `<section class="sec sec--tight hooks-sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">지금 등록된 매물 기준</span><h2 class="h2">숫자로 먼저 고르는 <span class="hl">창업 매물</span></h2></div><a class="more" href="${u('/pick/')}">성향별 전체 ${ICONS.arrow}</a></div>
    <div class="bento">${pickData.map((p, i) => `<a class="hook hook--${['ink', 'yellow'][i] || 'white'}" href="${u(`/pick/${p.slug}/`)}">${(c => c ? `<img class="hook__bg" src="${u('/' + (i ? imgPath(c, 'thumb') : c))}" alt="" loading="lazy" decoding="async">` : '')(coverFor('p-' + p.slug, p.items))}<span class="hook__tag">${esc(p.name)}</span><strong class="hook__num">${p.items.length.toLocaleString('ko-KR')}<small>건</small></strong><h3>${esc(p.hook)}</h3><p>평균 월수익 ${esc(fmtMan(avgOf(p.items, 'profit')))}</p><span class="hook__cta" aria-hidden="true">${ICONS.arrow}</span></a>`).join('')}</div>
  </div></section>`;
  const picksSec = `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">성향별</span><h2 class="h2">내 창업 성향에 맞는 <span class="hl">추천 매물</span></h2></div><a class="more" href="${u('/pick/')}">전체 보기 ${ICONS.arrow}</a></div>
    <div class="tabs tabs--pills" data-tabs data-auto="9000"><div class="tabs__nav" role="tablist">${pickData.map((p, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="pk-${i}" id="pk-tab-${i}" type="button">${esc(p.name)}<small>${p.items.length}</small></button>`).join('')}</div>
    <div class="tabs__panels">${pickData.map((p, i) => `<div class="tabs__panel" role="tabpanel" id="pk-${i}" aria-labelledby="pk-tab-${i}" ${i ? 'hidden' : ''}><p class="pick-line"><b>${esc(p.hook)}</b><span>${esc(p.rule)}</span></p>${rail(p.items.slice(0, 10).map(l => listingCard(l)))}</div>`).join('')}</div></div></div></section>`;
  const leadSec = `<section class="sec lead-sec"><div class="wrap">${leadForm()}</div></section>`;

  // ---------- 지역별 · 예산별 ----------
  const regionSec = `<section class="sec"><div class="wrap"><div class="region-budget">
    <div class="panel-card panel-card--map"><div class="sec__head" style="margin-bottom:16px"><div><span class="eyebrow">지역별 주요상권</span><h2 class="h2">지역으로 찾기</h2></div><a class="more" href="${u('/region/')}">전체 ${ICONS.arrow}</a></div>
      <div class="region-home tabs tabs--pills tabs--sm" data-tabs>
        <div class="home-map">${koreaMap(Object.fromEntries(Object.entries(bySido).map(([k, a]) => [k, a.length])), { compact: true, focus: 'capital', id: 'kmap-home' })}</div>
        <div class="tabs__nav" role="tablist">${['서울', '경기', '인천'].filter(sd => bySido[sd]).map((sd, i) => `<button class="tabs__tab" role="tab" aria-selected="${i === 0}" aria-controls="rg-${i}" id="rg-tab-${i}" type="button">${sd}<small>${bySido[sd].length}</small></button>`).join('')}</div>
        <div class="tabs__panels">${['서울', '경기', '인천'].filter(sd => bySido[sd]).map((sd, i) => `<div class="tabs__panel" role="tabpanel" id="rg-${i}" aria-labelledby="rg-tab-${i}" ${i ? 'hidden' : ''}><div class="regions">${Object.entries(byGugun).filter(([k]) => k.startsWith(sd + '/')).sort((x, y) => y[1].length - x[1].length).slice(0, 14).map(([k, arr]) => `<a class="region-pill" href="${u(`/region/${encodeURIComponent(sd)}/${encodeURIComponent(k.split('/')[1])}/`)}">${esc(k.split('/')[1])}<small>${arr.length}</small></a>`).join('')}</div></div>`).join('')}</div>
      </div></div>
    <div class="panel-card"><div class="sec__head" style="margin-bottom:16px"><div><span class="eyebrow">예산별 창업상품</span><h2 class="h2">권리금으로 찾기</h2></div><a class="more" href="${u('/budget/')}">전체 ${ICONS.arrow}</a></div>
      <ol class="budget-list">${BUDGETS.map(b => { const arr = byBudget[b.slug] || []; const avgP = arr.filter(l => l.profit).length ? Math.round(arr.filter(l => l.profit).reduce((s, l) => s + l.profit, 0) / arr.filter(l => l.profit).length) : 0; return `<li><a href="${u(`/budget/${b.slug}/`)}"><span class="budget-list__name">${esc(b.name)}</span><span class="budget-list__meta">${arr.length}건${avgP ? ` · 평균 월수익 ${esc(fmtMan(avgP))}` : ''}</span>${ICONS.arrow}</a></li>`; }).join('')}</ol>
      <p class="muted" style="font-size:.82rem;margin-top:10px">표시 금액은 임대보증금을 제외한 권리금입니다.</p></div>
  </div></div></section>`;

  // ---------- 인기 프랜차이즈 ----------
  const brandSec = `<section class="sec sec--tight sec--paper sec--bordered"><div class="wrap"><div class="sec__head" style="margin-bottom:18px"><div><span class="eyebrow">인기 프랜차이즈</span><h2 class="h2">브랜드로 찾는 양도양수</h2></div><a class="more" href="${u('/brand/')}">브랜드 전체 ${ICONS.arrow}</a></div>
    <div class="brand-wall brand-wall--logos">${POPULAR_BRANDS.map(name => { const b = brandByName(name); const slug = b ? b.slug : ''; const n = slug && ctx.byBrand[slug] ? ctx.byBrand[slug].length : 0; const href = n ? u(`/brand/${slug}/`) : u(`/listings/?q=${encodeURIComponent(name)}`); const logo = brandLogoImg(slug, name, { h: 36 }); return `<a class="brand-wall__item" href="${href}" title="${esc(name)} 창업 매물">${logo || `<strong>${esc(name)}</strong>`}</a>`; }).join('')}</div></div></section>`;

  // ---------- 숫자 · 절차 · 담당자 · 글 ----------
  const statsSec = `<section class="sec sec--tight"><div class="wrap"><div class="stats">
    <div class="stat"><strong data-count="${stats.total}" data-suffix="건">${stats.total}건</strong><span>등록 창업 매물</span></div>
    <div class="stat"><strong data-count="${stats.brands}" data-suffix="개">${stats.brands}개</strong><span>프랜차이즈 브랜드</span></div>
    <div class="stat"><strong data-count="${stats.regions}" data-suffix="곳">${stats.regions}곳</strong><span>시·구 단위 상권</span></div>
    ${stats.agents ? `<div class="stat"><strong data-count="${stats.agents}" data-suffix="명">${stats.agents}명</strong><span>담당 창업전문가 · 24시간 상담</span></div>` : `<div class="stat"><strong data-count="12" data-suffix="년">12년</strong><span>2014년부터 양도양수 컨설팅</span></div>`}
  </div></div></section>`;
  // ---------- 진행 절차: 스크롤 시퀀스 (좌측 고정 단계 표시 + 우측 단계 카드가 스크롤에 따라 활성화) ----------
  const SEQ = [
    { t: '매물 선택 · 담당자 연결', who: '창업자 → 담당 창업전문가', d: '매물 페이지의 "담당자 전화 연결" 또는 문자 상담을 누르면 담당자에게 바로 연결됩니다. 어떤 매물을 보고 연락했는지 링크가 담당자 휴대폰으로 자동 전송되어 설명을 처음부터 반복하지 않습니다.', out: ['통화 즉시 연결', '열람 매물 링크 자동 문자', '상담 가능 시간 안내'], icon: 'phone', time: '당일' },
    { t: '매출·임대 자료 확인', who: '담당자 → 창업자', d: '양도인이 제출한 월매출·월지출 근거(포스 자료, 카드 매출, 배달앱 정산), 임대차 조건(보증금·월세·잔여 기간), 시설·집기 상태를 담당자가 정리해 설명합니다. 점주 인건비 제외 기준도 함께 안내합니다.', out: ['월매출·월지출 근거 자료', '임대차 조건 요약', '총 창업비용 산출'], icon: 'chart', time: '1~3일' },
    { t: '현장 답사 (담당자 동행)', who: '담당자 + 창업자', d: '양도인의 영업 보안을 위해 정확한 위치는 상담 후 안내하며, 담당자가 동행해 상권·유동 인구·경쟁 매장·매장 상태를 함께 확인합니다. 필요하면 시간대를 달리해 2차 답사를 진행합니다.', out: ['상권·경쟁 매장 체크', '시설 상태 점검', '영업시간대별 유동 확인'], icon: 'pin', time: '1~2주' },
    { t: '조건 협의 · 계약', who: '양도인 ↔ 창업자 (담당자 조율)', d: '권리금·인수 시점·집기 포함 범위를 조율하고, 프랜차이즈는 본사 양수인 승인(교육 이수·계약 승계)을 함께 진행합니다. 임대인과의 임대차 승계 또는 신규 계약도 담당자가 일정에 맞춰 안내합니다.', out: ['권리금·인수 조건 합의', '본사 승인·교육 일정', '임대차 승계'], icon: 'doc', time: '2~4주' },
    { t: '인수 · 오픈 후 지원', who: '담당자 → 창업자', d: '인수인계(레시피·거래처·직원·운영 노하우)를 거쳐 영업을 이어갑니다. 오픈 후에도 운영 문의, 추가 매장 확장, 향후 양도 의뢰까지 같은 담당자가 응대합니다.', out: ['인수인계 체크리스트', '오픈 후 운영 문의 응대', '확장·양도 재상담'], icon: 'flag', time: '인수일 이후' },
  ];
  const SEQ_ICON = { phone: ICONS.phone, chart: ICONS.chart || ICONS.bolt, pin: ICONS.pin || ICONS.search, doc: ICONS.doc || ICONS.share, flag: ICONS.flag || ICONS.arrow };
  const process = `<section class="sec sec--paper sec--bordered seq-sec" id="process"><div class="wrap seq" data-seq>
    <div class="seq__side"><div class="seq__sticky">
      <span class="eyebrow">진행 절차</span><h2 class="h2">상담부터 인수까지,<br>담당자가 <span class="hl">5단계</span>로 함께합니다</h2>
      <p class="seq__lead">모든 매물에는 담당 창업전문가가 정해져 있습니다. 전화 한 통으로 시작해 인수 후까지 같은 담당자가 이어서 응대합니다.</p>
      <ol class="seq__nav"><span class="seq__line"><i data-seq-progress></i></span>${SEQ.map((s, i) => `<li><button type="button" data-seq-go="${i}" aria-current="${i === 0 ? 'step' : 'false'}"><b>0${i + 1}</b><span>${esc(s.t)}</span><small>${esc(s.time)}</small></button></li>`).join('')}</ol>
      <div class="seq__cta"><a class="btn btn--yellow btn--lg" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰 남기기</a>${SITE.phone ? `<a class="btn btn--ink btn--lg" href="tel:${SITE.phoneTel}">${ICONS.phone}${esc(SITE.phone)}</a>` : `<a class="btn btn--ink btn--lg" href="${u('/sell/')}">${ICONS.share}양도 의뢰</a>`}</div>
    </div></div>
    <ol class="seq__steps">${SEQ.map((s, i) => `<li class="seq__step" data-seq-step="${i}" id="step-${i + 1}">
      <div class="seq__card glass">
        <div class="seq__num"><b>0${i + 1}</b><span>${esc(s.time)}</span></div>
        <div class="seq__body"><span class="seq__icon">${SEQ_ICON[s.icon]}</span><p class="seq__who">${esc(s.who)}</p><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
          <ul class="seq__out">${s.out.map(o => `<li>${ICONS.check || '✓'}${esc(o)}</li>`).join('')}</ul></div>
      </div></li>`).join('')}</ol>
  </div></section>`;
  const agentSec = !agents.length ? '' : `<section class="sec"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">담당 창업전문가</span><h2 class="h2">매물마다 담당자가 정해져 있습니다</h2></div><a class="more" href="${u('/agents/')}">전체 보기 ${ICONS.arrow}</a></div>
    <div class="agents-grid">${agents.filter(a => a.active).slice(0, 4).map(a => agentCard(a, ctx)).join('')}</div></div></section>`;
  const blogSec = posts.length ? `<section class="sec sec--paper sec--bordered"><div class="wrap"><div class="sec__head"><div><span class="eyebrow">창업 인사이트 · 매일 3편</span><h2 class="h2">지역·브랜드·예산으로 읽는 창업</h2></div><a class="more" href="${u('/blog/')}">전체 글 ${ICONS.arrow}</a></div>
    <div class="post-grid">${posts.slice(0, 3).map(p => `<a class="post-card reveal" href="${u(`/blog/${p.slug}/`)}"><div class="post-card__cover">${p.cover ? img(p.cover, p.title, { w: 600, h: 338 }) : ILLO.shop}</div><div class="post-card__body">${badge(p.category || '매물 분석', 'yellow')}<h3>${esc(p.title)}</h3><div class="post-card__meta"><span>${esc(p.date.slice(0, 10))}</span></div></div></a>`).join('')}</div></div></section>` : '';
  const noticeSec = `<section class="sec sec--tight"><div class="wrap"><div class="notice-box glass"><div><strong>창업가이드에서 알려드립니다</strong><p>${esc(SITE.legalNotice[0])}</p></div><button class="btn btn--sm" type="button" data-modal-open="modal-notice">전문 보기</button></div></div></section>
  <div class="modal" id="modal-notice" aria-hidden="true" role="dialog" aria-labelledby="modal-notice-title"><div class="modal__panel"><button class="modal__close" type="button" data-modal-close aria-label="닫기">${ICONS.close}</button><h3 id="modal-notice-title" class="h3" style="margin-bottom:12px">창업가이드 고지 사항</h3>${SITE.legalNotice.map(p => `<p style="font-size:.92rem;color:var(--ink-2);line-height:1.7">${esc(p)}</p>`).join('')}</div><button class="modal__backdrop" type="button" data-modal-close aria-label="닫기"></button></div>`;
  const recent = `<section class="sec sec--tight"><div class="wrap"><span class="eyebrow">최근 본 매물</span><div class="chips" data-recent></div></div></section>`;

  const body = hero + finder + hooks + best + themeSec + picksSec + catSecs + leadSec + regionSec + brandSec + statsSec + process + agentSec + blogSec + recent + ctaBand() + `<section class="sec"><div class="wrap">${faqBlock(FAQ)}</div></section>` + noticeSec;
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: '최신 창업 매물', itemListElement: latest.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/listing/${l.id}/`), name: l.title })) }];
  return layout({ title: SEO.homeTitle, desc: SEO.homeDesc, path: '/', body, active: 'home', ld, keywords: SEO.keywords, bodyClass: 'is-home' });
}
