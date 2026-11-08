// 담당 창업전문가 프로필 — 매물 데이터로 전문 분야·담당 지역·실적을 계산하고 소개문을 정돈합니다.
import { esc, u, ICONS, img, imgPath } from './html.mjs';
import { fmtMan, fmtWon, phoneTel } from './text.mjs';

const top = (arr, key, n = 3) => Object.entries(arr.reduce((m, l) => { const k = key(l); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));

// 소개문 정돈: 장식 기호·이모지·연락처 반복·과장 수식 제거, 문단 정리
export function cleanIntro(text) {
  let s = String(text || '');
  s = s.replace(/[〓=＝\-–—_*#★☆♥♡◆◇■□●○▶▷◀◁※☎✔✓]{3,}/g, '\n');
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
  s = s.replace(/^\s*(H\.?P|휴\s*대\s*폰|전화번호|E-?mail|이메일|카카오톡|카톡|블로그|홈페이지|상담문의)\s*[:：].*$/gim, '');
  s = s.replace(/^\s*-\s*(성\s*명|직\s*책|전화번호|휴\s*대\s*폰|카카오톡|e\s*-\s*mail)\s*[:：].*$/gim, '');
  s = s.replace(/01[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
  s = s.replace(/\b(최고의|무조건|100%|절대|대박|초대박)\b\s*/g, '');
  s = s.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // 너무 짧거나 비어 있으면 없음 처리
  return s.length < 20 ? '' : s;
}

export function agentProfile(a, ctx) {
  const items = (ctx.byAgent && ctx.byAgent[a.id]) || [];
  const brands = top(items, l => l.brand);
  const kinds = top(items, l => l.kind2 ? l.kind2.split('/')[0] : l.kind1);
  const short = g => { const x = g.replace(/(구|시|군)$/, ''); return x.length >= 2 ? x : g; };
  const regions = top(items.filter(l => l.gugun), l => short(l.gugun), 4);
  const sidos = top(items, l => l.sido, 3);
  const withProfit = items.filter(l => l.profit);
  const avgProfit = withProfit.length ? Math.round(withProfit.reduce((s, l) => s + l.profit, 0) / withProfit.length) : 0;
  const minPrem = items.filter(l => l.premium).length ? Math.min(...items.filter(l => l.premium).map(l => l.premium)) : 0;
  const career = (a.intro || '').match(/(\d{1,2})\s*년\s*차/);
  const specialties = [...new Set([...brands.slice(0, 2).map(b => b.k), ...kinds.slice(0, 2).map(k => k.k)])].slice(0, 4);
  const summary = [
    specialties.length ? `${specialties.join('·')} 중심으로 ${items.length}건의 양도양수 매물을 담당합니다.` : `양도양수 매물 ${items.length}건을 담당합니다.`,
    regions.length ? `주요 담당 지역은 ${regions.map(r => r.k).join('·')}이며, ${sidos.map(s => s.k).join('·')} 전역 상권을 다룹니다.` : '',
    avgProfit ? `담당 매물의 평균 월수익(세전)은 ${fmtMan(avgProfit)}${minPrem ? `, 권리금은 ${fmtWon(minPrem)}부터` : ''}입니다.` : '',
    '매출 자료 확인, 현장 답사 동행, 조건 협의와 계약, 프랜차이즈 본사 승인 절차까지 직접 진행합니다.',
  ].filter(Boolean).join(' ');
  return { items, brands, kinds, regions, sidos, avgProfit, minPrem, career: career ? `${career[1]}년 차` : '', specialties, summary, intro: cleanIntro(a.intro) };
}

export function agentCard(a, ctx, { compact = false } = {}) {
  const p = agentProfile(a, ctx);
  return `<div class="agent-card">
    <div class="agent-card__pic">${img(imgPath(a.photo), `${a.name} 창업전문가`, { w: 84, h: 84 })}</div>
    <h3><a href="${u(`/agents/${a.id}/`)}">${esc(a.name)}</a><small>${esc(a.role || '창업전문가')}${p.career ? ` · ${esc(p.career)}` : ''}</small></h3>
    <p class="spec-line"><b>전문 분야</b> ${p.specialties.length ? esc(p.specialties.join(' · ')) : '양도양수 전반'}</p>
    <p class="spec-line"><b>담당 지역</b> ${p.regions.length ? esc(p.regions.map(r => r.k).join(' · ')) : esc(p.sidos.map(s => s.k).join(' · ') || '서울·경기·인천')}</p>
    <p>담당 매물 ${p.items.length}건${p.avgProfit ? ` · 평균 월수익 ${esc(fmtMan(p.avgProfit))}` : ''}</p>
    ${compact ? '' : `<div class="btns"><a class="btn btn--call btn--sm" href="tel:${esc(phoneTel(a.mobile))}" data-call="" data-agent="${esc(a.id)}" data-phone="${esc(a.mobile)}">${ICONS.phone}${esc(a.mobile)}</a><button class="btn btn--sm" type="button" data-sms="" data-agent="${esc(a.id)}" data-agent-name="${esc(a.name)}">${ICONS.sms}문자</button></div>`}
  </div>`;
}
