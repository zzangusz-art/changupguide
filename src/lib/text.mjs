// 공용 텍스트 유틸 — 빌더(Node)·관리자(브라우저)·검색(브라우저)·블로그 생성기가 같은 코드를 씁니다.
// 외부 의존성 없음. Node import도 없음(브라우저에서 그대로 로드).
import { BRANDS, CATEGORIES, THEMES, BUDGETS, SIDO_ORDER } from '../data.mjs';

// 제목·검색어 비교용 정규화: 소문자, 전각→반각, 공백·기호 제거
export function normalize(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s ​]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

// 표기 동의어 (정규화 후 치환)
const SYN = [
  ['베스킨', '배스킨'], ['파리바게트', '파리바게뜨'], ['메가mgc커피', '메가커피'], ['메가엠지씨커피', '메가커피'], ['megacoffee', '메가커피'],
  ['베이커리', '베이커리'], ['휘트니스', '피트니스'], ['핸드폰', '휴대폰'], ['피씨방', 'pc방'], ['피시방', 'pc방'],
  ['롯데리아창업', '롯데리아'], ['투썸플레이스', '투썸'],
];
export function canon(s) {
  let n = normalize(s);
  for (const [a, b] of SYN) n = n.split(a).join(b);
  return n;
}

const VENUE = new Set(['cgv','lotte-cinema','megabox','starfield','costco','homeplus','emart','lotte-mart']);
const GENERIC = new Set(['airbnb','claw-machine','conveyor-sushi','grilled-fish','lamb-skewer','shabu','sundae-guk','bossam','futsal','gosiwon','pension','butcher','banchan','kkwabaegi','bungeoppang','waffle','hotteok','sandwich','bagel','macaron','cake','bingsu','juice','milk-tea','noodle','jjimdak','dakgalbi','samgyetang','budae-jjigae','gamjatang','haejangguk','naengmyeon','tteokgalbi','jjukkumi','nakji','clam','pocha','wine-bar','cocktail-bar','pub','noraebang','arcade','bowling','pingpong','swimming','golf-range','boxing','taekwondo','academy','daycare','dry-cleaner','print-shop','realty','pharmacy','clinic','oriental-clinic','dental','pet-shop','stationery','bookstore','photo-studio','auto','gas-station','hardware','clothing','shoes','bag-shop','accessory','cosmetics','health-food','mart','fruit-shop','water-purifier','kiosk','coin-laundry','self-laundry','study-cafe','coin-noraebang','pc-bang','kids-cafe','pilates','yoga','gym','nail','skin-care','hair-salon','screen-golf','screen-baseball','billiards','escape-room','phone-store','optical','convenience-store','flower-shop','unmanned','laundry','car-wash','jokbal','gopchang','meat-restaurant','sashimi','tonkatsu','udon','pho','malatang','chinese','japanese','bunsik','gukbap','chicken','hof','bakery','cafe','ice-cream','dessert','dosirak','salad','burger','pizza','toast','juk','delivery']);

// 브랜드 사전 전개: [{name, slug, generic, keys:[정규화된 동의어...]}] — 긴 키부터 매칭
const BRAND_INDEX = (() => {
  const bySlug = new Map();
  for (const row of BRANDS) {
    const [name, slug, ...syn] = row;
    const cur = bySlug.get(slug) || { name, slug, generic: GENERIC.has(slug), venue: VENUE.has(slug), keys: [] };
    cur.keys.push(...[name, ...syn].map(canon).filter(k => k.length >= 2));
    bySlug.set(slug, cur);
  }
  return [...bySlug.values()].map(b => ({ ...b, keys: [...new Set(b.keys)].sort((a, c) => c.length - a.length) }));
})();
export const BRAND_LIST = BRAND_INDEX.filter(b => !b.generic).map(b => ({ name: b.name, slug: b.slug }));
export function brandBySlug(slug) { const b = BRAND_INDEX.find(x => x.slug === slug); return b ? { name: b.name, slug: b.slug, generic: b.generic } : null; }
export function brandByName(name) { const n = canon(name); const b = BRAND_INDEX.find(x => x.keys.includes(n) || canon(x.name) === n); return b ? { name: b.name, slug: b.slug, generic: b.generic } : null; }

// 문자열에서 브랜드 찾기 (긴 키 우선, 매칭 구간 소비). 반환: [{name, slug, generic}] 등장 순
export function findBrands(text) {
  let s = canon(text); const found = [];
  const all = BRAND_INDEX.flatMap(b => b.keys.map(k => ({ k, b }))).sort((a, b) => b.k.length - a.k.length);
  for (const { k, b } of all) {
    let idx;
    while ((idx = s.indexOf(k)) !== -1) {
      if (!found.some(f => f.slug === b.slug)) found.push({ name: b.name, slug: b.slug, generic: b.generic, venue: b.venue, pos: idx });
      s = s.slice(0, idx) + '\u0001'.repeat(k.length) + s.slice(idx + k.length);
    }
  }
  return found.sort((a, b) => a.pos - b.pos).map(({ pos, ...r }) => r);
}
// 대표 브랜드 1개: 프랜차이즈 브랜드 우선, 없으면 일반 업종어
export function primaryBrand(text) {
  const f = findBrands(text);
  return f.find(b => !b.generic && !b.venue) || f.find(b => b.venue) || f[0] || null;
}

// ---------- 지역 ----------
export const GUGUN = {
  서울: ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
  경기: ['수원시','성남시','고양시','용인시','부천시','안산시','안양시','남양주시','화성시','평택시','의정부시','시흥시','파주시','김포시','광명시','광주시','군포시','오산시','이천시','양주시','구리시','안성시','포천시','의왕시','하남시','여주시','동두천시','과천시','양평군','가평군','연천군'],
  인천: ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'],
  부산: ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
  대구: ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'],
  대전: ['동구','중구','서구','유성구','대덕구'],
  광주: ['동구','서구','남구','북구','광산구'],
  울산: ['중구','남구','동구','북구','울주군'],
  세종: ['세종시'],
  강원: ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시'],
  충북: ['청주시','충주시','제천시'],
  충남: ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시'],
  전북: ['전주시','군산시','익산시','정읍시','남원시','김제시'],
  전남: ['목포시','여수시','순천시','나주시','광양시'],
  경북: ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시'],
  경남: ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시'],
  제주: ['제주시','서귀포시'],
};
const SIDO_SYN = { 서울: ['서울특별시','서울시','서울'], 경기: ['경기도','경기'], 인천: ['인천광역시','인천시','인천'], 부산: ['부산광역시','부산시','부산'], 대구: ['대구광역시','대구'], 대전: ['대전광역시','대전'], 광주: ['광주광역시','광주'], 울산: ['울산광역시','울산'], 세종: ['세종특별자치시','세종시','세종'], 강원: ['강원특별자치도','강원도','강원'], 충북: ['충청북도','충북'], 충남: ['충청남도','충남'], 전북: ['전북특별자치도','전라북도','전북'], 전남: ['전라남도','전남'], 경북: ['경상북도','경북'], 경남: ['경상남도','경남'], 제주: ['제주특별자치도','제주도','제주'] };
// 지역 키 목록: [{key(정규화), sido, gugun}] 긴 것 우선
const REGION_KEYS = (() => {
  const out = [];
  for (const sido of SIDO_ORDER) {
    for (const g of GUGUN[sido] || []) {
      out.push({ key: canon(g), sido, gugun: g });
      const short = g.replace(/(구|시|군)$/, '');
      // 두 글자 이상이면 접미사 없는 표기도 허용 (강남, 수원, 미추홀). '중'·'서'·'동'·'남'·'북'처럼 한 글자는 제외
      if (short.length >= 2 && !['광주'].includes(short)) out.push({ key: canon(short), sido, gugun: g, loose: true });
    }
    for (const s of SIDO_SYN[sido] || []) out.push({ key: canon(s), sido, gugun: null });
  }
  return out.sort((a, b) => b.key.length - a.key.length);
})();
// 동명 구(중구·서구 등)는 시도 정보가 없으면 첫 번째(서울 우선)로 해석됨 — 검색 결과에서는 gugun 이름만으로 매칭하므로 문제 없음
export function findRegions(text) {
  let s = canon(text); const found = [];
  for (const r of REGION_KEYS) {
    let idx;
    while ((idx = s.indexOf(r.key)) !== -1) {
      if (!found.some(f => f.sido === r.sido && f.gugun === r.gugun)) found.push({ sido: r.sido, gugun: r.gugun, pos: idx, loose: !!r.loose });
      s = s.slice(0, idx) + '\u0001'.repeat(r.key.length) + s.slice(idx + r.key.length);
    }
  }
  const gj = found.find(f => f.sido === '광주' && !f.gugun);
  if (gj && found.some(f => f.sido === '경기')) { gj.sido = '경기'; gj.gugun = '광주시'; }
  return found.sort((a, b) => a.pos - b.pos);
}

// ---------- 금액 ----------
export function fmtNum(n) { return n == null ? '' : Number(n).toLocaleString('ko-KR'); }
// 만원 단위 정수 → '1억5천만원' / '7천5백만원' / '1,050만원' / '2억원'
export function fmtWon(man, { unit = true } = {}) {
  if (man == null || isNaN(man)) return '';
  man = Math.round(man);
  if (man === 0) return '0원';
  const eok = Math.floor(man / 10000); const rest = man % 10000;
  let s = '';
  if (eok) s += `${fmtNum(eok)}억`;
  if (rest) {
    const cheon = Math.floor(rest / 1000); const baek = Math.floor((rest % 1000) / 100); const r2 = rest % 100;
    if (r2 === 0 && cheon) { s += `${cheon}천`; if (baek) s += `${baek}백`; }
    else s += `${fmtNum(rest)}`;
    s += '만';
  }
  return s + (unit ? '원' : '');
}
// 만원 → '3,500만원' (월매출/월수익 표기 — 억 단위도 만원으로 유지, 예시 "월매출 3500만원")
export function fmtMan(man) { if (man == null) return ''; return man >= 10000 ? fmtWon(man) : `${fmtNum(man)}만원`; }
// 문자열 → 만원 정수 ('1억5천', '7천5백만원', '1,795 만원', '3억', '15000')
export function parseWon(str) {
  if (str == null) return null;
  if (typeof str === 'number') return str;
  let s = String(str).replace(/[,\s]/g, '');
  if (!s || /문의|협의/.test(s)) return null;
  let total = 0, found = false, m;
  if ((m = s.match(/(\d+(?:\.\d+)?)억/))) { total += Math.round(parseFloat(m[1]) * 10000); found = true; s = s.slice(m.index + m[0].length); }
  if ((m = s.match(/(\d+)천/))) { total += parseInt(m[1]) * 1000; found = true; s = s.slice(m.index + m[0].length); }
  if ((m = s.match(/(\d+)백/))) { total += parseInt(m[1]) * 100; found = true; s = s.slice(m.index + m[0].length); }
  if ((m = s.match(/(\d+)/))) { total += parseInt(m[1]); found = true; }
  return found ? total : null;
}
export function budgetOf(premium) {
  if (premium == null) return null;
  return BUDGETS.find(b => premium >= b.min && premium < b.max) || null;
}

// ---------- 자동 제목 ----------
// 요청 형식: "인천 미추홀구 메가커피 월매출 3500만원 수익 900만원" + 예산(권리금)
export function makeTitle(l) {
  const parts = [];
  if (l.sido) parts.push(l.sido);
  if (l.gugun) parts.push(l.gugun);
  const brand = l.brand || l.kindLabel || (l.kind2 ? l.kind2.split('/')[0] : '') || l.kind1 || '';
  if (brand) parts.push(brand);
  if (l.sales) parts.push(`월매출 ${fmtMan(l.sales)}`);
  if (l.profit) parts.push(`수익 ${fmtMan(l.profit)}`);
  parts.push(l.premium ? `권리금 ${fmtWon(l.premium)}` : '권리금 협의');
  return parts.join(' ');
}
export function makeSeoTitle(l) {
  const t = l.titleManual && l.title ? l.title : makeTitle(l);
  return `${t} | 창업가이드 양도양수 매장 No.${l.id}`;
}
export function makeDesc(l) {
  const loc = [l.sido, l.gugun].filter(Boolean).join(' ');
  const b = l.brand || l.kindLabel || l.kind2 || l.kind1 || '매장';
  const bits = [];
  if (l.sales) bits.push(`월매출 ${fmtMan(l.sales)}`);
  if (l.profit) bits.push(`월수익(세전) ${fmtMan(l.profit)}`);
  bits.push(l.premium ? `권리금 ${fmtWon(l.premium)}` : '권리금 협의');
  if (l.areaM2) bits.push(`면적 ${l.areaM2}㎡`);
  return `${loc} ${b} 양도양수 창업 매장. ${bits.join(', ')}. 담당 창업전문가 ${l.agentName || ''}에게 바로 전화 연결. 임대보증금 별도, 정확한 위치는 상담 후 안내.`;
}

// 제목에서 셀링포인트 태그 추출 → 스티커 배지
const TAG_RULES = [
  ['풀오토', /풀오토|완전오토|full\s*auto/i], ['오토운영', /오토운영|오토매장|반오토|자동운영/], ['급매', /급매|급처|급하게/], ['특급', /특급|특A|BEST|베스트/i],
  ['역세권', /역세권|역앞|역인근|역근처|초역세권|더블역세권/], ['배달', /배달/], ['주5일', /주5일|주 5일/], ['신규오픈', /신규오픈|신규매장|오픈1년|신축/],
  ['리뉴얼', /리뉴얼|리모델링|인테리어완료/], ['1군상권', /1군|A급|특A급|핵심상권|메인상권/], ['주차완비', /주차/], ['대기업', /대기업/],
  ['초보추천', /초보|처음/], ['여성추천', /여성/], ['시니어추천', /시니어|은퇴|노후/], ['소자본', /소자본|저렴|소액/], ['고수익', /고수익|순익|순수익|실수익/],
  ['투잡', /투잡|부업|투자/], ['신도시', /신도시|택지/], ['대학가', /대학가|대학교|캠퍼스/], ['병원', /병원|의료/], ['몰·마트', /마트|몰|아울렛|백화점/],
];
export function extractTags(titleRaw, extra = '') {
  const s = `${titleRaw || ''} ${extra || ''}`;
  return TAG_RULES.filter(([, re]) => re.test(s)).map(([t]) => t).slice(0, 6);
}

// 기존 사이트 제목의 장식 기호 제거 → 담당자 한줄 코멘트
export function cleanRawTitle(t) {
  return String(t || '')
    .replace(/[♥★☆◈◆■□●○◎▶▷►▼▲△▽〓※＊*☎✔✓♣♠♦◇◐◑▣▤▥▦▧▨▩★⊙ⓒⓡ※]+/g, ' ')
    .replace(/[【】\[\]《》〈〉「」『』]/g, ' ')
    .replace(/→|⇒|➡|▷/g, ' ')
    .replace(/[／/]+/g, ' / ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' · ')
    .replace(/^[\s·]+|[\s·]+$/g, '')
    .trim();
}

export function slugify(s) {
  return String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}

// ---------- 검색 ----------
// 질의 해석: "인천 메가커피" / "인천메가커피" / "강남 카페 1억" → {regions, brands, budgetMax, terms}
export function parseQuery(q) {
  const raw = String(q || '').trim();
  const regions = findRegions(raw);
  const brands = findBrands(raw);
  let budgetMax = null, budgetMin = null;
  const bm = raw.replace(/\s/g, '').match(/(\d+(?:\.\d+)?억(?:\d+천)?(?:\d+백)?만?원?|\d+천만?원?|\d{3,6}만원?)(이하|미만|이내|아래|까지|대|이상|초과|부터)?/);
  if (bm) {
    const v = parseWon(bm[1]);
    if (v) { if (/이상|초과|부터/.test(bm[2] || '')) budgetMin = v; else if (bm[2] === '대') { budgetMin = v; budgetMax = v * 2; } else budgetMax = v; }
  }
  // 소비된 구간 제거 후 남은 단어
  let rest = canon(raw);
  for (const r of regions) { const keys = REGION_KEYS.filter(k => k.sido === r.sido && k.gugun === r.gugun).map(k => k.key); for (const k of keys) rest = rest.split(k).join(' '); }
  for (const b of brands) { const bi = BRAND_INDEX.find(x => x.slug === b.slug); for (const k of bi.keys) rest = rest.split(k).join(' '); }
  if (bm) rest = rest.split(canon(bm[0])).join(' ');
  const terms = rest.split(/\s+/).map(t => t.trim()).filter(t => t.length >= 2);
  return { raw, regions, brands, budgetMin, budgetMax, terms };
}

// 매장 검색 인덱스 1건 (빌더가 search-index.json으로 저장)
export function indexEntry(l) {
  return {
    id: l.id, t: l.title, r: l.titleRaw ? cleanRawTitle(l.titleRaw) : '', s: l.sido || '', g: l.gugun || '', b: l.brand || '', bs: l.brandSlug || '',
    k1: l.kind1 || '', k2: l.kind2 || '', th: l.theme || '', sales: l.sales ?? null, profit: l.profit ?? null, premium: l.premium ?? null, cost: l.monthlyCost ?? null,
    area: l.areaM2 ?? null, img: l.images && l.images[0] ? l.images[0] : '', ph: l.noPhoto ? 0 : 1, tags: l.tags || [], a: l.agentName || '', ai: l.agentId || '', ap: l.agentPhone || '', d: l.updatedAt || l.createdAt || '',
    x: canon([l.sido, l.gugun, l.brand, l.kind1, l.kind2, l.title, l.titleRaw, l.theme, (l.tags || []).join(' '), l.agentName].join(' ')),
  };
}

// 인덱스 검색: AND 매칭 + 인식된 엔티티 우선 정렬
export function searchIndex(index, q, opts = {}) {
  const p = parseQuery(q);
  const { sido, gugun, brandSlug, code, kind, theme, budget, sort = 'recent', minProfit } = opts;
  let out = index.filter(e => {
    if (p.regions.length) {
      const sidos = p.regions.filter(r => !r.gugun).map(r => r.sido);
      const guguns = p.regions.filter(r => r.gugun);
      if (guguns.length) { if (!guguns.some(r => e.g === r.gugun)) return false; if (sidos.length && !sidos.includes(e.s)) return false; }
      else if (!sidos.includes(e.s)) return false;
    }
    if (p.brands.length && !p.brands.some(b => b.generic ? e.x.includes(canon(b.name)) || e.k1.includes(b.name) || e.k2.includes(b.name) : e.bs === b.slug)) return false;
    if (p.budgetMax != null && !(e.premium != null && e.premium <= p.budgetMax)) return false;
    if (p.budgetMin != null && !(e.premium != null && e.premium >= p.budgetMin)) return false;
    for (const t of p.terms) if (!e.x.includes(t)) return false;
    if (sido && e.s !== sido) return false;
    if (gugun && e.g !== gugun) return false;
    if (brandSlug && e.bs !== brandSlug) return false;
    if (code && !String(e.k1).length) return false;
    if (code) { const c = CATEGORIES.find(c => c.code === Number(code)); if (c && e.k1 !== c.name) return false; }
    if (kind) { const k = CATEGORIES.flatMap(c => c.kinds).find(k => k[0] === Number(kind)); if (k && e.k2 !== k[1]) return false; }
    if (theme && e.th !== theme) return false;
    if (budget) { const b = BUDGETS.find(b => b.slug === budget); if (b && !(e.premium != null && e.premium >= b.min && e.premium < b.max)) return false; }
    if (minProfit && !(e.profit != null && e.profit >= minProfit)) return false;
    return true;
  });
  const score = e => (p.brands.some(b => e.bs === b.slug) ? 4 : 0) + (p.regions.some(r => r.gugun && e.g === r.gugun) ? 3 : 0) + (p.regions.some(r => e.s === r.sido) ? 1 : 0) + (e.img ? 0.5 : 0);
  if (sort === 'recent') out.sort((a, b) => score(b) - score(a) || String(b.d).localeCompare(String(a.d)) || Number(b.id) - Number(a.id));
  else if (sort === 'profit') out.sort((a, b) => (b.profit || 0) - (a.profit || 0));
  else if (sort === 'sales') out.sort((a, b) => (b.sales || 0) - (a.sales || 0));
  else if (sort === 'premium-asc') out.sort((a, b) => (a.premium ?? 1e12) - (b.premium ?? 1e12));
  else if (sort === 'premium-desc') out.sort((a, b) => (b.premium || 0) - (a.premium || 0));
  return { parsed: p, results: [...out.filter(e => e.ph !== 0), ...out.filter(e => e.ph === 0)] };
}

export function paybackMonths(l) { return l.premium > 0 && l.profit > 0 ? l.premium / l.profit : null; }

export function themeBySlug(slug) { return THEMES.find(t => t.slug === slug); }
export function themeByName(name) { return THEMES.find(t => t.name === name || t.name.replace('창업', '') === String(name || '').replace('창업', '')); }
export function kindLabel(code) { for (const c of CATEGORIES) for (const k of c.kinds) if (k[0] === Number(code)) return k[1]; return ''; }
export function categoryOfKind(name) { for (const c of CATEGORIES) if (c.kinds.some(k => k[1] === name)) return c; return null; }

export function phoneTel(p) { const d = String(p || '').replace(/[^\d]/g, ''); return d.startsWith('0') ? '+82-' + d.slice(1).replace(/(\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3') : d; }
export function phoneDigits(p) { return String(p || '').replace(/[^\d]/g, ''); }
export function fmtDate(d) { const x = new Date(d); if (isNaN(x)) return ''; return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`; }
export function isoDate(d = new Date()) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
