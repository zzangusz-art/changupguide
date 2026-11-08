// 대한민국 시도 지도 (인라인 SVG) — 지역별 허브
import { KOREA_MAP } from '../data/korea-map.mjs';
import { SIDO_ORDER, SIDO_FULL } from '../data.mjs';
import { esc, u } from './html.mjs';

/**
 * @param counts  { 서울: n, 경기: n, ... }
 * @param opts    active: 강조할 시도, links: 시도별 링크 함수, compact: 라벨 축소
 */
export function koreaMap(counts, { active = '', links = s => u(`/region/${encodeURIComponent(s)}/`), compact = false, id = 'kmap' } = {}) {
  const { width, height, paths, labels } = KOREA_MAP;
  const max = Math.max(1, ...Object.values(counts));
  const order = [...SIDO_ORDER].sort((a, b) => (a === active) - (b === active)); // 강조 시도를 마지막에 그려 테두리가 위로
  const shapes = order.map(s => {
    const c = counts[s] || 0; const has = c > 0; const lvl = has ? Math.min(4, 1 + Math.floor(c / max * 3.99)) : 0;
    const inner = `<path d="${paths[s]}" class="kmap__sido ${has ? `is-has lvl-${lvl}` : ''} ${s === active ? 'is-active' : ''}" data-sido="${esc(s)}"><title>${esc(SIDO_FULL[s] || s)} ${c ? `${c}건` : '등록 준비 중'}</title></path>`;
    return has ? `<a href="${links(s)}" aria-label="${esc(SIDO_FULL[s] || s)} 창업 매물 ${c}건">${inner}</a>` : inner;
  }).join('');
  const texts = SIDO_ORDER.map(s => {
    const [x, y] = labels[s]; const c = counts[s] || 0; const has = c > 0;
    if (compact && !has) return '';
    return `<g class="kmap__label ${has ? 'is-has' : ''} ${s === active ? 'is-active' : ''}" transform="translate(${x} ${y})" pointer-events="none"><text class="kmap__name" text-anchor="middle">${esc(s)}</text>${has ? `<text class="kmap__count" text-anchor="middle" y="15">${c}건</text>` : ''}</g>`;
  }).join('');
  return `<figure class="kmap ${compact ? 'kmap--compact' : ''}" id="${id}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="대한민국 시도별 창업 매물 지도" xmlns="http://www.w3.org/2000/svg">${shapes}${texts}</svg>
    ${compact ? '' : `<figcaption class="kmap__legend"><span><i class="lvl-0"></i>등록 준비</span><span><i class="lvl-1"></i>소수</span><span><i class="lvl-3"></i>다수</span><span><i class="lvl-4"></i>집중</span></figcaption>`}</figure>`;
}
