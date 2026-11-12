// 성향별 추천 기준과 테마 상세 문구. 모든 기준은 등록 매장의 숫자·태그로만 계산한다.
import { paybackMonths } from './text.mjs';

export const photoFirst = arr => { const a = arr.filter(l => !l.noPhoto); return a.length === arr.length ? arr : [...a, ...arr.filter(l => l.noPhoto)]; };

const hasTag = (l, ...t) => (l.tags || []).some(x => t.includes(x));
const margin = l => (l.sales > 0 && l.profit > 0 ? l.profit / l.sales : 0);
const byProfit = (a, b) => (b.profit || 0) - (a.profit || 0);

export const PICKS = [
  { slug: 'fast-payback', name: '빠른 회수형', hook: '권리금을 1년 안에 회수하는 계산', desc: '권리금 부담이 월수익에 비해 작은 매장입니다. 투자금 회수를 가장 먼저 보는 분께 맞습니다.', rule: '권리금 ÷ 월수익(세전)이 12개월 이하, 권리금 1천만원 이상', fn: l => { const m = paybackMonths(l); return m != null && m <= 12 && l.premium >= 1000; }, sort: (a, b) => paybackMonths(a) - paybackMonths(b) },
  { slug: 'small-high', name: '소액 고수익형', hook: '권리금 1억 미만, 월수익 1,000만원 이상', desc: '적은 권리금으로 시작하면서 수익 규모는 놓치고 싶지 않은 분께 맞습니다.', rule: '권리금 1억원 미만이면서 월수익(세전) 1,000만원 이상', fn: l => l.premium > 0 && l.premium < 10000 && l.profit >= 1000, sort: byProfit },
  { slug: 'auto', name: '오토·투잡형', hook: '매장에 상주하지 않아도 되는 운영 구조', desc: '직장을 유지하거나 여러 매장을 함께 보려는 분께 맞습니다. 직원 인건비 반영 여부를 함께 확인하세요.', rule: '담당자가 풀오토·오토운영·투잡 가능으로 표시한 매장', fn: l => hasTag(l, '풀오토', '오토운영', '투잡'), sort: byProfit },
  { slug: 'brand-stable', name: '브랜드 안정형', hook: '이름값 있는 브랜드, 월매출 3천만원 이상', desc: '본사 매뉴얼과 브랜드 인지도 위에서 안정적으로 운영하고 싶은 분께 맞습니다.', rule: '프랜차이즈 브랜드 매장 중 월매출 3,000만원 이상', fn: l => l.brand && l.sales >= 3000, sort: (a, b) => (b.sales || 0) - (a.sales || 0) },
  { slug: 'high-margin', name: '고마진형', hook: '매출의 30% 이상이 수익으로 남는 매장', desc: '매출 규모보다 남는 비율을 중요하게 보는 분께 맞습니다.', rule: '월매출 2,000만원 이상이면서 월수익 ÷ 월매출 30% 이상', fn: l => l.sales >= 2000 && margin(l) >= 0.3, sort: (a, b) => margin(b) - margin(a) },
  { slug: 'top-profit', name: '고수익 집중형', hook: '월수익 2,000만원을 넘는 매장', desc: '투자금이 충분하고 수익 절대액을 우선하는 분께 맞습니다.', rule: '월수익(세전) 2,000만원 이상', fn: l => l.profit >= 2000, sort: byProfit },
  { slug: 'big-sales', name: '대형 매출형', hook: '월매출 1억원이 검증된 대형 매장', desc: '규모 있는 매장을 직원 조직과 함께 운영하려는 분께 맞습니다.', rule: '월매출 1억원 이상', fn: l => l.sales >= 10000, sort: (a, b) => (b.sales || 0) - (a.sales || 0) },
  { slug: 'first-timer', name: '첫 창업 안심형', hook: '처음이어도 운영할 수 있고, 월수익 500만원 이상', desc: '창업 경험이 없어도 운영 부담이 적은 매장 중 수익이 확인된 곳입니다.', rule: '담당자가 초보 추천으로 표시한 매장 중 월수익(세전) 500만원 이상', fn: l => hasTag(l, '초보추천') && l.profit >= 500, sort: byProfit },
];

export const pickItems = (p, listings) => photoFirst(listings.filter(p.fn).sort(p.sort));

// 테마 상세·목록 공용 집계 (byTheme + 조건 매장)
export function themeItems(t, { listings, byTheme }) {
  let items = byTheme[t.name] || [];
  if (t.slug === 'profit') items = [...new Set([...items, ...listings.filter(l => hasTag(l, '풀오토', '오토운영', '투잡'))])];
  if (t.slug === 'low-capital') items = [...new Set([...items, ...listings.filter(l => l.premium && l.premium < 10000)])];
  if (t.slug === 'new-town') items = [...new Set([...items, ...listings.filter(l => l.newTown)])];
  if (t.slug === 'franchise') items = [...new Set([...items, ...listings.filter(l => l.brand)])];
  if (t.slug === 'high-profit') items = [...new Set([...items, ...listings.filter(l => l.profit && l.profit >= 1500)])].sort(byProfit);
  return photoFirst(items);
}

export const THEME_DETAIL = {
  beginner: { fit: ['창업 경험이 없고 본사 매뉴얼에 맞춰 운영하고 싶은 분', '메뉴 개발보다 매장 운영부터 익히고 싶은 분', '인수 후에도 담당자에게 물어볼 곳이 필요한 분'], rule: '담당자가 초보 창업에 맞다고 분류한 매장', check: ['본사 양수 교육 기간과 비용', '기존 직원 승계 여부', '점주가 직접 근무할 시간대'] },
  'low-capital': { fit: ['권리금을 1억원 아래로 맞추고 싶은 분', '테이크아웃·배달처럼 소규모 매장을 찾는 분', '첫 매장으로 규모를 작게 시작하려는 분'], rule: '권리금 1억원 미만 매장과 소자본 테마 매장', check: ['보증금·월세를 합친 총 창업비용', '남은 임대 기간', '시설·집기 노후 정도'] },
  women: { fit: ['1인 또는 소수 인원으로 운영하려는 분', '영업시간이 규칙적인 업종을 찾는 분', '카페·베이커리·뷰티 업종을 선호하는 분'], rule: '담당자가 여성 창업자에게 맞다고 분류한 매장', check: ['마감 시간대와 주변 환경', '혼자 감당 가능한 업무량', '아르바이트 구인 여건'] },
  profit: { fit: ['직장을 유지하면서 매장을 운영하려는 분', '복수 매장을 보유하려는 투자자', '현장보다 관리 위주로 일하고 싶은 분'], rule: '풀오토·오토운영·투잡 가능으로 표시된 매장', check: ['매니저·직원 인건비 반영 여부', '오토 전환 후 매출 변동', '점주 방문이 필요한 횟수'] },
  senior: { fit: ['은퇴 후 안정적인 일을 찾는 50·60대', '체력 부담이 적은 업종을 원하는 분', '가족과 함께 운영하려는 분'], rule: '담당자가 시니어 창업에 맞다고 분류한 매장', check: ['근무 시간과 체력 부담', '배달앱·키오스크 운영 난이도', '가족 참여 가능 여부'] },
  franchise: { fit: ['검증된 브랜드로 시작하고 싶은 분', '신규 가맹보다 실제 매출을 먼저 보고 싶은 분', '본사 교육과 물류를 활용하려는 분'], rule: '프랜차이즈 브랜드가 확인된 가맹점', check: ['본사의 양수인 승인 조건', '로열티·광고비 부담', '리뉴얼 의무 시점'] },
  'new-town': { fit: ['입주가 늘어나는 상권을 선점하려는 분', '젊은 가족 수요를 겨냥하는 분', '매출 성장 여지를 중요하게 보는 분'], rule: '신도시·택지지구 상권으로 분류된 매장', check: ['입주율과 입주 예정 세대', '인근 경쟁 매장 입점 계획', '주변 상가 공실률'] },
  'high-profit': { fit: ['수익 규모를 가장 중요하게 보는 분', '권리금 투자 여력이 있는 분', '직원 조직을 관리할 수 있는 분'], rule: '월수익 1,500만원 이상이거나 고수익 테마로 분류된 매장', check: ['점주 인건비 제외 여부', '매출 증빙 기간', '임대 조건 변경 가능성'] },
};
