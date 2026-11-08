// 허브 페이지용 인라인 SVG 차트·표 (의존성 없음, 서버 렌더)
import { esc, u } from './html.mjs';
import { fmtWon, fmtMan } from './text.mjs';
import { BUDGETS } from '../data.mjs';

const PALETTE = ['#111111', '#FFCC00', '#E0282E', '#282864', '#1F5FBF', '#2E9E5B', '#8A8A8A', '#F28C28', '#6A4C93', '#C9C9C9'];
const n = v => (v || 0).toLocaleString('ko-KR');
export const avgOf = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.round(v.reduce((s, l) => s + l[k], 0) / v.length) : 0; };
const medOf = (arr, k) => { const v = arr.filter(l => l[k]).map(l => l[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
const minOf = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.min(...v.map(l => l[k])) : 0; };
const maxOf = (arr, k) => { const v = arr.filter(l => l[k]); return v.length ? Math.max(...v.map(l => l[k])) : 0; };

/** 집계: key 함수로 묶어 [name, items] 정렬 */
export function groupBy(items, fn) {
  const m = new Map();
  for (const l of items) { const k = fn(l); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** 패널 래퍼 */
export function vizPanel(title, body, { note = '', cls = '', wide = false } = {}) {
  return `<section class="viz ${cls} ${wide ? 'viz--wide' : ''}"><div class="viz__head"><h3 class="viz__title">${esc(title)}</h3>${note ? `<p class="viz__note">${esc(note)}</p>` : ''}</div>${body}</section>`;
}

/** 가로 막대 차트: rows = [{ label, value, href?, sub? }] */
export function hBars(rows, { unit = '건', max: mx, color = '#111', top = 10, valueFmt = n, labelW = 112 } = {}) {
  rows = rows.slice(0, top); if (!rows.length) return '<p class="viz__empty">집계할 매물이 없습니다.</p>';
  const m = mx || Math.max(...rows.map(r => r.value)) || 1;
  return `<ul class="hbars" style="--label-w:${labelW}px">${rows.map((r, i) => {
    const pct = Math.max(2, Math.round(r.value / m * 100));
    const lab = r.href ? `<a href="${r.href}">${esc(r.label)}</a>` : esc(r.label);
    return `<li class="hbars__row reveal" style="--d:${i * 40}ms"><span class="hbars__label" title="${esc(r.label)}">${lab}</span><span class="hbars__track"><span class="hbars__bar" style="width:${pct}%;background:${r.color || color}"></span></span><span class="hbars__val">${valueFmt(r.value)}${unit}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></li>`;
  }).join('')}</ul>`;
}

/** 세로 막대(히스토그램): rows = [{ label, value, href? }] */
export function vBars(rows, { unit = '건', height = 160, color = '#111', highlight = -1 } = {}) {
  if (!rows.length || !rows.some(r => r.value)) return '<p class="viz__empty">집계할 매물이 없습니다.</p>';
  const m = Math.max(...rows.map(r => r.value)) || 1;
  return `<div class="vbars" style="--h:${height}px">${rows.map((r, i) => {
    const h = Math.max(3, Math.round(r.value / m * 100));
    const inner = `<span class="vbars__val">${n(r.value)}${unit}</span><span class="vbars__col ${i === highlight ? 'is-hl' : ''}" style="height:${h}%;background:${i === highlight ? '#FFCC00' : color}"></span><span class="vbars__label">${esc(r.label)}</span>`;
    return r.href ? `<a class="vbars__item" href="${r.href}" aria-label="${esc(r.label)} ${n(r.value)}${unit}">${inner}</a>` : `<div class="vbars__item">${inner}</div>`;
  }).join('')}</div>`;
}

/** 도넛 차트: rows = [{ label, value, href? }] */
export function donut(rows, { top = 6, unit = '건', size = 150 } = {}) {
  const total = rows.reduce((s, r) => s + r.value, 0); if (!total) return '<p class="viz__empty">집계할 매물이 없습니다.</p>';
  const head = rows.slice(0, top); const rest = rows.slice(top).reduce((s, r) => s + r.value, 0);
  const segs = rest ? [...head, { label: '기타', value: rest }] : head;
  const r = 60, c = 2 * Math.PI * r; let off = 0;
  const circles = segs.map((s, i) => { const len = s.value / total * c; const el = `<circle r="${r}" cx="80" cy="80" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="26" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"><title>${esc(s.label)} ${n(s.value)}${unit} (${Math.round(s.value / total * 100)}%)</title></circle>`; off += len; return el; }).join('');
  return `<div class="donut"><svg viewBox="0 0 160 160" width="${size}" height="${size}" role="img" aria-label="${esc(segs.map(s => `${s.label} ${s.value}${unit}`).join(', '))}">${circles}<text x="80" y="76" text-anchor="middle" class="donut__num">${n(total)}</text><text x="80" y="96" text-anchor="middle" class="donut__unit">${unit} 전체</text></svg>
    <ol class="donut__legend">${segs.map((s, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i>${s.href ? `<a href="${s.href}">${esc(s.label)}</a>` : esc(s.label)}<b>${Math.round(s.value / total * 100)}%</b><small>${n(s.value)}${unit}</small></li>`).join('')}</ol></div>`;
}

/** 범위 막대: 최소·평균·최대 (월매출/월수익/권리금) */
export function rangeBars(items) {
  const rows = [
    { k: 'sales', label: '월매출', fmt: fmtMan, color: '#111' },
    { k: 'profit', label: '월수익(세전)', fmt: fmtMan, color: '#E0282E' },
    { k: 'premium', label: '권리금', fmt: fmtWon, color: '#282864' },
  ].map(r => ({ ...r, min: minOf(items, r.k), avg: avgOf(items, r.k), med: medOf(items, r.k), max: maxOf(items, r.k), cnt: items.filter(l => l[r.k]).length })).filter(r => r.cnt);
  if (!rows.length) return '<p class="viz__empty">집계할 매물이 없습니다.</p>';
  return `<div class="ranges">${rows.map(r => {
    const span = r.max - r.min || 1; const p = v => Math.round((v - r.min) / span * 100);
    return `<div class="range"><div class="range__head"><strong>${r.label}</strong><small>${r.cnt}건 기준</small></div>
      <div class="range__track"><span class="range__fill" style="left:0;right:0;background:${r.color}22"></span><span class="range__avg" style="left:${p(r.avg)}%;background:${r.color}" title="평균 ${esc(r.fmt(r.avg))}"></span><span class="range__med" style="left:${p(r.med)}%" title="중앙값 ${esc(r.fmt(r.med))}"></span></div>
      <div class="range__labels"><span>최소 <b>${esc(r.fmt(r.min))}</b></span><span>평균 <b style="color:${r.color}">${esc(r.fmt(r.avg))}</b> · 중앙값 ${esc(r.fmt(r.med))}</span><span>최대 <b>${esc(r.fmt(r.max))}</b></span></div></div>`;
  }).join('')}</div>`;
}

/** 권리금 구간 분포 (예산 허브 기준과 동일 구간) */
export function premiumHistogram(items, { highlight = '', linkBase = '/budget/' } = {}) {
  const rows = BUDGETS.map(b => ({ label: b.name.replace(' 이상 ~ ', '~').replace(' 미만', ''), value: items.filter(l => l.premium && l.premium >= b.min && l.premium < b.max).length, href: u(`${linkBase}${b.slug}/`) }));
  const none = items.filter(l => !l.premium).length;
  return vBars(rows, { highlight: BUDGETS.findIndex(b => b.slug === highlight) }) + (none ? `<p class="viz__foot">권리금 협의 ${none}건은 분포에서 제외</p>` : '');
}

/** 월수익 구간 분포 */
export function profitHistogram(items) {
  const bins = [[0, 300, '300만 미만'], [300, 500, '300~500만'], [500, 800, '500~800만'], [800, 1200, '800~1,200만'], [1200, 2000, '1,200~2,000만'], [2000, Infinity, '2,000만 이상']];
  return vBars(bins.map(([a, b, label]) => ({ label, value: items.filter(l => l.profit && l.profit >= a && l.profit < b).length })), { color: '#E0282E' });
}

/** 데이터 표: cols = [{ key, label, align?, fmt? }], rows = objects */
export function dataTable(cols, rows, { caption = '', cls = '' } = {}) {
  if (!rows.length) return '<p class="viz__empty">집계할 매물이 없습니다.</p>';
  return `<div class="tbl-wrap"><table class="tbl ${cls}">${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${cols.map(c => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c => { const v = c.fmt ? c.fmt(r[c.key], r) : r[c.key]; return `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${v == null || v === '' ? '-' : v}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/** 공통: 그룹 요약 표 행 생성 (이름, 건수, 평균 월매출, 평균 월수익, 최저 권리금) */
export function summaryRows(groups, hrefOf) {
  return groups.map(([name, arr]) => ({ name, href: hrefOf ? hrefOf(name, arr) : '', n: arr.length, sales: avgOf(arr, 'sales'), profit: avgOf(arr, 'profit'), premium: minOf(arr, 'premium'), ratio: avgOf(arr, 'sales') ? Math.round(avgOf(arr, 'profit') / avgOf(arr, 'sales') * 100) : 0 }));
}
export const SUMMARY_COLS = [
  { key: 'name', label: '구분', fmt: (v, r) => r.href ? `<a href="${r.href}">${esc(v)}</a>` : esc(v) },
  { key: 'n', label: '매물', align: 'right', fmt: v => `${n(v)}건` },
  { key: 'sales', label: '평균 월매출', align: 'right', fmt: v => v ? esc(fmtMan(v)) : '-' },
  { key: 'profit', label: '평균 월수익', align: 'right', fmt: v => v ? `<span class="hot">${esc(fmtMan(v))}</span>` : '-' },
  { key: 'ratio', label: '수익률', align: 'right', fmt: v => v ? `${v}%` : '-' },
  { key: 'premium', label: '최저 권리금', align: 'right', fmt: v => v ? `<span class="cool">${esc(fmtWon(v))}</span>` : '협의' },
];

/** 스파크 막대(인라인, 표 셀용) */
export function spark(v, max, color = '#111') { return `<span class="spark"><i style="width:${Math.max(2, Math.round(v / (max || 1) * 100))}%;background:${color}"></i></span>`; }

export { minOf, maxOf, medOf };
