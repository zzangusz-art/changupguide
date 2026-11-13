import { SITE, CATEGORIES, THEMES } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, sticker, starburst, badge, listingCard, breadcrumb, faqBlock, img, imgPath, jsonld } from '../lib/html.mjs';
import { fmtWon, fmtMan, fmtNum, phoneTel, makeSeoTitle, makeDesc, fmtDate, budgetOf, themeByName } from '../lib/text.mjs';
import { agentProfile } from '../lib/agents.mjs';

const catSlug = code => (CATEGORIES.find(c => c.code === code) || {}).slug;
const SALES_BASIS = { 1: '매출 자료 확인(POS·카드매출 등)', 2: '양도인 진술 기준', 3: '담당자 현장 확인' };

export function listingPage(l, ctx) {
  const agent = ctx.agents.find(a => a.id === l.agentId) || { name: l.agentName, mobile: l.agentPhone, role: l.agentRole || '창업전문가', photo: l.agentPhoto || '', tel: '', kakao: '' };
  const images = (l.images || []).map(p => imgPath(p)); const thumbs = (l.images || []).map(p => imgPath(p, 'thumb'));
  const loc = [l.sido, l.gugun].filter(Boolean).join(' ');
  const theme = themeByName(l.theme);
  const budget = budgetOf(l.premium);
  const rate = l.sales && l.profit ? Math.round(l.profit / l.sales * 1000) / 10 : null;
  const eb = l.expenseBreakdown || {};
  const ebRows = ['재료비', '인건비', '월비용(세전)', '관리비', '기타경비'].filter(k => eb[k]).map(k => ({ k, ...eb[k] }));
  const related = (ctx.byBrand[l.brandSlug] || []).filter(x => x.id !== l.id).slice(0, 4);
  const nearby = (ctx.byGugun[`${l.sido}/${l.gugun}`] || []).filter(x => x.id !== l.id && !related.includes(x)).slice(0, 4);
  const title = makeSeoTitle(l); const desc = makeDesc(l);

  // AEO 직답 요약
  const summaryItems = [
    `지역: ${loc}${l.newTown ? ` (${l.newTown})` : ''} — 정확한 위치는 상담 후 안내`,
    `업종·브랜드: ${l.brand ? l.brand + ' ' : (l.kindLabel ? l.kindLabel + ' ' : '')}${l.kind1}${l.kind2 ? ` (${l.kind2})` : ''}`,
    `예산: 권리금 ${l.premium ? fmtWon(l.premium) : '협의'}${l.monthlyCost ? ` · 월비용(임대료 등) ${fmtMan(l.monthlyCost)}` : ''} — 임대보증금 별도`,
    l.sales ? `매출: 월매출 ${fmtMan(l.sales)}${l.expense ? ` · 월지출 ${fmtMan(l.expense)}` : ''}${l.profit ? ` · 월수익(세전) ${fmtMan(l.profit)}` : ''}` : (l.profit ? `월수익(세전) ${fmtMan(l.profit)}` : '매출·수익: 담당자 문의'),
    l.areaM2 ? `규모: ${l.areaM2}㎡ (약 ${Math.round(l.areaM2 / 3.3058)}평)${l.floor ? ` · ${l.floor}층` : ''}` : (l.sizeRange ? `규모: ${l.sizeRange}` : null),
    `담당: ${agent.name} ${agent.role || '창업전문가'}${agent.mobile ? ` (${agent.mobile})` : ''}`,
  ].filter(Boolean);

  const faq = [
    { q: `${loc} ${l.brand || l.kind2 || l.kind1} 매장의 창업비용 외에 필요한 비용은 무엇인가요?`, a: `표시된 창업비용 ${l.premium ? fmtWon(l.premium) : '(협의)'}은 임대보증금을 제외한 금액입니다. 보증금·월세·관리비, 프랜차이즈 본사 양수 승인 비용(교육비 등)은 담당자 ${agent.name}이 상담 시 세부 내역을 안내합니다.` },
    { q: '이 매장의 정확한 위치와 상호를 알 수 있나요?', a: `양도인이 영업 중인 매장의 보안을 위해 사이트에는 ${loc}까지만 표시합니다. 상담 후 담당자가 정확한 위치를 안내하고 현장 답사에 동행합니다.` },
    { q: '월수익은 어떻게 계산된 금액인가요?', a: `월수익(세전)은 월매출에서 재료비·인건비·월비용·관리비·기타경비를 뺀 금액입니다. 점주 본인의 인건비는 월지출에 포함되지 않으며, 세금 공제 전 금액입니다.${l.salesBasis ? ` 매출 근거: ${SALES_BASIS[l.salesBasis] || '담당자 확인'}.` : ''}` },
    { q: '상담은 어떻게 하나요?', a: agent.mobile ? `페이지의 "담당자 전화 연결" 버튼을 누르면 ${agent.name} 창업전문가(${agent.mobile})에게 바로 연결되고, 어떤 매장을 보셨는지 담당자에게 자동으로 전달됩니다. 문자 상담 신청도 가능합니다.` : '페이지의 "문자 상담 신청"에 연락처를 남기시면 담당 창업전문가가 이 매장 자료를 준비해 연락드립니다.' },
  ];

  const gallery = images.length ? `<div class="gallery">
      <div class="gallery__stickers">${(l.tags || []).slice(0, 3).map((t, i) => sticker(t, { tone: ['yellow', 'red', 'blue'][i % 3], rot: [-6, 5, -3][i % 3] })).join('')}</div>
      <div class="gallery__main">${img(images[0], `${l.title} 매장 사진`, { lazy: false, w: 800, h: 600 })}</div>
      ${images.length > 1 ? `<div class="gallery__thumbs">${thumbs.map((t, i) => `<button type="button" data-full="${esc(/^https?:/.test(images[i]) ? images[i] : u('/' + images[i]))}" aria-label="사진 ${i + 1}">${img(t, '', { w: 92, h: 69 })}</button>`).join('')}</div>` : `<div class="gallery__thumbs"><button type="button" data-full="${esc(/^https?:/.test(images[0]) ? images[0] : u('/' + images[0]))}" aria-current="true" style="width:92px">${img(thumbs[0], '', { w: 92, h: 69 })}</button></div>`}
      <div class="gallery__count">${ICONS.camera}<b>1</b> / ${images.length}</div>
    </div>` : `<div class="gallery"><div class="gallery__main"><div class="img-empty">${ILLO.shop}</div></div></div>`;

  const keynums = `<dl class="keynums">
    <div class="keynum keynum--yellow"><dt>권리금 (보증금 별도)</dt><dd>${l.premium ? esc(fmtWon(l.premium)) : '협의'}</dd></div>
    <div class="keynum"><dt>월매출</dt><dd>${l.sales ? esc(fmtMan(l.sales)) : '<span class="muted">담당자 문의</span>'}</dd></div>
    <div class="keynum keynum--red"><dt>월수익 (세전)</dt><dd>${l.profit ? esc(fmtMan(l.profit)) : '<span class="muted">담당자 문의</span>'}</dd></div>
  </dl>`;
  const spec = `<dl class="spec">
    <div><dt>사업체 위치</dt><dd>${esc(loc)}</dd></div>
    <div><dt>현업종</dt><dd>${esc(l.kind1)}${l.kind2 ? ` (${esc(l.kind2)})` : ''}</dd></div>
    <div><dt>브랜드</dt><dd>${l.brand ? `<a href="${u(`/brand/${l.brandSlug}/`)}">${esc(l.brand)}</a>` : '-'}</dd></div>
    <div><dt>사업체 크기</dt><dd>${l.areaM2 ? `${l.areaM2}㎡ (약 ${Math.round(l.areaM2 / 3.3058)}평)` : esc(l.sizeRange || '-')}${l.floor ? ` · ${esc(l.floor)}층` : ''}</dd></div>
    <div><dt>월비용 (임대료 등)</dt><dd>${l.monthlyCost ? esc(fmtMan(l.monthlyCost)) : '담당자 문의'}</dd></div>
    <div><dt>월지출</dt><dd>${l.expense ? esc(fmtMan(l.expense)) : '-'}</dd></div>
    <div><dt>테마</dt><dd>${theme ? `<a href="${u(`/theme/${theme.slug}/`)}">${esc(theme.name)}</a>` : esc(l.theme || '-')}</dd></div>
    <div><dt>신도시 상권</dt><dd>${esc(l.newTown || '해당 없음')}</dd></div>
    <div><dt>예산 구간</dt><dd>${budget ? `<a href="${u(`/budget/${budget.slug}/`)}">${esc(budget.name)}</a>` : '협의'}</dd></div>
    <div><dt>매장번호</dt><dd>No.${esc(l.id)}</dd></div>
  </dl>`;

  const agentBox = `<div class="agent-box">${starburst(agent.mobile ? '담당자 직통' : '상담 무료', 'red', 10)}
    <div class="agent-box__pic">${img(imgPath(agent.photo), `${agent.name} 창업전문가`, { w: 72, h: 72 })}</div>
    <div><div class="agent-box__name">${esc(agent.name)}<small>${esc(agent.role || '창업전문가')}</small></div><p class="muted" style="margin:0">${(() => { const p = agentProfile(agent, ctx); return agent.id ? `${p.specialties.length ? esc(p.specialties.slice(0, 3).join('·')) + ' 등 전문 · ' : ''}<a href="${u(`/agents/${agent.id}/`)}" style="text-decoration:underline">프로필</a>` : '문자로 남기시면 순서대로 연락드립니다'; })()}</p></div>
    <div class="agent-box__btns">
      ${agent.mobile ? `<a class="btn btn--red btn--lg" href="tel:${esc(phoneTel(agent.mobile))}" data-call="${esc(l.id)}" data-agent="${esc(agent.id || '')}" data-phone="${esc(agent.mobile)}" data-title="${esc(l.title)}">${ICONS.phone}담당자 전화 연결</a>` : `<a class="btn btn--red btn--lg" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰 남기기</a>`}
      <button class="btn btn--yellow btn--lg" type="button" data-sms="${esc(l.id)}" data-agent="${esc(agent.id || '')}" data-title="${esc(l.title)}">${ICONS.sms}문자 상담 신청</button>
    </div>
  </div>`;

  const salesSec = (l.sales || l.profit || ebRows.length) ? `<section class="d-sec"><h2 class="h2">매출 내역과 월지출 구조</h2><div class="sales">
    <div class="sales__box"><h3>매출 내역</h3><div class="sales__rows">
      <div><span>월매출</span><strong>${l.sales ? esc(fmtMan(l.sales)) : '문의'}</strong></div>
      <div><span>월지출</span><strong>${l.expense ? esc(fmtMan(l.expense)) : '문의'}</strong></div>
      <div class="hot"><span>월수익 (세전)</span><strong>${l.profit ? esc(fmtMan(l.profit)) : '문의'}</strong></div>
      ${rate != null ? `<div><span>수익률</span><strong>${rate}%</strong></div>` : ''}
      <div><span>매출 근거</span><strong style="font-size:.9rem">${esc(SALES_BASIS[l.salesBasis] || '담당자 확인')}</strong></div>
    </div></div>
    <div class="sales__box"><h3>월지출 세부 내역</h3>${ebRows.length ? `<div class="bars">${ebRows.map(r => `<div class="bar"><span>${esc(r.k)}</span><div class="bar__track"><div class="bar__fill" data-w="${Math.min(100, r.pct)}"></div></div><span class="bar__pct">${r.amount != null ? esc(fmtNum(r.amount)) + '만 · ' : ''}${r.pct}%</span></div>`).join('')}</div>` : '<p class="muted">세부 내역은 담당자에게 문의해 주세요.</p>'}</div>
  </div></section>` : '';

  const descHtml = l.description ? l.description.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') : '';
  const detailSec = `<section class="d-sec"><h2 class="h2">이 매장 핵심 정리</h2>
    <div class="summary-box"><h2>${esc(l.title)}</h2><ul>${summaryItems.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div class="prose">
      <p class="lead">${esc(loc)}에서 운영 중인 ${esc(l.brand || l.kind2 || l.kind1)} 매장을 권리금 ${l.premium ? esc(fmtWon(l.premium)) : '협의'}에 인수하는 양도양수 창업 매장입니다.${l.sales ? ` 현재 월매출 ${esc(fmtMan(l.sales))}${l.profit ? `, 세전 월수익 ${esc(fmtMan(l.profit))}` : ''} 규모로 운영되고 있습니다.` : ''}</p>
      ${l.summary ? `<h3>담당자 한줄 요약</h3><p>${esc(l.summary)}</p>` : ''}
      <h3>이런 분께 맞습니다</h3><ul>
        ${theme ? `<li>${esc(theme.name)} 테마 매장 — ${esc(theme.desc.split('.')[0])}.</li>` : ''}
        ${l.tags.includes('풀오토') || l.tags.includes('오토운영') ? '<li>매장 상주가 어려운 투자형·부업형 창업자 (오토 운영 구조)</li>' : ''}
        ${l.brand ? `<li>${esc(l.brand)} 가맹점을 신규 오픈 비용 없이 운영 중인 매장으로 시작하려는 분</li>` : `<li>${esc(l.kind2 || l.kind1)} 업종 경험이 있거나, 담당자 교육으로 시작하려는 분</li>`}
        ${budget ? `<li>권리금 예산 ${esc(budget.name)} 범위에서 ${esc(loc)} 상권을 찾는 분</li>` : ''}
      </ul>
      <h3>확인해야 할 사항</h3><ul>
        <li>임대 조건(보증금·월세·계약 잔여기간)과 건물주 승인 여부</li>
        <li>최근 3~6개월 매출 자료와 성수기·비수기 편차</li>
        ${l.brand ? '<li>프랜차이즈 본사의 양수인 승인 절차와 교육·인테리어 리뉴얼 요구 여부</li>' : '<li>시설·집기 상태와 양도 범위(포함 품목)</li>'}
        <li>직원 승계 여부와 인건비 구조 (점주 인건비는 월지출 미포함)</li>
      </ul>
      ${descHtml ? `<h3>담당 전문가의 안내</h3>${descHtml}` : ''}
    </div></section>`;

  const relatedSec = (related.length || nearby.length) ? `<section class="related">${related.length ? `<div class="sec__head"><h2 class="h2">${esc(l.brand)} 다른 매장</h2><a class="more" href="${u(`/brand/${l.brandSlug}/`)}">전체 ${ICONS.arrow}</a></div><div class="grid grid--4">${related.map(x => listingCard(x)).join('')}</div>` : ''}${nearby.length ? `<div class="sec__head" style="margin-top:30px"><h2 class="h2">${esc(loc)} 주변 매장</h2><a class="more" href="${u(`/region/${encodeURIComponent(l.sido)}/${encodeURIComponent(l.gugun)}/`)}">전체 ${ICONS.arrow}</a></div><div class="grid grid--4">${nearby.map(x => listingCard(x)).join('')}</div>` : ''}</section>` : '';

  const body = `<div class="wrap detail">
    ${breadcrumb([{ name: '홈', href: '/' }, { name: '매장 검색', href: '/listings/' }, ...(l.sido ? [{ name: l.sido, href: `/region/${encodeURIComponent(l.sido)}/` }] : []), ...(l.gugun ? [{ name: l.gugun, href: `/region/${encodeURIComponent(l.sido)}/${encodeURIComponent(l.gugun)}/` }] : []), { name: `No.${l.id}`, href: `/listing/${l.id}/` }])}
    <div class="detail__head">
      <div>${gallery}</div>
      <div>
        <div class="d-meta">${badge(`No.${l.id}`, 'ink')}${l.brand ? badge(l.brand, 'yellow') : ''}${badge(l.kind2 || l.kind1, 'cream')}${theme ? badge(theme.name, 'blue') : ''}${budget ? badge(budget.name, 'red') : ''}</div>
        ${l.sample ? '<p class="sample-note"><b>예시 매장</b> 화면 구성을 보여드리기 위한 샘플입니다. 실제 매장이 아닙니다.</p>' : ''}
        <h1 class="d-title">${esc(l.title)}</h1>
        ${l.summary ? `<p class="d-raw">${esc(l.summary)}</p>` : ''}
        ${keynums}${spec}${agentBox}
        <p class="muted" style="font-size:.8rem;margin-top:8px">등록 ${esc(fmtDate(l.createdAt))} · 갱신 ${esc(fmtDate(l.updatedAt))} · <button type="button" class="chip" data-share style="padding:2px 8px;font-size:.78rem">${ICONS.share}공유</button></p>
      </div>
    </div>
    ${detailSec}${salesSec}
    <section class="d-sec">${faqBlock(faq, { title: '이 매장에 대해 자주 묻는 질문' })}</section>
    ${relatedSec}
    <section class="sec sec--tight"><p class="eyebrow">최근 본 매장</p><div class="chips" data-recent></div></section>
  </div>
  <div class="sticky-bar glass">${agent.mobile ? `<a class="btn btn--red" href="tel:${esc(phoneTel(agent.mobile))}" data-call="${esc(l.id)}" data-agent="${esc(agent.id || '')}" data-phone="${esc(agent.mobile)}" data-title="${esc(l.title)}">${ICONS.phone}담당자 통화</a>` : `<a class="btn btn--red" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰</a>`}<button class="btn btn--yellow" type="button" data-sms="${esc(l.id)}" data-agent="${esc(agent.id || '')}" data-title="${esc(l.title)}">${ICONS.sms}문자 상담</button></div>`;

  const ld = [{
    '@context': 'https://schema.org', '@type': 'Product', '@id': abs(`/listing/${l.id}/#product`), name: l.title, sku: l.id, description: desc,
    image: images.map(i => (/^https?:/.test(i) ? i : abs('/' + i))), category: `${l.kind1}${l.kind2 ? ' > ' + l.kind2 : ''}`,
    brand: l.brand ? { '@type': 'Brand', name: l.brand } : undefined,
    offers: { '@type': 'Offer', url: abs(`/listing/${l.id}/`), priceCurrency: 'KRW', price: l.premium ? l.premium * 10000 : undefined, priceSpecification: l.premium ? { '@type': 'PriceSpecification', price: l.premium * 10000, priceCurrency: 'KRW', description: '권리금 (임대보증금 별도)' } : undefined, availability: 'https://schema.org/InStock', seller: { '@id': abs('/#org') }, areaServed: loc },
    additionalProperty: [
      l.sales ? { '@type': 'PropertyValue', name: '월매출', value: l.sales * 10000, unitText: 'KRW' } : null,
      l.profit ? { '@type': 'PropertyValue', name: '월수익(세전)', value: l.profit * 10000, unitText: 'KRW' } : null,
      l.monthlyCost ? { '@type': 'PropertyValue', name: '월비용', value: l.monthlyCost * 10000, unitText: 'KRW' } : null,
      l.areaM2 ? { '@type': 'PropertyValue', name: '면적', value: l.areaM2, unitCode: 'MTK' } : null,
      { '@type': 'PropertyValue', name: '지역', value: loc }, { '@type': 'PropertyValue', name: '담당자', value: `${agent.name} ${agent.role || '창업전문가'}` },
    ].filter(Boolean),
  }];
  return layout({ title, desc, path: `/listing/${l.id}/`, noindex: !!l.sample, canonicalPath: l.canonicalId ? `/listing/${l.canonicalId}/` : undefined, body, active: 'listings', ld, type: 'product', og: images[0] ? (/^https?:/.test(images[0]) ? images[0] : abs('/' + images[0])) : undefined, bodyClass: 'is-listing', keywords: [loc, l.brand, l.kind2, `${l.gugun} ${l.brand || l.kind2} 창업`, '양도양수', '권리금'].filter(Boolean),
    extraHead: `<meta name="listing-id" content="${esc(l.id)}">` }).replace('<body class="is-listing">', `<body class="is-listing" data-listing-id="${esc(l.id)}" data-listing-title="${esc(l.title)}" data-listing-img="${esc(thumbs[0] ? (/^https?:/.test(thumbs[0]) ? thumbs[0] : u('/' + thumbs[0])) : '')}">`);
}
