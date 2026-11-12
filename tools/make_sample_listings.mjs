// 예시(샘플) 매장 12건 생성 → src/data/listings.json
// 실제 매장은 관리자에서 직접 등록합니다. 예시는 화면 구성 확인용이며 모든 페이지에 "예시"로 표시됩니다.
// usage: node tools/make_sample_listings.mjs
import fs from 'node:fs';
import { CATEGORIES } from '../src/data.mjs';
import { makeTitle } from '../src/lib/text.mjs';

const brands = JSON.parse(fs.readFileSync('src/data/brands.json', 'utf-8'));
const KEYS = ['재료비', '인건비', '월비용(세전)', '관리비', '기타경비'];
const DEF_PCT = { 재료비: 35, 인건비: 20, '월비용(세전)': 9, 관리비: 3, 기타경비: 5 };
// [시도, 구군, 브랜드(없으면 ''), 업종 대분류, 소분류, 월매출, 권리금, 면적㎡, 테마, 신도시, 이미지, 요약, 태그]
const ROWS = [
  ['서울', '양천구', '메가커피', '휴게음식점', '소형카페', 3500, 9000, 50, '초보창업', '', 'cafe', '역세권 1층 · 테이크아웃 위주 · 직원 승계 가능', ['초보추천', '역세권']],
  ['서울', '강남구', '투썸플레이스', '휴게음식점', '커피전문점/대형커피', 6200, 25000, 165, '고수익창업', '', 'cafe', '오피스 상권 대형 매장 · 주말 매출 안정', ['고수익', '1군상권']],
  ['경기', '성남시', '파리바게뜨', '휴게음식점', '베이커리', 5800, 18000, 99, '프랜차이즈창업', '위례신도시', 'bakery', '아파트 단지 앞 · 생지 공급 본사 지원', ['신도시', '주차완비']],
  ['인천', '연수구', '맘스터치', '휴게음식점', '패스트푸드', 4200, 12000, 82, '신도시창업', '송도국제도시', 'burger', '배달 비중 40% · 학원가 인접', ['배달', '신도시']],
  ['서울', '마포구', '교촌치킨', '주류/치킨/호프', '치킨전문점', 4500, 11000, 66, '수익형창업', '', 'chicken', '배달·홀 병행 · 오토 운영 가능', ['오토운영', '배달']],
  ['경기', '수원시', '역전할머니맥주', '주류/치킨/호프', '맥주전문점', 5000, 15000, 132, '고수익창업', '', 'pub', '대학가 저녁 상권 · 단체석 보유', ['대학가', '고수익']],
  ['서울', '송파구', '본죽', '일반음식점', '죽/도시락/비빔밥', 2600, 6000, 40, '시니어창업', '', 'korean', '병원 인근 · 점심 위주 · 주5일 운영', ['주5일', '시니어추천']],
  ['경기', '고양시', '엽기떡볶이', '일반음식점', '김밥/떡볶이/분식류', 3800, 7000, 46, '소자본창업', '', 'bunsik', '배달 전문 · 1인 운영 가능', ['소자본', '배달']],
  ['서울', '노원구', '골프존', '오락/스포츠/기타', '스크린골프', 4800, 20000, 330, '수익형창업', '', 'golf', '룸 6개 · 회원 고정 매출 · 무인 운영 시간대', ['풀오토', '주차완비']],
  ['인천', '부평구', '', '일반음식점', '일반식당', 3200, 5000, 72, '여성창업', '', 'korean', '개인 한식당 · 점심 정식 단골 다수', ['여성추천']],
  ['경기', '용인시', '', '휴게음식점', '소형카페', 2200, 3500, 33, '소자본창업', '', 'cafe', '개인 카페 · 인테리어 1년 차 · 저렴한 임대료', ['소자본', '초보추천']],
  ['서울', '영등포구', '정관장', '판매/소매/서비스', '생활용품/건강식품', 3000, 5000, 36, '시니어창업', '', 'retail', '역사 내 매장 · 명절 매출 집중', ['역세권', '시니어추천']],
];
const now = new Date().toISOString();
const out = ROWS.map(([sido, gugun, brandName, kind1, kind2, sales, premium, areaM2, theme, newTown, img, summary, tags], i) => {
  const b = brandName ? brands.find(x => x.name === brandName) : null;
  const c = CATEGORIES.find(c => c.name === kind1); const kindCode = (c.kinds.find(k => k[1] === kind2) || [null])[0];
  const pct = { ...DEF_PCT, ...Object.fromEntries(Object.entries(b?.expensePct || {}).filter(([, v]) => v != null)) };
  const eb = {}; let expense = 0; for (const k of KEYS) { const amount = Math.round(sales * pct[k] / 100 / 10) * 10; eb[k] = { amount, pct: Math.round(amount / sales * 1000) / 10 }; expense += amount; }
  const l = {
    id: String(900001 + i), status: 'active', sample: true, source: 'sample', sido, gugun, brand: b ? b.name : '', brandSlug: b ? b.slug : '', kindLabel: '', brandsAll: b ? [b.name] : [],
    kind1, kind2, code: c.code, kindCode, theme, newTown, sales, expense, profit: sales - expense, monthlyCost: eb['월비용(세전)'].amount, premium, premiumLabel: '권리', areaM2, floor: '1',
    sizeRange: '', salesBasis: 1, expenseBreakdown: eb, titleRaw: '', summary: `[예시] ${summary}`,
    description: `※ 화면 구성을 보여드리기 위한 예시 매장입니다. 실제 매장이 아니며, 관리자에서 매장을 등록하면 이 자리에 실제 정보가 표시됩니다.\n\n▶ 매장 특징\nㆍ${summary.split(' · ').join('\nㆍ')}\n\n▶ 운영 정보 (예시)\nㆍ면적 약 ${areaM2}㎡ (${Math.round(areaM2 / 3.3)}평), 1층\nㆍ월매출 ${sales.toLocaleString()}만원 기준, 재료비·인건비 등 지출 내역은 상단 표 참고\n\n▶ 상담 안내\n정확한 위치와 상호는 양도인 보안을 위해 상담 후 안내합니다.`,
    tags, images: [`img/sample/${img}.jpg`], agentId: '', agentName: '', agentPhone: '', createdAt: now, updatedAt: now,
  };
  l.title = makeTitle(l); return l;
});
fs.writeFileSync('src/data/listings.json', JSON.stringify(out, null, 1));
console.log('sample listings', out.length);
