// 대한민국 시도 지도 (인라인 SVG). focus: 'capital' 이면 수도권을 확대해 보여준다
import { KOREA_MAP } from '../data/korea-map.mjs';
import { SIDO_ORDER, SIDO_FULL } from '../data.mjs';
import { esc, u } from './html.mjs';

const CAPITAL = ['서울', '경기', '인천'];

export function koreaMap(counts, { active = '', links = s => u(`/region/${encodeURIComponent(s)}/`), compact = false, focus = '', id = 'kmap' } = {}) {
  const { width, height, paths, labels, capital } = KOREA_MAP;
  const vb = focus === 'capital' ? capital : [0, 0, width, height];
  const k = focus === 'capital' ? (vb[2] / width) * 1.3 : 1;
  const max = Math.max(1, ...Object.values(counts));
  const order = [...SIDO_ORDER].sort((a, b) => (a === active) - (b === active));
  const shapes = order.map(s => {
    const c = counts[s] || 0; const has = c > 0; const lvl = has ? Math.min(4, 1 + Math.floor(c / max * 3.99)) : 0;
    const inner = `<path d="${paths[s]}" class="kmap__sido ${has ? `is-has lvl-${lvl}` : ''} ${s === active ? 'is-active' : ''}" data-sido="${esc(s)}"><title>${esc(SIDO_FULL[s] || s)} ${c ? `${c}건` : '등록 준비 중'}</title></path>`;
    return has ? `<a href="${links(s)}" aria-label="${esc(SIDO_FULL[s] || s)} 창업 매장 ${c}건">${inner}</a>` : inner;
  }).join('');
  const names = focus === 'capital' ? CAPITAL : SIDO_ORDER;
  const fs = (20 * k).toFixed(1); const fc = (17 * k).toFixed(1); const stroke = (4 * k).toFixed(1);
  const texts = names.map(s => {
    const [x, y] = labels[s]; const c = counts[s] || 0; const has = c > 0;
    if (compact && !has) return '';
    return `<g class="kmap__label ${has ? 'is-has' : ''} ${s === active ? 'is-active' : ''}" transform="translate(${x} ${y})" pointer-events="none" style="stroke-width:${stroke}"><text class="kmap__name" text-anchor="middle" style="font-size:${fs}px">${esc(s)}</text>${has ? `<text class="kmap__count" text-anchor="middle" y="${(20 * k).toFixed(1)}" style="font-size:${fc}px">${c.toLocaleString('ko-KR')}건</text>` : ''}</g>`;
  }).join('');
  return `<figure class="kmap ${compact ? 'kmap--compact' : ''} ${focus ? 'kmap--focus' : ''}" id="${id}"><svg viewBox="${vb.join(' ')}" role="img" aria-label="${focus ? '수도권' : '대한민국'} 시도별 창업 매장 지도" xmlns="http://www.w3.org/2000/svg">${shapes}${texts}</svg>
    ${compact ? '' : `<figcaption class="kmap__legend"><span><i class="lvl-0"></i>등록 준비</span><span><i class="lvl-1"></i>소수</span><span><i class="lvl-3"></i>다수</span><span><i class="lvl-4"></i>집중</span></figcaption>`}</figure>`;
}
