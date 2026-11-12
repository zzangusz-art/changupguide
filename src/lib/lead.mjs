// 조건형 리드 수집 폼: 금액 → 업종 → 상권·지역 → 운영 방식 → 연락처 (기존 /api/inquiries 로 접수)
import { SITE, CATEGORIES, BUDGETS } from '../data.mjs';
import { esc, u, ICONS } from './html.mjs';

const AREAS = ['역세권', '1군상권', '대학가', '오피스가', '주택가', '몰·마트', '병원', '신도시', '상관없음'];
const STYLES = ['직접 운영', '오토·투잡', '1인 운영', '가족 운영', '배달 위주'];
const TIMING = ['바로 시작', '3개월 안에', '6개월 안에', '알아보는 중'];

const opt = (n, v, on, attrs = '') => `<button type="button" class="lead__opt ${on ? 'is-on' : ''}" data-n="${n}" data-v="${esc(v)}" aria-pressed="${on ? 'true' : 'false'}" ${attrs}>${esc(v)}</button>`;

export function leadForm({ preset = {}, title = '조건만 남기면 담당자가 매장을 찾아드립니다', sub = '금액·업종·상권을 고르면 지금 조건에 맞는 매장 수가 바로 나옵니다. 사이트에 올리지 않은 매장도 함께 찾아 드립니다.', bare = false } = {}) {
  const P = preset;
  const budgetOpts = BUDGETS.map(b => opt('budget', b.name.replace(' 이상 ~ ', '~').replace('억 미만', '억 미만'), P.budget === b.slug, `data-min="${b.min}" data-max="${b.max === Infinity ? 1e12 : b.max}"`)).join('') + opt('budget', '정하지 못했어요', false);
  const catOpts = CATEGORIES.map(c => opt('category', c.name, P.category === c.name)).join('') + opt('category', '추천받고 싶어요', false);
  const steps = [
    ['금액별', '권리금 예산은 어느 정도인가요?', '임대보증금을 뺀 권리금 기준입니다.', `<div class="lead__opts">${budgetOpts}</div>`],
    ['업종별', '어떤 업종을 찾으세요?', '', `<div class="lead__opts">${catOpts}</div>`],
    ['상권별', '원하는 상권과 지역을 골라 주세요', '여러 개 선택할 수 있습니다.', `<div class="lead__opts" data-multi>${AREAS.map(a => opt('area', a, false)).join('')}</div>
      <div class="lead__row"><label>지역<select name="sido" data-lead-sido>${['', '서울', '경기', '인천', '기타'].map(s => `<option value="${s}" ${P.sido === s ? 'selected' : ''}>${s || '지역 선택'}</option>`).join('')}</select></label><label>구·시 (선택)<input name="gugun" placeholder="예) 강남구, 수원시" value="${esc(P.gugun || '')}" autocomplete="off"></label></div>`],
    ['운영 방식', '어떻게 운영하실 계획인가요?', '여러 개 선택할 수 있습니다.', `<div class="lead__opts" data-multi>${STYLES.map(s => opt('style', s, P.style === s)).join('')}</div><p class="lead__sub2">창업 희망 시기</p><div class="lead__opts">${TIMING.map(t => opt('timing', t, false)).join('')}</div>`],
    ['연락처', '담당 창업전문가가 연락드릴 번호를 남겨 주세요', '상담은 무료이고, 조건에 맞는 매장을 추려서 안내합니다.', `<div class="lead__row"><label>이름<input name="name" required autocomplete="name" placeholder="홍길동"></label><label>휴대폰<input name="phone" required type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000"></label></div>
      <label class="lead__full">희망 브랜드 (선택)<input name="brandWish" placeholder="예) 메가커피, 교촌치킨" value="${esc(P.brand || '')}" autocomplete="off"></label>
      <label class="check lead__agree"><input type="checkbox" name="agree" required> <span>개인정보 수집·이용에 동의합니다. (상담 목적, 1년 보관) <a href="${u('/privacy/')}" target="_blank" rel="noopener">보기</a></span></label>`],
  ];
  const live = `<div class="lead__live" data-lead-live aria-live="polite"><span>지금 조건에 맞는 매장</span><strong><b data-lead-count>-</b><small>건</small></strong></div>`;
  const shell = `<section class="lead" id="lead" aria-label="창업 조건 상담 신청"><div class="lead__copy"><span class="eyebrow">무료 매장 찾기</span><h2 class="h2">${esc(title)}</h2><p>${esc(sub)}</p>
      ${live}
      <ul class="lead__points"><li>${ICONS.check}담당자가 조건에 맞는 매장을 추려서 제안</li><li>${ICONS.check}월매출·임대 조건 자료를 상담 때 확인</li>${SITE.phone ? `<li>${ICONS.check}급하시면 <a href="tel:${SITE.phoneTel}"><b>${esc(SITE.phone)}</b></a></li>` : `<li>${ICONS.check}접수 후 담당자가 순서대로 연락</li>`}</ul></div>
    <form class="lead__form form" data-form="buy" data-lead novalidate-off>
      <input type="hidden" name="message" value="">${['budget', 'category', 'area', 'style', 'timing'].map(n => `<input type="hidden" name="${n}" value="">`).join('')}
      <div class="lead__head"><span class="lead__stepno"><b data-lead-no>1</b> / ${steps.length}</span><span class="lead__label" data-lead-label>${esc(steps[0][0])}</span></div>
      <div class="lead__bar"><i data-lead-bar></i></div>
      ${steps.map(([label, q, hint, body], i) => `<fieldset class="lead__step" data-step="${i}" data-label="${esc(label)}"><legend>${esc(q)}</legend>${hint ? `<p class="lead__hint">${esc(hint)}</p>` : ''}${body}</fieldset>`).join('')}
      <div class="lead__nav"><button type="button" class="btn btn--white" data-lead-prev>이전</button><button type="button" class="btn btn--ink" data-lead-next>다음</button><button type="submit" class="btn btn--yellow" data-lead-submit>${ICONS.bolt}조건에 맞는 매장 받기</button></div>
    </form></section>`;
  if (!bare) return shell;
  const form = shell.slice(shell.indexOf('<form'), shell.indexOf('</form>') + 7);
  return `<div class="lead lead--bare" id="lead">${live}${form}</div>`;
}
