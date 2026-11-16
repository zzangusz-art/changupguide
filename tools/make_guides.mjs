// 창업 인사이트 자동 발행 — 브랜드별 창업 가이드 · 프랜차이즈/양도양수 키워드 가이드 · 지역별 창업 가이드
// 숫자는 모두 창업가이드에 실제 등록된 공개 매장(예시 매장 제외)에서 계산합니다. 외부 출처 숫자·추정치는 쓰지 않습니다.
// usage: node tools/make_guides.mjs [--count 1] [--slot 0|1|2] [--date 2026-11-16]
//   slot 0 = 브랜드 가이드, 1 = 키워드 가이드, 2 = 지역 가이드 (없으면 다음 순서로 대체)
//   데이터: CU_DATA_DIR(listings.json, brands.json) · 글 저장: CU_POSTS_DIR
import fs from 'node:fs';
import path from 'node:path';
import { SITE, CATEGORIES, BUDGETS } from '../src/data.mjs';
import { fmtWon, fmtMan, fmtNum } from '../src/lib/text.mjs';

const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const COUNT = Number(opt('--count', 1)); const SLOT = opt('--slot', null);
const DATA = process.env.CU_DATA_DIR || 'src/data'; const DIR = path.resolve(process.env.CU_POSTS_DIR || 'content/posts'); fs.mkdirSync(DIR, { recursive: true });
const read = f => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf-8')); } catch { return []; } };
const kstNow = () => new Date(Date.now() + 9 * 3600e3);
const DATE = opt('--date', kstNow().toISOString().slice(0, 10));
const YEAR = DATE.slice(0, 4);

// ---------- 데이터 ----------
const all = read('listings.json');
const L = all.filter(l => l.status === 'active' && !l.sample && !l.duplicateOf && (l.source !== 'changupmedia.com' || l.verified));
// 썸네일: Unsplash 무료 라이선스 사진(상업 이용·출처 표기 불필요) — src/data/blog-covers.json
const COVERS = (() => { try { return JSON.parse(fs.readFileSync(new URL('../src/data/blog-covers.json', import.meta.url), 'utf-8')); } catch { return {}; } })();
const coverFor = (k, fb) => COVERS[k]?.file || fb;
const BRANDS = read('brands.json'); const brandBy = Object.fromEntries(BRANDS.map(b => [b.slug, b]));
const existing = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8')); } catch { return null; } }).filter(Boolean);
const usedKeys = new Set(existing.map(p => p.guideKey).filter(Boolean));
const enc = s => encodeURIComponent(s);
const avg = (arr, k) => { const v = arr.map(x => x[k]).filter(n => typeof n === 'number' && n > 0); return v.length ? Math.round(v.reduce((s, n) => s + n, 0) / v.length) : null; };
const med = (arr, k) => { const v = arr.map(x => x[k]).filter(n => typeof n === 'number' && n > 0).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const rng = (arr, k) => { const v = arr.map(x => x[k]).filter(n => typeof n === 'number' && n > 0); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
// 받침에 맞는 조사: josa('메가커피', '은/는') → '메가커피는'
const josa = (w, pair) => { const t = String(w); const c = t.charCodeAt(t.length - 1); const has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : /[0-9lmnr]$/i.test(t); const [a, b] = pair.split('/'); return t + (has ? a : b); };
const won = n => n == null ? '문의' : fmtWon(n); const man = n => n == null ? '문의' : fmtMan(n);
const top = (arr, f, n = 5) => Object.entries(arr.reduce((m, x) => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, n);
const region = l => [l.sido, l.gugun].filter(Boolean).join(' ');
const regionLink = (s, g) => g ? `/region/${enc(s)}/${enc(g)}/` : `/region/${enc(s)}/`;
const pickList = (arr, n = 5) => [...arr].filter(l => l.images?.length).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).concat(arr.filter(l => !l.images?.length)).slice(0, n);
const listingLines = arr => pickList(arr).map(l => `- [No.${l.id} ${[l.sido, l.gugun, l.dong].filter(Boolean).join(' ')} ${l.brand || l.kind2 || ''}](/listing/${l.id}/) — 월매출 ${man(l.sales)} · 월수익 ${man(l.profit)} · 창업비용 ${won(l.premium)}`);
const statTable = arr => ['| 항목 | 내용 |', '|---|---|', `| 공개 매장 수 | ${fmtNum(arr.length)}곳 |`, `| 평균 월매출 | ${man(avg(arr, 'sales'))} |`, `| 평균 월수익 (세전) | ${man(avg(arr, 'profit'))} |`, `| 창업비용 중간값 | ${won(med(arr, 'premium'))} |`, ...(rng(arr, 'premium') ? [`| 창업비용 범위 | ${won(rng(arr, 'premium')[0])} ~ ${won(rng(arr, 'premium')[1])} |`] : [])];
const budgetSpread = arr => BUDGETS.map(b => [b, arr.filter(l => l.premium >= b.min && l.premium < b.max).length]).filter(([, n]) => n);
const coverOf = (arr, fallback) => (pickList(arr, 1)[0]?.images?.[0]) || fallback;
const asOf = `${DATE.replace(/-/g, '.')} 기준`;
const CTA = `## 원하는 조건으로 찾아보기\n지역·브랜드·예산을 남겨 주시면 담당 창업전문가가 조건에 맞는 운영 중 매장을 추려 연락드립니다. [창업 의뢰 남기기](/inquiry/) · [전체 매장 검색](/listings/)`;
const NOTE = `> 이 글의 숫자는 ${asOf} 창업가이드에 공개된 매장 기준이며, 매장이 새로 등록되거나 거래되면 달라질 수 있습니다. 창업비용은 임대보증금을 제외한 금액이고, 월수익은 세금 공제 전 금액입니다.`;

// ---------- 1) 브랜드별 창업 가이드 ----------
function brandGuide() {
  const groups = Object.entries(L.reduce((m, l) => { if (l.brandSlug && l.brand) (m[l.brandSlug] ||= []).push(l); return m; }, {})).sort((a, b) => b[1].length - a[1].length);
  const pick = groups.find(([slug]) => !usedKeys.has(`brand:${slug}`)) || groups.find(([slug]) => !usedKeys.has(`brand:${slug}:${DATE.slice(0, 7)}`));
  if (!pick) return null;
  const [slug, arr] = pick; const key = usedKeys.has(`brand:${slug}`) ? `brand:${slug}:${DATE.slice(0, 7)}` : `brand:${slug}`;
  const b = brandBy[slug] || {}; const name = arr[0].brand; const kind = [b.kind1 || arr[0].kind1, b.kind2 || arr[0].kind2].filter(Boolean).join(' · ');
  const s = avg(arr, 'sales'), p = avg(arr, 'profit'), pm = med(arr, 'premium'); const regs = top(arr, region, 6);
  const ep = b.expensePct || {}; const epRows = Object.entries(ep).filter(([, v]) => v != null);
  const exSales = s || 3000;
  const body = [
    `"${name} 창업 비용"을 찾는 분들이 가장 먼저 묻는 것은 세 가지입니다. 얼마가 드는지, 한 달에 얼마나 팔리는지, 그래서 손에 얼마가 남는지. 창업가이드에 지금 공개된 ${name} 매장 ${fmtNum(arr.length)}곳의 숫자로 답해 보겠습니다.`,
    '', `## ${name} 매장, 지금 숫자로 보면`, ...statTable(arr), '',
    s && p ? `공개 매장 평균으로 보면 월매출 ${man(s)}에서 월수익(세전) ${man(p)} 정도가 남는 구조입니다. 매출 대비 수익 비율은 약 ${Math.round(p / s * 1000) / 10}%입니다. 같은 ${josa(name, '이라도/라도')} 상권·면적·운영 방식에 따라 매장별 편차가 크므로 평균은 출발점으로만 보세요.` : null,
    '', `## 창업비용 구간별 분포`, ...budgetSpread(arr).map(([bd, n]) => `- [창업비용 ${bd.name}](/budget/${bd.slug}/): ${n}곳`), '',
    epRows.length ? [`## ${name} 매장의 월지출 구조`, `창업가이드가 ${name} 매장을 등록할 때 기본값으로 쓰는 평균 지출 비율입니다. 월매출 ${man(exSales)} 매장이라면 대략 이렇게 나뉩니다.`, '', '| 항목 | 비율 | 월매출 ' + man(exSales) + ' 기준 |', '|---|---|---|', ...epRows.map(([k, v]) => `| ${k === '월비용(세전)' ? '월세 등 월비용' : k} | ${v}% | 약 ${man(Math.round(exSales * v / 100))} |`), '', '> 점주 본인의 인건비는 월지출에 포함하지 않습니다. 직접 근무하면 그만큼 수익이 늘고, 직원을 더 두면 줄어듭니다.', ''].join('\n') : null,
    `## 매장이 많은 지역`, ...regs.map(([r, n]) => { const [sd, ...g] = r.split(' '); return `- [${r}](${regionLink(sd, g.join(' '))}): ${n}곳`; }), '',
    `## 신규 가맹 vs 양도양수, ${josa(name, '은/는')} 어떻게 시작할까`,
    `- **신규 가맹**: 상권을 새로 고르고 인테리어·장비를 새로 들여 문을 엽니다. 매출은 오픈 후에야 알 수 있습니다.`,
    `- **양도양수**: 이미 운영 중인 ${name} 매장을 인수합니다. 실제 매출 자료를 보고 판단할 수 있고, 인수 후 바로 영업을 이어갈 수 있습니다. 대신 본사의 양수 승인 절차(교육 이수 등)를 거쳐야 하며, 조건은 브랜드마다 다릅니다.`,
    '', `## ${name} 매장 인수 전 체크리스트`,
    '- 최근 6개월 이상의 POS·카드 매출 자료와 부가세 신고 내역이 일치하는지',
    '- 임대차 계약의 남은 기간, 보증금·월세, 재계약 조건',
    `- ${name} 본사의 양수 승인 절차와 비용, 가맹 계약 잔여 기간`,
    '- 시설·장비 상태와 인수 목록(재고·소모품 포함), 직원 승계 여부',
    '- 반경 안의 같은 브랜드·경쟁 카페 수, 시간대별 유동 인구',
    '', `## 지금 공개된 ${name} 매장`, ...listingLines(arr), `- [${name} 매장 전체 보기](/brand/${slug}/)`, '', NOTE, '', CTA,
  ].filter(x => x != null).join('\n');
  return { key, category: '브랜드 창업 가이드', title: `${name} 창업 비용과 수익 구조 — 운영 중 매장 ${fmtNum(arr.length)}곳으로 본 ${YEAR} 양도양수 가이드`,
    desc: `${name} 창업, 얼마가 들고 얼마가 남을까. 창업가이드 공개 매장 ${fmtNum(arr.length)}곳 기준 평균 월매출 ${man(s)}, 월수익 ${man(p)}, 창업비용 중간값 ${won(pm)}. 지출 구조와 인수 체크리스트.`,
    keywords: [`${name} 창업`, `${name} 창업비용`, `${name} 양도양수`, `${name} 창업 수익`, `${name} 매장 인수`, '프랜차이즈 창업', kind].filter(Boolean),
    summary: [`${name} 공개 매장 ${fmtNum(arr.length)}곳 (${asOf})`, `평균 월매출 ${man(s)} · 평균 월수익(세전) ${man(p)}`, `창업비용 중간값 ${won(pm)} (임대보증금 별도)`, regs.length ? `매장이 많은 지역: ${regs.slice(0, 3).map(([r]) => r).join(', ')}` : null].filter(Boolean),
    faq: [
      { q: `${name} 창업 비용은 얼마인가요?`, a: `창업가이드에 공개된 ${name} 매장 기준 창업비용 중간값은 ${won(pm)}입니다(임대보증금 별도). 매장마다 면적·상권·매출이 달라 금액 차이가 크므로, 원하는 지역과 예산을 남겨 주시면 맞는 매장을 추려 드립니다.` },
      { q: `${name} 매장 월수익은 어느 정도인가요?`, a: `공개 매장 평균 월수익(세전)은 ${man(p)}입니다. 점주 본인의 인건비는 월지출에 포함되지 않은 금액이므로 직접 근무 여부에 따라 실제 수익이 달라집니다.` },
      { q: `${name} 매장을 양도양수로 인수하려면 무엇이 필요한가요?`, a: `양도인과의 조건 협의·계약, 임대차 승계, ${name} 본사의 양수 승인 절차가 필요합니다. 담당 창업전문가가 현장 답사부터 계약·본사 승인·인수인계까지 함께합니다.` },
    ],
    cover: coverOf(arr, coverFor('brand', 'img/og/brand.jpg')), body };
}

// ---------- 2) 키워드 가이드 (프랜차이즈·양도양수 창업 일반) ----------
const KW = [
  { key: 'kw:transfer', title: '양도양수 창업이란? 신규 창업과 비교한 장단점과 진행 순서', kws: ['양도양수 창업', '양도양수', '프랜차이즈 양도양수', '매장 인수 창업', '창업 방법'], cover: 'img/og/kw-transfer.jpg',
    lead: '양도양수 창업은 이미 운영 중인 매장을 시설·영업 그대로 인수해 시작하는 방식입니다. 새로 매장을 여는 것과 무엇이 다른지, 어떤 순서로 진행되는지 정리했습니다.',
    secs: [['신규 창업과 무엇이 다를까', ['| 구분 | 신규 창업 | 양도양수 창업 |', '|---|---|---|', '| 매출 확인 | 오픈 후에야 알 수 있음 | 실제 매출 자료로 미리 확인 |', '| 준비 기간 | 상권 조사·공사로 수개월 | 계약·인수인계 후 바로 영업 |', '| 초기 비용 | 인테리어·장비 신규 구입 | 운영 중 시설을 인수 |', '| 확인할 것 | 상권·본사 조건 | 매출 자료·계약 조건·시설 상태 |']],
      ['진행 순서', ['1. 조건 정리: 지역·업종·예산(창업비용)과 원하는 운영 방식', '2. 매장 제안: 조건에 맞는 운영 중 매장 목록과 숫자 비교', '3. 현장 답사: 시간대별 손님, 시설 상태, 주변 상권 확인', '4. 조건 협의: 창업비용, 인수 범위(시설·재고), 인수 시점', '5. 계약: 양도양수 계약과 임대차 승계', '6. 본사 승인: 프랜차이즈라면 양수 승인 절차와 교육', '7. 인수인계: 운영 노하우·거래처·직원 인계 후 영업 시작']],
      ['꼭 확인할 것', ['- 최근 6개월 이상 매출 자료(POS·카드 매출·부가세 신고)가 서로 맞는지', '- 임대차 남은 기간과 재계약 조건, 건물주 동의', '- 프랜차이즈 가맹 계약 잔여 기간과 본사 양수 조건', '- 인수 목록에 무엇이 포함되는지(시설·장비·재고·직원)']]],
    faq: [{ q: '양도양수 창업에서 창업비용은 무엇인가요?', a: '창업가이드에 표시되는 창업비용은 임대보증금을 제외한 금액입니다. 보증금·월세는 매장마다 달라 담당자가 따로 안내합니다.' }, { q: '양도양수 매장은 바로 영업할 수 있나요?', a: '계약과 임대차 승계, 프랜차이즈라면 본사 양수 승인을 마친 뒤 인수인계를 받으면 기존 시설 그대로 영업을 이어갈 수 있습니다.' }] },
  { key: 'kw:franchise-steps', title: `프랜차이즈 창업 절차 ${YEAR} — 정보공개서부터 오픈까지 7단계`, kws: ['프랜차이즈 창업', '프랜차이즈 창업 절차', '가맹점 창업', '정보공개서', '가맹계약'], cover: 'img/og/theme-franchise.jpg',
    lead: '프랜차이즈 창업은 브랜드를 고르는 것보다 순서를 지키는 것이 더 중요합니다. 가맹사업법이 정한 정보공개서 확인부터 오픈까지 단계별로 정리했습니다.',
    secs: [['7단계 한눈에', ['1. 업종·예산·운영 방식 정하기', '2. 브랜드 후보 비교: 가맹점 수, 평균 매출, 폐점률', '3. 정보공개서 받기: 가맹본부는 계약 전에 정보공개서를 제공해야 합니다', '4. 숙고 기간: 정보공개서를 받은 날부터 14일(변호사·가맹거래사 자문을 받으면 7일)이 지나야 가맹금 지급·계약이 가능합니다', '5. 상권·입지 확정, 또는 운영 중 매장 양수 검토', '6. 가맹계약·임대차 계약', '7. 교육 이수·인테리어(신규) 또는 인수인계(양수) 후 오픈']],
      ['신규 가맹 대신 운영 중 매장을 인수하면', ['이미 영업 중인 가맹점을 양도양수로 인수하면 실제 매출을 보고 판단할 수 있고, 공사 기간 없이 영업을 이어갈 수 있습니다. 이때도 본사의 양수 승인과 교육 절차는 거칩니다. 창업가이드에서는 브랜드별로 운영 중인 매장의 월매출·월수익·창업비용을 비교할 수 있습니다.']],
      ['계약 전 체크리스트', ['- 정보공개서의 가맹점 수 변화와 평균 매출', '- 가맹금·교육비·인테리어 비용 등 가맹점사업자 부담 항목', '- 영업지역 보호 범위와 계약 기간', '- 최근 법 위반·분쟁 사실 기재 여부']]],
    faq: [{ q: '정보공개서는 언제 받을 수 있나요?', a: '가맹본부는 가맹계약 전에 정보공개서를 제공해야 하며, 받은 날부터 14일(변호사·가맹거래사 자문 시 7일)이 지나야 계약하거나 가맹금을 낼 수 있습니다.' }, { q: '운영 중인 가맹점을 인수해도 본사 승인이 필요한가요?', a: '네. 대부분의 브랜드는 양수인에 대한 승인과 교육 절차가 있습니다. 조건은 브랜드마다 다르므로 담당자가 확인해 드립니다.' }] },
  { key: 'kw:disclosure', title: '프랜차이즈 정보공개서 보는 법 — 계약 전 꼭 확인할 6가지', kws: ['정보공개서', '프랜차이즈 정보공개서', '가맹사업 정보공개서 보는법', '프랜차이즈 창업 주의사항'], cover: 'img/og/theme-franchise.jpg',
    lead: '정보공개서는 가맹본부가 예비 가맹점주에게 반드시 제공해야 하는 문서입니다. 두꺼워 보이지만 핵심은 몇 가지입니다.',
    secs: [['꼭 볼 6가지', ['1. **가맹본부 일반 현황**: 설립 연도, 재무 상태, 임원 정보', '2. **가맹점 현황**: 연도별 가맹점 수와 신규·종료·해지 수 — 늘고 있는지, 빠지고 있는지', '3. **가맹점 평균 매출**: 지역별 평균과 면적당 매출', '4. **가맹점사업자 부담**: 가맹금, 교육비, 보증금, 인테리어·장비 비용, 로열티', '5. **영업 조건**: 영업지역 보호 범위, 계약 기간, 갱신 조건', '6. **법 위반·분쟁**: 최근 시정조치나 소송 기재 여부']],
      ['숫자를 실제 매장과 맞춰 보기', ['정보공개서의 평균 매출은 전체 가맹점 평균입니다. 관심 있는 지역의 실제 운영 매장 숫자와 비교하면 감이 훨씬 정확해집니다. 창업가이드에는 브랜드·지역별 운영 중 매장의 월매출·월수익이 공개되어 있습니다.']],
      ['숙고 기간을 지키세요', ['정보공개서를 받은 날부터 14일(변호사·가맹거래사 자문을 받으면 7일)이 지나기 전에는 가맹금을 내거나 계약하지 않도록 법으로 정해져 있습니다. 이 기간에 가맹점 몇 곳을 직접 방문해 점주 이야기를 들어 보세요.']]],
    faq: [{ q: '정보공개서는 어디서 볼 수 있나요?', a: '가맹본부에 요청해 받을 수 있고, 공정거래위원회 가맹사업거래 사이트에서 등록된 정보공개서를 조회할 수 있습니다.' }] },
  { key: 'kw:cost', title: '창업비용 구성 한눈에 — 창업비용·보증금·월세·운영자금 계산법', kws: ['창업비용', '창업 비용 계산', '매장 인수 비용', '양도양수 창업비용', '창업 자금'], cover: 'img/og/budget.jpg',
    lead: '매장 하나를 인수할 때 실제로 필요한 돈은 표시된 창업비용보다 많습니다. 무엇을 더해야 하는지 정리했습니다.',
    secs: [['필요 자금 = 창업비용 + 보증금 + 첫 달 비용 + 예비비', ['| 항목 | 설명 |', '|---|---|', '| 창업비용 | 창업가이드에 표시되는 금액. 임대보증금 제외 |', '| 임대보증금 | 건물주에게 맡기는 보증금. 매장마다 다름 |', '| 첫 달 월세·관리비 | 인수 첫 달 고정비 |', '| 본사 승인·교육 비용 | 프랜차이즈 양수 시 브랜드별로 발생할 수 있음 |', '| 운영 예비비 | 비수기·시설 보수 대비 2~3개월 고정비 권장 |']],
      ['예산별로 매장 찾기', BUDGETS.map(b => `- [창업비용 ${b.name}](/budget/${b.slug}/)`)],
      ['월수익을 볼 때 주의할 점', ['창업가이드의 월수익은 월매출에서 재료비·인건비·월세·관리비·기타경비를 뺀 세전 금액이며, 점주 본인의 인건비는 빠져 있습니다. 직접 근무한다면 그만큼 수익이 늘고, 관리만 한다면 추가 인건비를 빼고 계산해야 합니다.']]],
    faq: [{ q: '표시된 창업비용에 보증금이 포함되나요?', a: '아니요. 창업가이드에 표시되는 창업비용은 임대보증금을 제외한 금액입니다.' }] },
  { key: 'kw:cafe', title: `카페 창업 비용과 수익 ${YEAR} — 운영 중 카페 매장 숫자로 비교`, kws: ['카페 창업', '카페 창업 비용', '카페 창업 수익', '커피 프랜차이즈 창업', '카페 양도양수'], cover: 'img/og/kw-cafe.jpg', data: l => /카페|커피/.test(`${l.kind2} ${l.brand}`) },
  { key: 'kw:small', title: '소자본 창업, 창업비용 1억 미만으로 시작할 수 있는 매장', kws: ['소자본 창업', '소자본 창업 아이템', '1억 미만 창업', '소액 창업', '저비용 창업'], cover: 'img/og/theme-low-capital.jpg', data: l => l.premium > 0 && l.premium < 10000 },
  { key: 'kw:beginner', title: '초보 창업자가 매장 고르는 법 — 숫자·상권·운영 방식 체크리스트', kws: ['초보 창업', '초보창업 아이템', '첫 창업', '창업 준비', '창업 매장 고르는 법'], cover: 'img/og/theme-beginner.jpg',
    lead: '처음 창업할 때 가장 흔한 실수는 브랜드 이름만 보고 결정하는 것입니다. 숫자·상권·운영 방식 세 가지로 좁혀 보세요.',
    secs: [['1. 숫자: 월매출보다 월수익', ['같은 월매출이라도 월세·인건비 구조에 따라 남는 돈이 크게 다릅니다. 월수익(세전)과 창업비용을 함께 보고, 점주 인건비가 빠진 금액이라는 점을 기억하세요.']], ['2. 상권: 직접 세 번 가 보기', ['- 평일 점심, 평일 저녁, 주말 각각 방문', '- 손님 연령대와 테이크아웃 비율', '- 반경 안 경쟁 매장 수']], ['3. 운영 방식: 내가 할 수 있는 시간', ['직접 근무할 시간, 직원 관리 경험, 영업시간을 먼저 정하면 맞는 매장이 줄어듭니다. 운영 매뉴얼이 있는 프랜차이즈 매장은 초보자에게 부담이 덜합니다.']]],
    faq: [{ q: '초보자에게 맞는 업종은?', a: '운영 매뉴얼과 본사 교육이 갖춰진 테이크아웃 카페·베이커리·패스트푸드처럼 메뉴가 단순한 업종이 비교적 부담이 덜합니다.' }] },
  { key: 'kw:contract', title: '양도양수 계약 체크리스트 — 계약서에 꼭 넣을 7가지', kws: ['양도양수 계약', '양도양수 계약서', '매장 인수 계약', '양도양수 주의사항'], cover: 'img/og/kw-transfer.jpg',
    lead: '양도양수는 계약서에 무엇을 적느냐에 따라 인수 후 분쟁이 갈립니다. 꼭 넣어야 할 항목을 정리했습니다.',
    secs: [['계약서 필수 항목', ['1. 인수 대상: 시설·장비·집기·재고 목록(사진 첨부 권장)', '2. 창업비용과 지급 일정(계약금·중도금·잔금)', '3. 인수 시점과 인수인계 기간·범위(레시피·거래처·운영 노하우)', '4. 임대차 승계 조건과 건물주 동의', '5. 프랜차이즈 본사 양수 승인을 조건으로 하는 조항', '6. 인수 전 발생한 채무·세금·공과금 정산', '7. 같은 상권 경업 금지 조항']], ['잔금 전 확인', ['- 본사 승인 완료 여부', '- 임대차 계약서 명의 변경', '- 공과금·관리비 정산 영수증']]],
    faq: [{ q: '본사 승인이 안 나면 어떻게 되나요?', a: '계약서에 본사 양수 승인을 조건으로 넣어 두면, 승인이 나지 않을 경우 계약을 해제하고 계약금을 돌려받을 수 있도록 정할 수 있습니다.' }] },
  { key: 'kw:area', title: '상권 분석 체크리스트 — 매장 답사 때 직접 확인할 10가지', kws: ['상권 분석', '상권 분석 방법', '매장 답사', '창업 입지 선정'], cover: 'img/og/region.jpg',
    lead: '숫자 자료가 좋아 보여도 현장에서 확인할 것이 따로 있습니다. 답사 때 들고 가세요.',
    secs: [['답사 체크리스트', ['1. 평일 점심·저녁, 주말 시간대별 손님 수', '2. 손님 연령대와 테이크아웃·배달 비율', '3. 매장 앞 유동 인구 동선(횡단보도·지하철 출구 방향)', '4. 반경 300~500m 안 같은 업종·같은 브랜드 수', '5. 주변 대형 시설(오피스·학교·병원) 휴무일 영향', '6. 간판 가시성과 주차', '7. 시설·장비 노후 정도', '8. 건물 공실과 임대료 수준', '9. 배달 앱 리뷰 수와 평점 흐름', '10. 주변 개발·재건축 계획']]],
    faq: [{ q: '답사는 몇 번 가야 하나요?', a: '최소 평일 낮, 평일 저녁, 주말 세 번을 권합니다. 담당 창업전문가가 답사에 동행합니다.' }] },
  { key: 'kw:auto', title: '오토 운영 매장 창업 — 장점·주의점과 수익 계산법', kws: ['오토 창업', '풀오토 매장', '오토 운영 카페', '투잡 창업'], cover: 'img/og/pick-auto.jpg',
    lead: '점주가 매장에 상주하지 않고 직원 중심으로 운영하는 방식을 흔히 오토 운영이라고 부릅니다. 장점과 주의점을 정리했습니다.',
    secs: [['장점', ['- 본업과 병행 가능', '- 여러 매장 운영으로 확장 가능']], ['주의점', ['- 점주 인건비 대신 관리자·직원 인건비가 추가로 들어 월수익이 줄어듭니다', '- 직원 이탈 시 매장 운영이 흔들릴 수 있습니다', '- 정기 방문과 매출·재고 점검은 필수입니다']], ['수익 계산', ['창업가이드의 월수익은 점주 인건비를 뺀 금액이 아닙니다. 오토 운영이라면 표시 월수익에서 관리 인력 인건비를 추가로 빼고 계산하세요.']]],
    faq: [{ q: '오토 운영에 맞는 업종은?', a: '메뉴가 단순하고 운영 매뉴얼이 갖춰진 테이크아웃 카페·무인 매장 등이 비교적 적합합니다.' }] },
  { key: 'kw:sales-proof', title: '매출 자료 확인하는 법 — POS·카드 매출·부가세 신고 맞춰 보기', kws: ['매출 확인', '양도양수 매출 확인', '매장 매출 자료', '매장 매출 검증'], cover: 'img/og/listings.jpg',
    lead: '양도양수에서 가장 중요한 숫자는 매출입니다. 서로 다른 자료끼리 맞춰 보면 과장된 매출을 걸러낼 수 있습니다.',
    secs: [['맞춰 볼 자료 3가지', ['1. **POS 매출**: 일·월별 매출과 시간대별 판매', '2. **카드사 매출 내역**: 실제 입금 기준', '3. **부가세 신고 내역**: 세무서에 신고된 매출']], ['체크 포인트', ['- 세 자료의 월별 금액 흐름이 비슷한지', '- 최근 몇 달만 갑자기 오른 것은 아닌지', '- 배달 앱 매출과 수수료가 따로 정리되어 있는지', '- 계절에 따른 성수기·비수기 차이']]],
    faq: [{ q: '매출 자료는 언제 볼 수 있나요?', a: '현장 답사와 조건 협의 단계에서 양도인 동의를 받아 확인합니다. 담당 창업전문가가 자료 확인을 돕습니다.' }] },
  { key: 'kw:approval', title: '프랜차이즈 양수 승인 절차 — 운영 중 가맹점을 인수할 때', kws: ['프랜차이즈 양수', '가맹점 양도양수', '본사 양수 승인', '프랜차이즈 매장 인수'], cover: 'img/og/theme-franchise.jpg',
    lead: '운영 중인 가맹점을 인수하면 대부분 가맹본부의 양수 승인 절차를 거칩니다. 일반적인 흐름을 정리했습니다(세부 조건은 브랜드마다 다릅니다).',
    secs: [['일반적인 흐름', ['1. 양도인·양수인 조건 합의', '2. 가맹본부에 양수 신청(양수인 정보 제출)', '3. 본사 면담·교육', '4. 가맹계약 승계 또는 신규 체결', '5. 인수인계 후 영업']], ['미리 확인할 것', ['- 양수 승인 기간과 비용', '- 교육 일정과 이수 조건', '- 기존 가맹계약 잔여 기간과 갱신 조건', '- 리뉴얼(인테리어 교체) 요구 여부']]],
    faq: [{ q: '양수 승인에는 얼마나 걸리나요?', a: '브랜드마다 다르며 교육 일정에 따라 달라집니다. 담당 창업전문가가 해당 브랜드의 절차를 확인해 안내합니다.' }] },
];
function kwGuide() {
  const t = KW.find(k => !usedKeys.has(k.key)); if (!t) return null;
  let secs = t.secs, lead = t.lead, faq = t.faq || [], summary = [];
  if (t.data) { // 데이터형 키워드 글
    const arr = L.filter(t.data); if (!arr.length) { usedKeys.add(t.key); return kwGuide(); }
    const brands = top(arr, l => l.brand, 8), regs = top(arr, region, 6);
    lead = `"${t.kws[0]}"을 찾는 분들을 위해 창업가이드에 지금 공개된 매장 ${fmtNum(arr.length)}곳의 숫자를 정리했습니다.`;
    secs = [['지금 숫자로 보면', statTable(arr)], ['브랜드별 매장 수', brands.map(([b, n]) => { const sl = arr.find(l => l.brand === b)?.brandSlug; return `- ${sl ? `[${b}](/brand/${sl}/)` : b}: ${n}곳 · 평균 월수익 ${man(avg(arr.filter(l => l.brand === b), 'profit'))}`; })], ['창업비용 구간', budgetSpread(arr).map(([b, n]) => `- [창업비용 ${b.name}](/budget/${b.slug}/): ${n}곳`)], ['매장이 많은 지역', regs.map(([r, n]) => { const [sd, ...g] = r.split(' '); return `- [${r}](${regionLink(sd, g.join(' '))}): ${n}곳`; })], ['고를 때 볼 것', ['- 같은 브랜드라도 상권·면적에 따라 월수익 차이가 큽니다', '- 월수익은 세전이며 점주 인건비가 빠진 금액입니다', '- 최근 6개월 매출 자료와 임대차 조건을 함께 확인하세요']], ['최근 공개 매장', listingLines(arr)]];
    summary = [`공개 매장 ${fmtNum(arr.length)}곳 (${asOf})`, `평균 월매출 ${man(avg(arr, 'sales'))} · 평균 월수익 ${man(avg(arr, 'profit'))}`, `창업비용 중간값 ${won(med(arr, 'premium'))}`];
    faq = [{ q: `${t.kws[0]}에 드는 비용은?`, a: `창업가이드 공개 매장 기준 창업비용 중간값은 ${won(med(arr, 'premium'))}입니다(임대보증금 별도). 예산과 지역을 남겨 주시면 맞는 매장을 추려 드립니다.` }];
  }
  const body = [lead, '', ...secs.flatMap(([h, lines]) => [`## ${h}`, ...lines, '']), NOTE, '', CTA].join('\n');
  return { key: t.key, category: '프랜차이즈 창업 가이드', title: t.title, desc: `${lead.slice(0, 110)}`, keywords: t.kws, summary, faq, cover: coverFor(t.key.replace(':', '-'), t.cover), body };
}

// ---------- 3) 지역별 창업 가이드 ----------
function regionGuide() {
  const groups = Object.entries(L.reduce((m, l) => { const r = region(l); if (l.gugun) (m[r] ||= []).push(l); return m; }, {})).filter(([, a]) => a.length >= 3).sort((a, b) => b[1].length - a[1].length);
  const pick = groups.find(([r]) => !usedKeys.has(`region:${r}`)); if (!pick) return null;
  const [r, arr] = pick; const [sd, ...g] = r.split(' '); const gu = g.join(' '); const brands = top(arr, l => l.brand, 6);
  const body = [
    `"${r} 창업"을 검색하는 분들을 위해, 창업가이드에 지금 공개된 ${r} 매장 ${fmtNum(arr.length)}곳의 숫자를 정리했습니다.`, '',
    `## ${r} 창업 매장, 지금 숫자로 보면`, ...statTable(arr), '',
    `## 브랜드별 매장`, ...brands.map(([b, n]) => { const sub = arr.filter(l => l.brand === b); return `- ${b}: ${n}곳 · 평균 월매출 ${man(avg(sub, 'sales'))} · 평균 월수익 ${man(avg(sub, 'profit'))}`; }), '',
    `## 창업비용 구간`, ...budgetSpread(arr).map(([b, n]) => `- [창업비용 ${b.name}](/budget/${b.slug}/): ${n}곳`), '',
    `## ${r}에서 매장 고를 때`, '- 같은 지역 안에서도 역세권·오피스·주거 상권에 따라 시간대별 매출이 다릅니다', '- 정확한 위치는 양도인 보안을 위해 상담 후 안내합니다. 답사는 평일·주말을 나눠 가 보세요', '- 최근 6개월 매출 자료와 임대차 남은 기간을 함께 확인하세요', '',
    `## 최근 공개된 ${r} 매장`, ...listingLines(arr), `- [${r} 매장 전체 보기](${regionLink(sd, gu)})`, '', NOTE, '', CTA,
  ].join('\n');
  return { key: `region:${r}`, category: '지역별 창업 가이드', title: `${r} 창업 매장 ${fmtNum(arr.length)}곳 비교 — 월매출·월수익·창업비용 (${YEAR})`,
    desc: `${r} 양도양수 창업 매장 ${fmtNum(arr.length)}곳을 숫자로 비교했습니다. 평균 월매출 ${man(avg(arr, 'sales'))}, 평균 월수익 ${man(avg(arr, 'profit'))}, 창업비용 중간값 ${won(med(arr, 'premium'))}.`,
    keywords: [`${r} 창업`, `${gu} 창업`, `${gu} 카페 창업`, `${r} 양도양수`, `${gu} 매장 매매`, ...brands.slice(0, 2).map(([b]) => `${gu} ${b} 창업`)],
    summary: [`${r} 공개 매장 ${fmtNum(arr.length)}곳 (${asOf})`, `평균 월매출 ${man(avg(arr, 'sales'))} · 평균 월수익 ${man(avg(arr, 'profit'))}`, `많은 브랜드: ${brands.slice(0, 3).map(([b, n]) => `${b} ${n}곳`).join(', ')}`],
    faq: [{ q: `${r} 창업 매장은 몇 곳이 있나요?`, a: `${asOf} 창업가이드에 공개된 ${r} 매장은 ${fmtNum(arr.length)}곳입니다. 새 매장은 담당자가 확인 후 계속 등록됩니다.` }, { q: `${r} 매장의 정확한 위치를 알 수 있나요?`, a: '양도인 영업 보안을 위해 사이트에는 구·시까지만 공개하고, 상담 후 담당자가 정확한 위치를 안내하며 답사에 동행합니다.' }],
    cover: coverOf(arr, coverFor('region', 'img/og/region.jpg')), body };
}

// ---------- 발행 ----------
const MAKERS = [brandGuide, kwGuide, regionGuide];
const out = [];
const slots = [9, 13, 18]; // 발행 시각(KST)
for (let i = 0; i < COUNT; i++) {
  const start = SLOT != null ? Number(SLOT) + i : (existing.filter(p => p.generator === 'guide-v1').length + i);
  let post = null;
  for (let k = 0; k < MAKERS.length && !post; k++) post = MAKERS[(start + k) % MAKERS.length]();
  if (!post) { console.log('발행할 새 주제가 없습니다.'); break; }
  usedKeys.add(post.key);
  const hour = slots[(SLOT != null ? Number(SLOT) : i) % 3];
  const date = args.includes('--now') ? new Date(Date.now() + 9 * 3600e3 - i * 20 * 60e3).toISOString().slice(0, 19) + '+09:00' : `${DATE}T${String(hour).padStart(2, '0')}:${String(5 + i).padStart(2, '0')}:00+09:00`;
  const slug = `${DATE}-${post.key.replace(/[:/\s]+/g, '-').replace(/[^\w가-힣-]/g, '')}`.slice(0, 80);
  const doc = { slug, title: post.title, desc: post.desc, date, category: post.category, author: `${SITE.name} 편집팀`, keywords: post.keywords, cover: post.cover, summary: post.summary, faq: post.faq, body: post.body, status: 'published', generator: 'guide-v1', guideKey: post.key };
  fs.writeFileSync(path.join(DIR, `${slug}.json`), JSON.stringify(doc, null, 1)); out.push(slug);
  console.log('발행:', post.category, '|', post.title);
}
console.log(`${out.length}편 발행`);
