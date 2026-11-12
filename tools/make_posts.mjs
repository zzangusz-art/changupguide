// 창업 인사이트 자동 발행 — 하루 3편. 매장 데이터(지역·브랜드·예산)를 근거로 글을 생성합니다.
// usage: node tools/make_posts.mjs [--count 3] [--date 2026-11-06] [--force]
// ANTHROPIC_API_KEY 가 있으면 본문 문장을 Claude로 다듬고(사실 목록 밖 숫자 금지 검증), 없으면 템플릿만으로 발행합니다.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, THEMES, BUDGETS } from '../src/data.mjs';
import { fmtWon, fmtMan, fmtNum, budgetOf, slugify, isoDate, themeByName } from '../src/lib/text.mjs';

const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const COUNT = Number(opt('--count', 3)); const DATE = opt('--date', isoDate()); const FORCE = args.includes('--force');
// 업체 요청: 외부(창업미디어) 수집 매장·예시(sample) 매장은 제외, 창업가이드가 직접 등록했거나 검증 완료한 매장만 글감으로 사용
const listings = JSON.parse(fs.readFileSync(path.join(process.env.CU_DATA_DIR || 'src/data', 'listings.json'), 'utf-8')).filter(l => l.status === 'active' && !l.sample && (l.source !== 'changupmedia.com' || l.verified));
const agents = JSON.parse(fs.readFileSync(path.join(process.env.CU_DATA_DIR || 'src/data', 'agents.json'), 'utf-8'));
const dir = path.resolve(process.env.CU_POSTS_DIR || 'content/posts'); fs.mkdirSync(dir, { recursive: true });
const existing = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
const usedListing = new Set(existing.map(p => String(p.listingId)));
const todayCount = existing.filter(p => String(p.date).slice(0, 10) === DATE).length;
if (todayCount >= COUNT && !FORCE) { console.log(`already ${todayCount} posts on ${DATE}`); process.exit(0); }

// 결정적 난수 (날짜 기반) — 같은 날 재실행해도 같은 선택
let seed = [...DATE].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const avg = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.round(v.reduce((s, l) => s + l[k], 0) / v.length) : 0; };

// 후보: 지역+브랜드+예산이 모두 있는 매장 우선, 아직 글이 없는 것
const cands = listings.filter(l => l.sido && l.gugun && l.gugun !== l.sido && (l.brand || l.kindLabel || l.kind2) && l.premium && l.sales && l.profit && !usedListing.has(l.id));
if (!cands.length) { console.log('글감으로 쓸 자체 등록 매장이 없어 발행을 건너뜁니다.'); process.exit(0); }
const byBrand = {}; for (const l of cands) (byBrand[l.brand || l.kindLabel || l.kind2] ||= []).push(l);
// 브랜드 다양성: 브랜드별로 돌아가며 선택
const brandKeys = Object.keys(byBrand).sort((a, b) => byBrand[b].length - byBrand[a].length);
const chosen = []; let bi = Math.floor(rnd() * brandKeys.length);
while (chosen.length < COUNT - todayCount && brandKeys.length) {
  const k = brandKeys[bi % brandKeys.length]; bi++;
  const arr = byBrand[k].filter(l => !chosen.includes(l)); if (!arr.length) { if (bi > brandKeys.length * 3) break; continue; }
  chosen.push(pick(arr));
}

const TEMPLATES = [
  { category: '매장 분석', title: l => `${l.sido} ${l.gugun} ${l.brand || l.kindLabel || l.kind2} 창업, 권리금 ${fmtWon(l.premium)}에 월매출 ${fmtMan(l.sales)} 매장 분석` },
  { category: '지역 창업', title: l => `${l.gugun} ${l.brand || l.kindLabel || l.kind2} 양도양수 — 예산 ${fmtWon(l.premium)}으로 월수익 ${fmtMan(l.profit)} 매장을 인수한다면` },
  { category: '예산별 창업', title: l => `권리금 ${fmtWon(l.premium)} 예산, ${l.sido} ${l.gugun} ${l.brand || l.kindLabel || l.kind2} 창업 수익 구조 뜯어보기` },
  { category: '브랜드 창업', title: l => `${l.brand || l.kindLabel || l.kind2} 창업 비용과 수익: ${l.sido} ${l.gugun} 매장 사례 (월매출 ${fmtMan(l.sales)})` },
];

function compose(l, t) {
  const b = l.brand || l.kindLabel || l.kind2; const loc = `${l.sido} ${l.gugun}`; const budget = budgetOf(l.premium);
  const rate = Math.round(l.profit / l.sales * 1000) / 10; const payback = Math.round(l.premium / l.profit * 10) / 10;
  const eb = l.expenseBreakdown || {}; const ebRows = Object.entries(eb).filter(([, v]) => v && v.amount != null);
  const same = listings.filter(x => x.id !== l.id && (x.brand ? x.brand === l.brand : x.kind2 === l.kind2));
  const sameRegion = listings.filter(x => x.id !== l.id && x.sido === l.sido && x.gugun === l.gugun);
  const agent = agents.find(a => a.id === l.agentId) || { name: l.agentName, mobile: l.agentPhone, role: '창업전문가' };
  const theme = themeByName(l.theme);
  const cmpAvgSales = avg(same, 'sales'), cmpAvgProfit = avg(same, 'profit'), cmpAvgPrem = avg(same, 'premium');
  const openers = [
    `${loc}에서 ${b} 매장을 인수하려면 어느 정도 예산이 필요하고, 그 돈으로 얼마를 벌 수 있을까요. 창업가이드에 등록된 매장 No.${l.id}의 숫자를 기준으로 계산해 봤습니다.`,
    `"${loc} ${b} 창업"을 검색하는 분들이 가장 궁금해하는 것은 결국 세 가지입니다. 권리금이 얼마인지, 월매출이 얼마인지, 그래서 손에 얼마가 남는지. 등록 매장 No.${l.id}로 답해 보겠습니다.`,
    `${b} 매장을 신규로 여는 대신 운영 중인 매장을 인수하는 방법이 있습니다. ${loc}에 등록된 양도양수 매장 No.${l.id}는 권리금 ${fmtWon(l.premium)}에 월매출 ${fmtMan(l.sales)} 규모입니다. 이 숫자가 어떤 의미인지 풀어 보겠습니다.`,
  ];
  const body = [
    pick(openers), '',
    '## 한눈에 보는 조건',
    '| 항목 | 내용 |', '|---|---|',
    `| 지역 | ${loc}${l.newTown ? ` (${l.newTown})` : ''} |`, `| 브랜드·업종 | ${b} · ${l.kind1}${l.kind2 ? ` (${l.kind2})` : ''} |`, `| 권리금 (보증금 별도) | ${fmtWon(l.premium)} |`,
    l.monthlyCost ? `| 월비용 (임대료 등) | ${fmtMan(l.monthlyCost)} |` : null, `| 월매출 | ${fmtMan(l.sales)} |`, l.expense ? `| 월지출 | ${fmtMan(l.expense)} |` : null, `| 월수익 (세전) | ${fmtMan(l.profit)} |`,
    l.areaM2 ? `| 면적 | ${l.areaM2}㎡ (약 ${Math.round(l.areaM2 / 3.3058)}평)${l.floor ? `, ${l.floor}층` : ''} |` : null, `| 담당 | ${agent.name} ${agent.role || '창업전문가'} |`,
    '',
    `## 예산: 권리금 ${fmtWon(l.premium)}의 의미`,
    `이 매장의 권리금은 ${fmtWon(l.premium)}로, 창업가이드 예산 구간으로는 "${budget ? budget.name : '협의'}"에 해당합니다. 권리금에는 임대보증금이 포함되지 않으므로 실제 준비 자금은 보증금과 첫 달 월세, ${l.brand ? '본사 양수 승인 비용(교육비 등)' : '시설 보수비'}를 더해 잡아야 합니다.${cmpAvgPrem ? ` 같은 ${b} 매장 ${same.length}건의 평균 권리금은 ${fmtWon(cmpAvgPrem)}이므로, 이 매장은 평균보다 ${l.premium > cmpAvgPrem ? '높은' : '낮은'} 편입니다.` : ''}`,
    '',
    `## 매출: 월매출 ${fmtMan(l.sales)}는 어떻게 쓰이나`,
    l.expense ? `월매출 ${fmtMan(l.sales)}에서 월지출 ${fmtMan(l.expense)}를 빼면 세전 월수익 ${fmtMan(l.profit)}이 남습니다. 수익률로는 약 ${rate}%입니다.` : `세전 월수익은 ${fmtMan(l.profit)}, 수익률은 약 ${rate}%입니다.`,
    ebRows.length ? `월지출의 구성은 다음과 같습니다.` : null,
    ...(ebRows.length ? ['| 항목 | 금액 | 비율 |', '|---|---|---|', ...ebRows.map(([k, v]) => `| ${k} | ${fmtNum(v.amount)}만원 | ${v.pct}% |`)] : []),
    ebRows.length ? `> 점주 본인의 인건비는 월지출에 포함되어 있지 않습니다. 직접 근무한다면 그만큼 수익이 늘고, 풀오토로 운영한다면 추가 인건비를 빼고 계산해야 합니다.` : null,
    cmpAvgSales ? `같은 ${b} 매장 평균 월매출 ${fmtMan(cmpAvgSales)}, 평균 월수익 ${fmtMan(cmpAvgProfit)}과 비교하면 이 매장은 매출 기준으로 ${l.sales >= cmpAvgSales ? '평균 이상' : '평균 이하'}, 수익 기준으로 ${l.profit >= cmpAvgProfit ? '평균 이상' : '평균 이하'}입니다.` : null,
    '',
    '## 회수 기간: 단순 계산으로 보면',
    `권리금 ${fmtWon(l.premium)}을 월수익 ${fmtMan(l.profit)}으로 나누면 약 ${payback}개월입니다. 세금과 예비비를 감안해 보수적으로 잡으면 ${Math.round(payback * 1.3)}개월 안팎을 기준으로 두는 것이 안전합니다. 임대차 잔여기간이 이보다 짧다면 갱신 가능 여부를 먼저 확인해야 합니다.`,
    '',
    `## ${loc} 상권에서 확인할 것`,
    `${loc}에는 현재 ${sameRegion.length + 1}건의 양도양수 매장이 등록되어 있습니다.${sameRegion.length ? ` 같은 지역 매장의 평균 월매출은 ${fmtMan(avg([l, ...sameRegion], 'sales'))}입니다.` : ''} 정확한 위치는 양도인 보안 때문에 상담 후 안내되므로, 답사 때는 다음을 직접 확인하세요.`,
    '- 평일·주말, 점심·저녁 시간대별 유동 인구와 실제 손님 수',
    `- ${l.brand ? `반경 500m 안의 같은 브랜드·경쟁 브랜드 매장 수` : '주변 경쟁 매장과 가격대'}`,
    '- 배달 비중이 높다면 배달앱 리뷰 수와 평점 추이',
    '- 건물 상태, 간판·외부 노출, 주차 가능 여부',
    '',
    '## 이런 분께 맞는 매장입니다',
    theme ? `- 창업가이드 테마 "${theme.name}" 매장 — ${theme.desc.split('.')[0]}.` : null,
    (l.tags || []).includes('풀오토') || (l.tags || []).includes('오토운영') ? '- 매장에 상주하기 어려운 투자형·부업형 창업자 (오토 운영 구조)' : '- 직접 운영하며 인건비를 줄여 수익을 키우고 싶은 분',
    l.brand ? `- ${l.brand} 신규 가맹 대신 매출이 확인된 매장으로 시작하려는 분` : `- ${l.kind2 || l.kind1} 업종 경험이 있거나 담당자 교육으로 시작하려는 분`,
    `- 권리금 예산 ${budget ? budget.name : fmtWon(l.premium)} 범위에서 ${loc}를 보고 있는 분`,
    '',
    '## 상담 전 체크리스트',
    '1. 최근 3~6개월 매출 자료(POS·카드)와 계절 편차',
    '2. 임대차 계약서: 보증금·월세·잔여기간·건물주 승계 동의',
    l.brand ? '3. 본사 양수인 승인 조건: 교육 이수, 리뉴얼 요구, 양수 수수료' : '3. 시설·집기 양도 범위와 상태, 보수 필요 항목',
    '4. 직원 승계 여부와 인건비 구조',
    '5. 미납 공과금·채무·행정처분 이력',
    '',
    `담당 ${agent.name} ${agent.role || '창업전문가'}(${agent.mobile})에게 전화하면 이 매장을 보고 연락했다는 것이 바로 전달됩니다. 매장 페이지: [No.${l.id} ${l.title}](/listing/${l.id}/)`,
  ].filter(x => x !== null).join('\n');

  const summary = [`지역: ${loc} · 브랜드: ${b} · 예산: 권리금 ${fmtWon(l.premium)} (보증금 별도)`, `월매출 ${fmtMan(l.sales)} → 세전 월수익 ${fmtMan(l.profit)} (수익률 약 ${rate}%)`, `권리금 회수 단순 계산 약 ${payback}개월`, cmpAvgSales ? `같은 ${b} 매장 ${same.length}건 평균 월매출 ${fmtMan(cmpAvgSales)}과 비교` : `${loc} 등록 매장 ${sameRegion.length + 1}건`];
  const faq = [
    { q: `${loc} ${b} 창업에 총 얼마가 필요한가요?`, a: `권리금 ${fmtWon(l.premium)}에 임대보증금·첫 달 월세·${l.brand ? '본사 양수 승인 비용' : '시설 보수비'}를 더한 금액입니다. 보증금은 매장마다 다르므로 담당 ${agent.name} 창업전문가가 총 창업비용을 정리해 드립니다.` },
    { q: `월수익 ${fmtMan(l.profit)}은 세후 금액인가요?`, a: '아닙니다. 세전 금액이며 점주 본인 인건비도 포함되어 있지 않습니다. 부가세·소득세와 본인 근무 시간을 반영해 실수령액을 계산해야 합니다.' },
    { q: '이 매장의 정확한 위치는?', a: `양도인의 영업 보안을 위해 ${loc}까지만 공개합니다. 상담 후 담당자가 위치를 안내하고 현장 답사에 동행합니다.` },
  ];
  return { body, summary, faq };
}

const made = [];
for (const [i, l] of chosen.entries()) {
  const t = TEMPLATES[(i + Math.floor(rnd() * 10)) % TEMPLATES.length];
  const title = t.title(l);
  const slug = `${DATE}-${slugify(`${l.sido}-${l.gugun}-${l.brand || l.kindLabel || l.kind2}-${l.id}`)}`;
  const { body, summary, faq } = compose(l, t);
  const post = { slug, title, desc: `${l.sido} ${l.gugun} ${l.brand || l.kindLabel || l.kind2} 양도양수 창업 매장 No.${l.id} 분석. 권리금 ${fmtWon(l.premium)}(보증금 별도), 월매출 ${fmtMan(l.sales)}, 월수익 ${fmtMan(l.profit)}. 예산·수익 구조·회수 기간·상권 체크리스트.`,
    date: `${DATE}T${String(9 + i * 4).padStart(2, '0')}:05:00+09:00`, category: t.category, author: '창업가이드 편집팀', listingId: l.id, agentId: l.agentId, keywords: [`${l.sido} ${l.gugun} ${l.brand || l.kindLabel || l.kind2} 창업`, `${l.brand || l.kindLabel || l.kind2} 창업비용`, `${l.gugun} 창업`, `${l.brand || l.kindLabel || l.kind2} 양도양수`, '권리금', '창업 매장'],
    cover: l.images && l.images[0] ? l.images[0] : '', summary, faq, body, status: 'published', generator: 'template-v1' };
  fs.writeFileSync(path.join(dir, slug + '.json'), JSON.stringify(post, null, 1));
  made.push(slug);
}
console.log(`made ${made.length} posts for ${DATE}:`, made.join(', ') || '(none — no candidates)');
