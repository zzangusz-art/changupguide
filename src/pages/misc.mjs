// 회사 소개, 창업 의뢰, 양도양수 의뢰, FAQ, 개인정보, 약관, 404
import { SITE, FAQ, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER } from '../data.mjs';
import { leadForm } from '../lib/lead.mjs';
import { layout, esc, u, abs, ICONS, ILLO, sticker, starburst, breadcrumb, faqBlock, ctaBand } from '../lib/html.mjs';

export function miscPages(ctx) {
  const out = [];
  const sidos = SIDO_ORDER;
  const brands = ctx.brandsSorted.slice(0, 40);

  // ---- 창업 의뢰 ----
  const inquiryForm = (type) => `<form class="form" data-form="${type}" data-done="${u('/inquiry/done/')}">
    <div class="row"><label>이름 *<input name="name" required maxlength="20" placeholder="홍길동"></label><label>휴대폰 *<input name="phone" required inputmode="tel" placeholder="010-0000-0000"></label></div>
    ${type === 'buy' ? `<div class="row"><label>희망 지역<select name="region"><option value="">선택</option>${sidos.map(s => `<option>${s}</option>`).join('')}</select></label><label>희망 예산(권리금)<select name="budget"><option value="">선택</option>${BUDGETS.map(b => `<option>${b.name}</option>`).join('')}</select></label></div>
    <div class="row"><label>관심 브랜드<input name="brand" list="brandlist" placeholder="예) 메가커피"><datalist id="brandlist">${brands.map(b => `<option value="${esc(b.name)}">`).join('')}</datalist></label><label>관심 업종<select name="category"><option value="">선택</option>${CATEGORIES.map(c => `<option>${c.name}</option>`).join('')}</select></label></div>
    <label>창업 형태<div class="chips" data-chips="theme">${THEMES.map(t => `<button type="button" class="chip">${esc(t.name)}</button>`).join('')}</div><input type="hidden" name="theme"></label>`
    : `<div class="row"><label>매장 지역 *<input name="region" required placeholder="예) 서울 강남구"></label><label>업종·브랜드 *<input name="brand" required placeholder="예) 메가커피 / 고깃집"></label></div>
    <div class="row"><label>월매출 (만원)<input name="sales" inputmode="numeric" placeholder="예) 3500"></label><label>희망 권리금 (만원)<input name="premium" inputmode="numeric" placeholder="예) 12000"></label></div>
    <div class="row"><label>면적 (㎡ 또는 평)<input name="area" placeholder="예) 66㎡ / 20평"></label><label>양도 희망 시기<select name="when"><option>즉시</option><option>1개월 이내</option><option>3개월 이내</option><option>협의</option></select></label></div>`}
    <label>남길 말씀<textarea name="message" rows="4" maxlength="1000" placeholder="${type === 'buy' ? '예) 인천 미추홀구 근처 카페, 권리금 1억 이하, 혼자 운영 가능한 매장 찾습니다.' : '예) 역세권 1층, 풀오토 운영 중, 직원 승계 가능합니다.'}"></textarea></label>
    <label class="check"><input type="checkbox" name="agree" required> <span>개인정보 수집·이용에 동의합니다. (상담 목적, 1년 보관) <a href="${u('/privacy/')}" target="_blank">보기</a></span></label>
    <button class="btn btn--red btn--lg btn--block" type="submit">${ICONS.bolt}${type === 'buy' ? '창업 의뢰 접수' : '양도 의뢰 접수'}</button>
    <p class="muted" style="font-size:.82rem;text-align:center">접수 후 담당 창업전문가가 순서대로 연락드립니다.${SITE.phone ? ` 급하시면 ${esc(SITE.phone)}` : ''}</p>
  </form>
  <script>document.querySelectorAll('[data-chips]').forEach(c=>{c.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('is-on');c.nextElementSibling.value=[...c.querySelectorAll('.is-on')].map(x=>x.textContent).join(',')}))})</script>`;

  out.push({ path: '/inquiry/', priority: 0.8, html: layout({ title: '창업 의뢰 | 지역·브랜드·예산만 알려주세요, 담당 전문가가 매장을 찾아드립니다 — 창업가이드', desc: '원하는 지역·브랜드·예산을 남기면 창업가이드 담당 창업전문가가 조건에 맞는 양도양수 매장을 찾아 연락드립니다. 24시간 접수, 상담 무료.', path: '/inquiry/', active: 'inquiry',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '창업 의뢰', href: '/inquiry/' }])}<div class="form-page">
      <div class="panel"><p class="eyebrow">창업 의뢰</p><h1 class="h2">어떤 매장을 찾으세요?</h1><p style="font-weight:700;margin:8px 0 18px">금액·업종·상권을 차례로 고르면 됩니다. 사이트에 올라오지 않은 매장도 담당자가 함께 찾습니다.</p>${leadForm({ bare: true })}</div>
      <aside><div class="panel" style="position:relative">${starburst('상담 무료', 'red', 8)}<h2 class="h3">접수 후 진행 순서</h2><ul><li>담당 창업전문가 배정 (당일)</li><li>조건에 맞는 매장 3~5건 제안</li><li>매출 자료·임대 조건 확인</li><li>현장 답사 동행</li><li>조건 협의 → 계약 → 인수</li></ul>${SITE.phone ? `<p style="margin-top:14px"><a class="btn btn--ink btn--lg" href="tel:${SITE.phoneTel}">${ICONS.phone}${esc(SITE.phone)} 바로 전화</a></p>` : ''}</div>
      <div class="panel" style="margin-top:16px;background:#fff"><h2 class="h3">왜 양도양수인가요?</h2><p style="font-weight:500">신규 오픈은 인테리어·설비·가맹비가 모두 새로 들어가고 매출은 예측값입니다. 양도양수는 운영 중인 매장의 실제 월매출을 확인한 뒤 권리금으로 인수하므로, 처음 창업하는 분일수록 리스크가 낮습니다.</p></div></aside>
    </div></div>` }) });
  out.push({ path: '/inquiry/done/', noindex: true, html: layout({ title: '접수 완료 — 창업가이드', desc: '의뢰가 접수되었습니다.', path: '/inquiry/done/', noindex: true,
    body: `<div class="wrap" style="padding:60px 0;text-align:center"><div style="width:140px;margin:0 auto 16px">${ILLO.coins}</div><h1 class="h1">접수되었습니다</h1><p style="font-weight:700;margin:12px 0 24px">담당 창업전문가가 확인 후 순서대로 연락드립니다. 급하시면 ${esc(SITE.phone)}로 바로 전화 주세요.</p><div class="chips" style="justify-content:center"><a class="btn btn--red btn--lg" href="${u('/listings/')}">매장 둘러보기</a><a class="btn btn--white btn--lg" href="${u('/')}">홈으로</a></div></div>` }) });

  out.push({ path: '/sell/', priority: 0.8, html: layout({ title: '양도양수 의뢰 | 내 매장 양도, 권리금 평가부터 매장 등록·광고까지 — 창업가이드', desc: '운영 중인 매장을 양도하려면 창업가이드에 의뢰하세요. 담당자가 매장을 방문해 매출·시설을 확인하고 권리금 수준을 함께 정한 뒤, 사이트·제휴 채널에 매장을 등록합니다. 영업 보안 유지.', path: '/sell/', active: 'sell',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '양도양수 의뢰', href: '/sell/' }])}<div class="form-page">
      <div class="panel"><p class="eyebrow">양도양수 의뢰</p><h1 class="h2">내 매장을 양도하려고 합니다</h1><p style="font-weight:700;margin:8px 0 18px">손님·직원·건물주에게 알려지지 않도록 보안을 유지하며 진행합니다. 사이트에는 시·구 단위까지만 표시됩니다.</p>${inquiryForm('sell')}</div>
      <aside><div class="panel" style="position:relative">${starburst('보안 유지', 'blue', 8)}<h2 class="h3">양도 진행 순서</h2><ul><li>접수 후 담당자 배정·방문 일정 조율</li><li>매출 자료·시설 확인, 권리금 수준 협의</li><li>매장 등록 (사진·숫자 공개 범위 협의)</li><li>예비 창업자 상담·현장 답사 (담당자 동행)</li><li>조건 협의 → 계약 → 인수인계</li></ul>${SITE.phone ? `<p style="margin-top:14px"><a class="btn btn--ink btn--lg" href="tel:${SITE.phoneTel}">${ICONS.phone}${esc(SITE.phone)} 바로 전화</a></p>` : ''}</div>
      <div class="panel" style="margin-top:16px;background:#fff"><h2 class="h3">양도 시 준비하면 좋은 자료</h2><ul style="padding-left:18px;list-style:disc;font-weight:700;line-height:1.8"><li>최근 6개월 매출 자료 (POS·카드매출)</li><li>임대차 계약서 (보증금·월세·잔여기간)</li><li>월 고정비 내역 (인건비·관리비 등)</li><li>시설·집기 목록, 매장 사진</li></ul></div></aside>
    </div></div>` }) });

  // ---- 회사 소개 ----
  out.push({ path: '/about/', priority: 0.6, html: layout({ title: '회사 소개 | 창업가이드 — 2014년부터 양도양수 창업 컨설팅, 서울 송파구', desc: `창업가이드는 2014년부터 사업체(권리금) 양도양수를 돕는 창업 컨설팅 회사입니다. 대표 ${SITE.ceo}, 사업자등록번호 ${SITE.bizNo}, ${SITE.address}.`, path: '/about/', active: 'about',
    ld: [{ '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': abs('/about/#business'), name: SITE.name, legalName: SITE.company, founder: { '@type': 'Person', name: SITE.ceo }, foundingDate: '2014-04-01', taxID: SITE.bizNo, url: abs('/'), ...(SITE.phone ? { telephone: SITE.phoneTel } : {}), image: abs('/og.png'), address: { '@type': 'PostalAddress', streetAddress: SITE.addressStreet, addressLocality: SITE.addressLocality, addressRegion: '서울특별시', addressCountry: 'KR' }, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' }], priceRange: '상담 무료', parentOrganization: { '@id': abs('/#org') } }],
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '회사 소개', href: '/about/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">ABOUT</p><h1 class="h1">창업가이드는 <span class="hl">양도양수 창업</span>을 전문으로 합니다</h1>
      <div class="about-grid" style="margin-top:24px">
        <div class="panel"><h2 class="h3">회사 개요</h2><ul><li>상호: ${esc(SITE.company)}</li><li>대표: ${esc(SITE.ceo)}</li><li>사업자등록번호: ${esc(SITE.bizNo)}</li><li>업태/종목: ${esc(SITE.bizType)}</li><li>개업: ${esc(SITE.since)}년</li><li>주소: ${esc(SITE.address)}</li>${SITE.phone ? `<li>창업상담: <a href="tel:${SITE.phoneTel}"><b>${esc(SITE.phone)}</b></a></li>` : `<li>상담 문의: <a href="${u('/inquiry/')}"><b>온라인 창업 의뢰</b></a></li>`}</ul>
          <h2 class="h3" style="margin-top:20px">하는 일</h2><p style="font-weight:500">운영 중인 사업체를 권리금으로 양도·양수하는 창업을 돕습니다. 매장 등록과 검증(매출 자료·시설 확인), 예비 창업자 상담과 현장 답사 동행, 조건 협의와 계약 진행, 프랜차이즈 본사 승인 절차까지 담당 창업전문가가 함께합니다. 일반 부동산 중개대상물은 취급하지 않습니다.</p></div>
        <div><div class="map-box"><iframe title="창업가이드 위치" src="https://maps.google.com/maps?q=${encodeURIComponent('서울 송파구 위례송파로 123 포레나송파')}&z=16&output=embed&hl=ko" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <div class="panel" style="margin-top:16px"><h2 class="h3">방문 상담 안내</h2><ul><li>주소: ${esc(SITE.address)}</li><li>방문 상담은 사전 예약제로 운영합니다. 전화나 온라인 문의로 일정을 먼저 정해 주세요.</li><li>관심 매장을 알려주시면 매출 자료와 현장 답사 일정을 함께 준비해 드립니다.</li></ul></div></div>
      </div>
      <div class="stats" style="margin-top:30px"><div class="stat"><strong>${ctx.stats.total}건</strong><span>등록 매장</span></div><div class="stat"><strong>${ctx.stats.brands}개</strong><span>프랜차이즈 브랜드</span></div>${ctx.stats.agents ? `<div class="stat"><strong>${ctx.stats.agents}명</strong><span>담당 창업전문가</span></div>` : `<div class="stat"><strong>2014년</strong><span>개업 · 양도양수 컨설팅</span></div>`}<div class="stat"><strong>24시간</strong><span>창업상담</span></div></div>
      <div class="ftr__notice" style="background:#fff;color:var(--ink);margin-top:30px;border-color:var(--ink)"><h4 style="color:var(--red)">창업가이드에서 알려드립니다</h4>${SITE.legalNotice.map(p => `<p style="color:var(--ink-2)">${esc(p)}</p>`).join('')}</div>
    </section></div>${ctaBand()}` }) });

  // ---- FAQ ----
  const faqMore = [...FAQ,
    { q: '권리금 회수 기간은 어떻게 계산하나요?', a: '단순 계산은 권리금 ÷ 월수익(세전)입니다. 예를 들어 권리금 1억 2천만원, 월수익 900만원이면 약 13.3개월입니다. 실제로는 세금·점주 인건비·시설 보수비를 반영해 보수적으로 잡는 것이 안전합니다.' },
    { q: '매장 검색은 어떻게 하나요?', a: '검색창에 "인천 메가커피"처럼 지역과 브랜드를 함께 입력하면 두 조건을 모두 만족하는 매장만 보여줍니다. "강남 카페 1억 이하"처럼 예산도 함께 쓸 수 있고, 검색 페이지의 지역·브랜드·예산·업종·테마 필터로도 좁힐 수 있습니다.' },
    { q: '사이트의 매장 정보는 얼마나 자주 갱신되나요?', a: '담당 창업전문가가 매장을 직접 등록·수정하며, 계약이 진행 중이거나 양도가 완료된 매장은 바로 비공개 처리됩니다. 창업 인사이트 글은 매일 3편씩 발행됩니다.' },
  ];
  out.push({ path: '/faq/', priority: 0.7, html: layout({ title: '자주 묻는 질문 | 양도양수 창업 비용·권리금·절차 Q&A — 창업가이드', desc: '양도양수 창업에서 가장 많이 묻는 질문. 권리금과 보증금의 차이, 월수익 계산 기준, 위치가 표시되지 않는 이유, 상담 방법, 프랜차이즈 승인 절차.', path: '/faq/', active: 'faq',
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '자주 묻는 질문', href: '/faq/' }])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">FAQ</p><h1 class="h1">자주 묻는 질문</h1><div style="max-width:860px;margin-top:20px">${faqBlock(faqMore, { title: '양도양수 창업 Q&A' })}</div></section></div>${ctaBand()}` }) });

  // ---- 개인정보처리방침 / 이용약관 ----
  const legal = (title, path, html) => ({ path, priority: 0.2, changefreq: 'yearly', html: layout({ title: `${title} — 창업가이드`, desc: `창업가이드 ${title}`, path, body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: title, href: path }])}<article class="article"><div class="article__head"><h1>${title}</h1></div><div class="prose">${html}</div></article></div>` }) });
  out.push(legal('개인정보처리방침', '/privacy/', `
    <p>${esc(SITE.company)}(이하 "회사")는 창업가이드 홈페이지를 통해 수집하는 개인정보를 「개인정보 보호법」에 따라 다음과 같이 처리합니다.</p>
    <h3>1. 수집 항목과 목적</h3><ul><li>창업 의뢰·양도 의뢰·문자 상담 신청: 이름, 휴대폰 번호, 희망 조건(지역·브랜드·예산 등), 남긴 말씀 — 상담 연결과 매장 안내 목적</li><li>담당자 전화 연결 시: 열람한 매장 번호와 접속 시각(단말 정보 포함) — 담당자에게 상담 맥락을 전달하기 위한 목적. 고객의 전화번호는 수집하지 않으며, 통화는 고객 단말에서 직접 발신됩니다.</li><li>홈페이지 이용 기록(접속 로그, 쿠키): 서비스 개선 목적</li></ul>
    <h3>2. 보유 기간</h3><p>상담 신청 정보는 접수일로부터 1년간 보관 후 파기합니다. 계약이 진행된 경우 관련 법령에 따른 기간 동안 보관합니다.</p>
    <h3>3. 제3자 제공</h3><p>상담 연결을 위해 해당 매장의 담당 창업전문가(회사 소속)에게 전달되며, 그 외 제3자에게 제공하지 않습니다. 법령에 따른 요청이 있는 경우는 예외입니다.</p>
    <h3>4. 처리 위탁</h3><p>문자 발송·홈페이지 호스팅을 위해 외부 사업자에게 처리를 위탁할 수 있으며, 위탁 시 수탁자와 업무 내용을 이 페이지에 공개합니다.</p>
    <h3>5. 정보주체의 권리</h3><p>이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 요청: ${SITE.phone ? `창업상담 ${esc(SITE.phone)} 또는 ` : ''}온라인 문의</p>
    <h3>6. 개인정보 보호책임자</h3><p>${esc(SITE.ceo)} (대표) · ${esc(SITE.company)}${SITE.phone ? ` 창업상담 ${esc(SITE.phone)}` : ' (온라인 문의로 접수)'}</p>
    <h3>7. 고지</h3><p>이 방침은 ${ctx.today}부터 적용됩니다. 변경 시 홈페이지에 공지합니다.</p>`));
  out.push(legal('이용약관', '/terms/', `
    <h3>제1조 (목적)</h3><p>이 약관은 ${esc(SITE.company)}(이하 "회사")가 운영하는 창업가이드 홈페이지(이하 "사이트")의 이용 조건과 절차, 회사와 이용자의 권리·의무를 정합니다.</p>
    <h3>제2조 (서비스의 성격)</h3><p>회사는 사업체(권리금) 양도양수 정보를 게재하고 상담을 연결하는 서비스를 제공합니다. 회사는 「공인중개사법」상 중개대상물을 취급하지 않으며, 사이트에 게재된 사업체는 중개대상물이 아닙니다.</p>
    <h3>제3조 (정보의 정확성)</h3><p>사이트의 매장 정보는 양도인·프랜차이즈·제휴업체가 제공하거나 회사가 수집한 자료를 기준으로 작성됩니다. 회사는 정보의 정확성·안정성을 보장하지 않으며, 이용자는 계약 전 현장 확인과 자료 검증을 거쳐야 합니다. 월매출·월수익은 세전 기준이며 점주 인건비를 포함하지 않습니다.</p>
    <h3>제4조 (이용자의 의무)</h3><p>이용자는 사이트의 매장 정보를 양도인의 영업 보안을 해치는 방식으로 이용하거나, 허위 정보를 입력해 상담을 신청해서는 안 됩니다.</p>
    <h3>제5조 (면책)</h3><p>회사는 사이트 정보를 이용한 거래와 그에 따른 법적 문제에 대하여 책임을 지지 않습니다. 단, 회사의 고의 또는 중대한 과실로 인한 손해는 예외입니다.</p>
    <h3>제6조 (저작권)</h3><p>사이트의 글·사진·디자인에 대한 권리는 회사 또는 정당한 권리자에게 있으며, 무단 복제·전재를 금합니다.</p>
    <h3>제7조 (분쟁)</h3><p>이 약관은 대한민국 법을 따르며, 분쟁은 회사 본점 소재지를 관할하는 법원에서 해결합니다.</p>
    <p class="muted">시행일: ${ctx.today}</p>`));

  // ---- 404 ----
  out.push({ path: '/404.html', noindex: true, html: layout({ title: '페이지를 찾을 수 없습니다 — 창업가이드', desc: '요청하신 페이지가 없습니다.', path: '/404.html', noindex: true,
    body: `<div class="wrap" style="padding:60px 0;text-align:center"><div style="width:140px;margin:0 auto 16px">${ILLO.shop}</div><h1 class="h1">페이지를 찾을 수 없습니다</h1><p style="font-weight:700;margin:12px 0 24px">매장이 양도 완료되었거나 주소가 바뀌었을 수 있습니다. 검색으로 비슷한 매장을 찾아보세요.</p><form class="hdr__search" style="max-width:480px;margin:0 auto 20px;display:flex" action="${u('/listings/')}"><input type="search" name="q" placeholder="예) 인천 메가커피"><button type="submit" aria-label="검색">${ICONS.search}</button></form><div class="chips" style="justify-content:center"><a class="btn btn--red btn--lg" href="${u('/listings/')}">매장 검색</a><a class="btn btn--white btn--lg" href="${u('/')}">홈으로</a></div></div>` }) });
  return out;
}
