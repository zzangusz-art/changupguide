// HTML 레이아웃·컴포넌트·SEO 헤더 — 모든 페이지가 이 파일의 layout()을 거칩니다.
import { SITE, SEO, CATEGORIES, THEMES, BUDGETS, FAQ, SIDO_ORDER, POPULAR_BRANDS } from '../data.mjs';
import { fmtWon, fmtMan, phoneTel, slugify, paybackMonths } from './text.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const u = p => (SITE.base + p).replace(/\/{2,}/g, '/');          // 사이트 내부 경로(미리보기 하위 경로 지원)
export const abs = p => SITE.url.replace(/\/$/, '') + u(p);             // canonical·OG·sitemap용 절대 URL
export const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

export const ICONS = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.8 2.1z"/></svg>',
  sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9.3C1 7.5 3.6 4 7.3 4c2 0 3.4 1 4.7 2.6C13.3 5 14.7 4 16.7 4c3.7 0 6.3 3.5 4.8 7.7C19.5 16.4 12 21 12 21z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h8l-1 8 10-12h-8z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  kakao: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5L5.5 21l4.3-2.8c.7.1 1.4.2 2.2.2 5.5 0 10-3.5 10-7.6S17.5 3 12 3z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};

// 업종 일러스트 (스티커용 SVG)
export const ILLO = {
  cup: '<svg viewBox="0 0 120 120"><path d="M28 30h58l-6 62a10 10 0 0 1-10 9H44a10 10 0 0 1-10-9z" fill="#fff" stroke="#14121F" stroke-width="5"/><path d="M34 46h46" stroke="#FFCC00" stroke-width="10"/><path d="M86 42h10a9 9 0 0 1 0 18h-8" fill="none" stroke="#14121F" stroke-width="5"/><path d="M48 14c0 6 6 6 6 12M60 10c0 6 6 6 6 12M72 14c0 6 6 6 6 12" stroke="#FF3D2E" stroke-width="4" stroke-linecap="round" fill="none"/></svg>',
  icecream: '<svg viewBox="0 0 120 120"><circle cx="60" cy="38" r="22" fill="#FFB3C7" stroke="#14121F" stroke-width="5"/><circle cx="44" cy="52" r="18" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><circle cx="76" cy="52" r="18" fill="#2D4CFF" stroke="#14121F" stroke-width="5"/><path d="M34 68h52L60 112z" fill="#F7C68B" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M44 78l24 22M54 72l20 18" stroke="#14121F" stroke-width="3"/></svg>',
  burger: '<svg viewBox="0 0 120 120"><path d="M20 46c0-18 18-30 40-30s40 12 40 30z" fill="#F7C68B" stroke="#14121F" stroke-width="5"/><rect x="18" y="48" width="84" height="12" rx="6" fill="#6CCB5F" stroke="#14121F" stroke-width="5"/><rect x="20" y="60" width="80" height="14" rx="4" fill="#8B4A2B" stroke="#14121F" stroke-width="5"/><rect x="18" y="74" width="84" height="12" rx="6" fill="#FF3D2E" stroke="#14121F" stroke-width="5"/><path d="M20 88h80c0 10-8 16-18 16H38c-10 0-18-6-18-16z" fill="#F7C68B" stroke="#14121F" stroke-width="5"/><circle cx="46" cy="30" r="2.5" fill="#14121F"/><circle cx="62" cy="26" r="2.5" fill="#14121F"/><circle cx="78" cy="32" r="2.5" fill="#14121F"/></svg>',
  katsu: '<svg viewBox="0 0 120 120"><ellipse cx="60" cy="70" rx="48" ry="30" fill="#fff" stroke="#14121F" stroke-width="5"/><path d="M26 66c6-22 24-30 40-26s26 20 22 36" fill="#E9A23B" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M40 60l8-4M52 54l8-3M64 52l8-2" stroke="#14121F" stroke-width="3" stroke-linecap="round"/><path d="M22 82h76" stroke="#FFCC00" stroke-width="6"/></svg>',
  tteok: '<svg viewBox="0 0 120 120"><circle cx="60" cy="64" r="42" fill="#FF3D2E" stroke="#14121F" stroke-width="5"/><path d="M34 58c8-8 20-10 30-2s22 6 24 16" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><rect x="36" y="66" width="22" height="10" rx="5" fill="#fff" stroke="#14121F" stroke-width="3"/><rect x="60" y="74" width="22" height="10" rx="5" fill="#fff" stroke="#14121F" stroke-width="3"/><path d="M44 20c0 6 6 6 6 12M62 16c0 6 6 6 6 12" stroke="#14121F" stroke-width="4" stroke-linecap="round" fill="none"/></svg>',
  ginseng: '<svg viewBox="0 0 120 120"><rect x="24" y="30" width="72" height="70" rx="8" fill="#B3121B" stroke="#14121F" stroke-width="5"/><rect x="24" y="30" width="72" height="22" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><circle cx="60" cy="68" r="16" fill="#fff" stroke="#14121F" stroke-width="4"/><path d="M60 58c-4 6 4 8 0 14s4 8 0 12" fill="none" stroke="#B3121B" stroke-width="3"/><path d="M40 14l20 10 20-10" fill="none" stroke="#14121F" stroke-width="5" stroke-linecap="round"/></svg>',
  porridge: '<svg viewBox="0 0 120 120"><path d="M16 56h88c0 26-18 44-44 44S16 82 16 56z" fill="#2D4CFF" stroke="#14121F" stroke-width="5"/><ellipse cx="60" cy="56" rx="44" ry="12" fill="#FFF7E0" stroke="#14121F" stroke-width="5"/><circle cx="48" cy="54" r="4" fill="#FF3D2E"/><circle cx="66" cy="52" r="4" fill="#6CCB5F"/><path d="M80 44l16-20" stroke="#14121F" stroke-width="6" stroke-linecap="round"/></svg>',
  golf: '<svg viewBox="0 0 120 120"><circle cx="46" cy="78" r="18" fill="#fff" stroke="#14121F" stroke-width="5"/><circle cx="40" cy="72" r="2" fill="#14121F"/><circle cx="50" cy="70" r="2" fill="#14121F"/><circle cx="45" cy="82" r="2" fill="#14121F"/><circle cx="54" cy="82" r="2" fill="#14121F"/><path d="M80 20v60" stroke="#14121F" stroke-width="6" stroke-linecap="round"/><path d="M80 20l28 10-28 10z" fill="#FF3D2E" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M14 102c20-8 70-8 92 0" fill="none" stroke="#6CCB5F" stroke-width="8" stroke-linecap="round"/></svg>',
  beer: '<svg viewBox="0 0 120 120"><rect x="30" y="34" width="52" height="70" rx="8" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><path d="M82 50h10a10 10 0 0 1 0 20h-10" fill="none" stroke="#14121F" stroke-width="5"/><path d="M26 36c0-14 14-16 18-10 4-10 22-10 24 0 8-6 20-2 18 10z" fill="#fff" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M42 54v40M56 54v40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/></svg>',
  chicken: '<svg viewBox="0 0 120 120"><path d="M32 70c-6-24 10-44 34-44s34 18 30 40c-2 12-12 20-26 22l-6 14-8-14c-12-2-22-8-24-18z" fill="#E9A23B" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M50 50c4 2 8 2 12 0M64 62c3 2 7 2 10 0M44 64c3 2 6 2 9 0" stroke="#14121F" stroke-width="3" stroke-linecap="round"/><path d="M24 36l-10-4 6 10" fill="#FF3D2E" stroke="#14121F" stroke-width="4" stroke-linejoin="round"/></svg>',
  shop: '<svg viewBox="0 0 120 120"><path d="M20 40l8-18h64l8 18z" fill="#FF3D2E" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M20 40h80v8a10 10 0 0 1-20 0 10 10 0 0 1-20 0 10 10 0 0 1-20 0 10 10 0 0 1-20 0z" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><rect x="28" y="56" width="64" height="44" fill="#fff" stroke="#14121F" stroke-width="5"/><rect x="52" y="72" width="16" height="28" fill="#2D4CFF" stroke="#14121F" stroke-width="4"/></svg>',
  coins: '<svg viewBox="0 0 120 120"><ellipse cx="60" cy="40" rx="34" ry="14" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><path d="M26 40v16c0 8 15 14 34 14s34-6 34-14V40" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><path d="M26 56v16c0 8 15 14 34 14s34-6 34-14V56" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><path d="M26 72v16c0 8 15 14 34 14s34-6 34-14V72" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><text x="60" y="46" text-anchor="middle" font-size="18" font-weight="900" fill="#14121F">₩</text></svg>',
  bowl: '<svg viewBox="0 0 120 120"><path d="M14 54h92c0 26-20 46-46 46S14 80 14 54z" fill="#FF3D2E" stroke="#14121F" stroke-width="5"/><path d="M30 44c8-16 52-16 60 0" fill="none" stroke="#14121F" stroke-width="5" stroke-linecap="round"/><path d="M44 24l10 20M76 24 66 44" stroke="#14121F" stroke-width="5" stroke-linecap="round"/></svg>',
  coffee: '<svg viewBox="0 0 120 120"><path d="M24 40h60v30a24 24 0 0 1-24 24H48a24 24 0 0 1-24-24z" fill="#fff" stroke="#14121F" stroke-width="5"/><path d="M84 48h8a10 10 0 0 1 0 20h-8" fill="none" stroke="#14121F" stroke-width="5"/><path d="M40 14c0 6 6 6 6 12M56 10c0 6 6 6 6 12M72 14c0 6 6 6 6 12" stroke="#14121F" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M26 100h64" stroke="#14121F" stroke-width="5" stroke-linecap="round"/></svg>',
  bag: '<svg viewBox="0 0 120 120"><path d="M26 44h68l-6 60H32z" fill="#2D4CFF" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M44 44V34a16 16 0 0 1 32 0v10" fill="none" stroke="#14121F" stroke-width="5"/><circle cx="60" cy="74" r="10" fill="#FFCC00" stroke="#14121F" stroke-width="4"/></svg>',
  mall: '<svg viewBox="0 0 120 120"><rect x="16" y="40" width="88" height="64" fill="#fff" stroke="#14121F" stroke-width="5"/><path d="M16 40 60 14l44 26z" fill="#FFCC00" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><rect x="28" y="54" width="18" height="18" fill="#2D4CFF"/><rect x="74" y="54" width="18" height="18" fill="#2D4CFF"/><rect x="50" y="76" width="20" height="28" fill="#FF3D2E" stroke="#14121F" stroke-width="4"/></svg>',
};
export const CAT_ILLO = { coffee: 'coffee', bowl: 'bowl', chicken: 'chicken', golf: 'golf', bag: 'bag', mall: 'mall' };

export const FLAGS = { agents: true };
// 방문 분석 스니펫 (ID가 있을 때만). 이벤트는 public/js/site.js 의 track() 이 dataLayer·gtag·네이버로 전달
function trackingHead() {
  const j = v => JSON.stringify(String(v));
  return [
    SITE.gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${j(SITE.gtmId)});window.gtag=window.gtag||function(){dataLayer.push(arguments);};gtag('js',new Date());</script>` : '',
    SITE.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(SITE.gaId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${j(SITE.gaId)});</script>` : '',
    SITE.naverWa ? `<script src="https://wcs.naver.net/wcslog.js"></script><script>if(!wcs_add)var wcs_add={};wcs_add["wa"]=${j(SITE.naverWa)};if(window.wcs){wcs_do();}</script>` : '',
    SITE.clarityId ? `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${j(SITE.clarityId)});</script>` : '',
  ].filter(Boolean).join('\n');
}
const LOGO_MARK = `<svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#FFCC00"/><path d="M11.5 28.5 27 13M16.5 13H27v10.5" fill="none" stroke="#111" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const logoHtml = (cls = '') => `<span class="logo__lockup ${cls}">${LOGO_MARK}<span class="logo__word">창업<b>가이드</b></span></span>`;
export function sticker(text, { tone = 'yellow', rot = -4, size = '' } = {}) {
  return `<span class="sticker sticker--${tone} ${size}" style="--rot:${rot}deg">${esc(text)}</span>`;
}
export function badge(text, tone = 'ink') { return `<span class="badge badge--${tone}">${esc(text)}</span>`; }
export function starburst() { return ''; }

export function img(src, alt, { w, h, cls = '', lazy = true } = {}) {
  if (!src) return `<div class="img-empty ${cls}" aria-hidden="true">${ILLO.shop}</div>`;
  const s = /^https?:/.test(src) ? src : u('/' + src.replace(/^\//, ''));
  return `<img src="${esc(s)}" alt="${esc(alt)}"${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'} class="${cls}">`;
}

// 매물 카드
export function listingCard(l, { eager = false, size = '' } = {}) {
  const img0 = l.images && l.images[0] ? imgPath(l.images[0], 'thumb') : '';
  const tags = (l.tags || []).slice(0, 2);
  const premium = l.premium ? fmtWon(l.premium) : '협의';
  return `<article class="card ${size}" data-id="${l.id}">
  <a class="card__media" href="${u(`/listing/${l.id}/`)}" aria-label="${esc(l.title)}">
    ${img(img0, `${esc(l.title)} 매장 사진`, { lazy: !eager, w: 480, h: 360, cls: 'card__img' })}
    ${tags.length ? `<div class="card__stickers">${tags.map((t, i) => sticker(t, { tone: ['yellow', 'red', 'blue'][i % 3], rot: [-6, 5, -3][i % 3], size: 'sm' })).join('')}</div>` : ''}
    ${l.sample ? '<span class="card__sample">예시 매물</span>' : ''}
    ${l.brand ? `<span class="card__brand">${esc(l.brand)}</span>` : ''}
    ${(m => m != null && m <= 18 ? `<span class="card__payback" title="권리금 ÷ 월수익(세전) 단순 계산, 점주 인건비 제외">회수 약 ${Math.max(1, Math.round(m))}개월</span>` : '')(paybackMonths(l))}
  </a>
  <div class="card__body">
    <div class="card__loc">${ICONS.pin}<span>${esc([l.sido, l.gugun].filter(Boolean).join(' '))}</span><span class="dot">·</span><span>${esc(l.kind2 || l.kind1 || '')}</span></div>
    <h3 class="card__title"><a href="${u(`/listing/${l.id}/`)}">${esc(l.title)}</a></h3>
    <dl class="card__nums">
      <div><dt>월매출</dt><dd>${l.sales ? esc(fmtMan(l.sales)) : '<span class="muted">담당자 문의</span>'}</dd></div>
      <div><dt>월수익</dt><dd class="hot">${l.profit ? esc(fmtMan(l.profit)) : '<span class="muted">문의</span>'}</dd></div>
      <div><dt>권리금</dt><dd class="cool">${esc(premium)}</dd></div>
    </dl>
    <div class="card__foot">
      <span class="card__agent">${l.agentId ? `${esc(l.agentName || '담당자')} 창업전문가` : esc(l.agentName || '창업가이드 상담센터')}</span>
      ${l.agentPhone ? `<a class="btn btn--call btn--sm" href="tel:${esc(phoneTel(l.agentPhone))}" data-call="${esc(l.id)}" data-agent="${esc(l.agentId || '')}" data-phone="${esc(l.agentPhone || '')}">${ICONS.phone}전화</a>` : `<a class="btn btn--call btn--sm" href="${u(`/listing/${l.id}/`)}">${ICONS.sms}상담</a>`}
    </div>
  </div>
</article>`;
}
export function imgPath(p, variant) {
  if (!p) return '';
  if (/^https?:/.test(p)) return p;
  if (p.startsWith('photos/')) return variant === 'thumb' ? p.replace('photos/', 'photos/thumb/') : p;
  return p;
}
// 브랜드 로고 (기존 창업가이드 인기 프랜차이즈 띠에서 추출, public/img/brands/{slug}.png)
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __pub = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
const LOGO_CACHE = new Map();
export function brandLogo(slug) {
  if (!slug) return '';
  if (!LOGO_CACHE.has(slug)) { const ext = ['png', 'svg', 'webp'].find(e => existsSync(join(__pub, 'img', 'brands', `${slug}.${e}`))); LOGO_CACHE.set(slug, ext ? u(`/img/brands/${slug}.${ext}`) : ''); }
  return LOGO_CACHE.get(slug);
}
export function brandLogoImg(slug, name, { h = 34, cls = 'brand-logo' } = {}) {
  const src = brandLogo(slug); if (!src) return '';
  return `<img class="${cls}" src="${src}" alt="${esc(name)} 로고" height="${h}" loading="lazy" decoding="async">`;
}

// 한 줄 롤링 카드 (스와이프 + 자동 이동)
export function rail(cards, { cols = 4, auto = 3500, cls = '' } = {}) {
  return `<div class="rail rail--${cols} ${cls}" data-rail ${auto ? `data-auto="${auto}"` : ''}><div class="rail__track" tabindex="0">${cards.map(c => `<div class="rail__item">${c}</div>`).join('')}</div><button type="button" class="rail__arrow rail__arrow--prev" data-rail-prev aria-label="이전 매물">${ICONS.arrow}</button><button type="button" class="rail__arrow rail__arrow--next" data-rail-next aria-label="다음 매물">${ICONS.arrow}</button></div>`;
}

export function skeletonCards(n = 6) {
  return Array.from({ length: n }, () => `<div class="card card--skeleton" aria-hidden="true"><div class="sk sk--img"></div><div class="card__body"><div class="sk sk--line w40"></div><div class="sk sk--line"></div><div class="sk sk--line w80"></div><div class="sk sk--nums"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div></div>`).join('');
}

export function breadcrumb(items) {
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.href) })) };
  return `<nav class="crumb" aria-label="현재 위치"><ol>${items.map((it, i) => `<li>${i < items.length - 1 ? `<a href="${u(it.href)}">${esc(it.name)}</a>` : `<span aria-current="page">${esc(it.name)}</span>`}</li>`).join('')}</ol></nav>${jsonld(ld)}`;
}

export function faqBlock(items, { title = '자주 묻는 질문', id = 'faq' } = {}) {
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  return `<section class="faq" id="${id}"><h2 class="h2">${esc(title)}</h2><div class="accordion">${items.map((f, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary><h3>${esc(f.q)}</h3>${ICONS.chevron}</summary><div class="acc__body"><p>${esc(f.a)}</p></div></details>`).join('')}</div>${jsonld(ld)}</section>`;
}

export function ctaBand({ title = '원하는 매물이 없다면 창업 의뢰를 남기세요', sub = '지역·업종·예산을 알려주시면 담당 창업전문가가 조건에 맞는 매장을 찾아 연락드립니다.' } = {}) {
  return `<section class="cta-band"><div class="wrap cta-band__in">
    <div class="cta-band__txt"><p class="eyebrow">${SITE.phone ? '24시간 창업상담' : '무료 창업상담'}</p><h2 class="h2">${esc(title)}</h2><p>${esc(sub)}</p></div>
    <div class="cta-band__btns"><a class="btn btn--red btn--lg" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰하기</a>${SITE.phone ? `<a class="btn btn--ink btn--lg" href="tel:${SITE.phoneTel}">${ICONS.phone}${esc(SITE.phone)}</a>` : ''}<a class="btn btn--white btn--lg" href="${u('/sell/')}">${ICONS.share}내 매장 양도 의뢰</a></div>
  </div></section>`;
}

export function header(active = '') {
  const nav = [['/listings/', '매물 검색', 'listings'], ['/brand/', '브랜드별', 'brand'], ['/region/', '지역별', 'region'], ['/theme/', '테마별', 'theme'], ['/budget/', '예산별', 'budget'], ['/pick/', '성향별', 'pick'], ['/blog/', '창업 인사이트', 'blog'], ...(FLAGS.agents ? [['/agents/', '담당 전문가', 'agents']] : []), ['/about/', '회사 소개', 'about']];
  return `<header class="hdr glass" id="top">
  <div class="wrap hdr__in">
    <a class="logo" href="${u('/')}" aria-label="${esc(SITE.name)} 홈">${logoHtml()}</a>
    <nav class="hdr__nav" aria-label="주요 메뉴">${nav.map(([h, n, k]) => `<a href="${u(h)}" ${active === k ? 'aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav>
    <div class="hdr__cta"><a class="btn btn--yellow" href="${u('/inquiry/')}">창업 문의</a>${SITE.phone ? `<a class="btn btn--ink btn--icon" href="tel:${SITE.phoneTel}" aria-label="대표번호로 전화">${ICONS.phone}</a>` : ''}<button class="btn btn--white btn--icon" type="button" data-drawer-open="menu" aria-label="메뉴 열기">${ICONS.menu}</button></div>
  </div>
</header>
<aside class="quick" aria-label="빠른 상담">
  ${SITE.phone ? `<a href="tel:${SITE.phoneTel}">${ICONS.phone}<span>창업상담</span><b class="is-num">${esc(SITE.phone.replace('010-', ''))}</b></a>` : `<a href="${u('/faq/')}">${ICONS.doc}<span>자주 묻는</span><b>질문</b></a>`}
  <a href="${u('/inquiry/')}" class="is-yellow">${ICONS.bolt}<span>창업 의뢰</span><b>문의·접수</b></a>
  <a href="${u('/sell/')}">${ICONS.share}<span>내 매장</span><b>양도 의뢰</b></a>
  <a href="${u('/listings/')}">${ICONS.search}<span>매물</span><b>검색</b></a>
</aside>
<nav class="mbar glass" aria-label="모바일 빠른 메뉴">
  ${SITE.phone ? `<a href="tel:${SITE.phoneTel}">${ICONS.phone}<span>전화상담</span></a>` : `<a href="${u('/brand/')}">${ICONS.star}<span>브랜드별</span></a>`}
  <a href="${u('/inquiry/')}" class="is-yellow">${ICONS.bolt}<span>창업 문의</span></a>
  <a href="${u('/sell/')}">${ICONS.share}<span>양도 의뢰</span></a>
  <a href="${u('/listings/')}">${ICONS.search}<span>매물 검색</span></a>
  <button type="button" data-drawer-open="menu">${ICONS.menu}<span>메뉴</span></button>
</nav>
<div class="drawer" id="drawer-menu" aria-hidden="true"><div class="drawer__panel">
  <div class="drawer__head"><strong>메뉴</strong><button type="button" data-drawer-close aria-label="닫기">${ICONS.close}</button></div>
  <form class="drawer__search" action="${u('/listings/')}" method="get"><input type="search" name="q" placeholder="지역 + 브랜드 (예: 인천 메가커피)" aria-label="검색" data-suggest autocomplete="off"><button type="submit" aria-label="검색">${ICONS.search}</button></form>
  <nav class="drawer__nav">${nav.map(([h, n]) => `<a href="${u(h)}">${esc(n)}${ICONS.arrow}</a>`).join('')}<a href="${u('/inquiry/')}">창업 의뢰${ICONS.arrow}</a><a href="${u('/sell/')}">양도양수 의뢰${ICONS.arrow}</a><a href="${u('/faq/')}">자주 묻는 질문${ICONS.arrow}</a></nav>
  <div class="drawer__cats"><p class="eyebrow">업종별</p>${CATEGORIES.map(c => `<a class="chip" href="${u(`/category/${c.slug}/`)}">${esc(c.name)}</a>`).join('')}</div>
  <div class="drawer__cats"><p class="eyebrow">테마별</p>${THEMES.map(t => `<a class="chip" href="${u(`/theme/${t.slug}/`)}">${esc(t.name)}</a>`).join('')}</div>
  ${SITE.phone ? `<a class="btn btn--yellow btn--lg btn--block" href="tel:${SITE.phoneTel}">${ICONS.phone}${esc(SITE.phone)} 바로 전화</a>` : `<a class="btn btn--yellow btn--lg btn--block" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰 남기기</a>`}
</div><button class="drawer__backdrop" type="button" data-drawer-close aria-label="메뉴 닫기"></button></div>`;
}

export function footer() {
  return `<footer class="ftr">
  <div class="ftr__legal"><div class="wrap"><a href="${u('/terms/')}">이용약관</a><a href="${u('/privacy/')}">개인정보처리방침</a><a href="${u('/about/')}">회사 소개</a><a href="${u('/faq/')}">자주 묻는 질문</a></div></div>
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">${logoHtml('logo__lockup--white')}<p>${esc(SITE.slogan)}</p>
        <div class="ftr__contact">${SITE.phone ? `<a class="btn btn--yellow" href="tel:${SITE.phoneTel}">${ICONS.phone}창업상담 ${esc(SITE.phone)}</a>` : `<a class="btn btn--yellow" href="${u('/inquiry/')}">${ICONS.bolt}창업 의뢰하기</a>`}${SITE.email ? `<a class="btn btn--white" href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>` : `<a class="btn btn--white" href="${u('/inquiry/')}">온라인 문의</a>`}</div>
        <p class="muted">${esc(SITE.hours)}</p></div>
      <div class="ftr__cols">
        <div><h4>매물 찾기</h4>${CATEGORIES.map(c => `<a href="${u(`/category/${c.slug}/`)}">${esc(c.name)}</a>`).join('')}<a href="${u('/listings/')}">전체 매물</a></div>
        <div><h4>테마</h4>${THEMES.map(t => `<a href="${u(`/theme/${t.slug}/`)}">${esc(t.name)}</a>`).join('')}</div>
        <div><h4>예산별</h4>${BUDGETS.map(b => `<a href="${u(`/budget/${b.slug}/`)}">${esc(b.name)}</a>`).join('')}<a href="${u('/region/')}">지역별 매물</a></div>
        <div><h4>회사</h4><a href="${u('/about/')}">회사 소개</a>${FLAGS.agents ? `<a href="${u('/agents/')}">담당 창업전문가</a>` : ''}<a href="${u('/inquiry/')}">창업 의뢰</a><a href="${u('/sell/')}">양도양수 의뢰</a><a href="${u('/blog/')}">창업 인사이트</a><a href="${u('/faq/')}">자주 묻는 질문</a><a href="${esc(SITE.blog)}" rel="noopener" target="_blank">네이버 블로그</a><a href="${u('/admin/')}">관리자</a></div>
      </div>
    </div>
    <div class="ftr__notice"><h4>창업가이드에서 알려드립니다</h4>${SITE.legalNotice.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="ftr__info"><p>상호 ${esc(SITE.company)} · 대표 ${esc(SITE.ceo)} · 사업자등록번호 ${esc(SITE.bizNo)} · 업태/종목 ${esc(SITE.bizType)}</p><p>주소 ${esc(SITE.address)}${SITE.phone ? ` · 창업상담 <a href="tel:${SITE.phoneTel}">${esc(SITE.phone)}</a>` : ''}${SITE.email ? ` · ${esc(SITE.email)}` : ''}</p><p><a href="${u('/privacy/')}">개인정보처리방침</a> · <a href="${u('/terms/')}">이용약관</a> · <a href="${u('/sitemap.xml')}">사이트맵</a> · <a href="${u('/llms.txt')}">llms.txt</a> · Copyright © ${esc(SITE.name)}. All rights reserved.</p></div>
  </div>
</footer>
<div class="float-cta" id="floatCta"><a class="btn btn--red btn--lg glass-red" href="${u('/inquiry/')}">${ICONS.bolt}<span>문의하기</span></a>${SITE.phone ? `<a class="btn btn--yellow btn--lg" href="tel:${SITE.phoneTel}">${ICONS.phone}<span>전화</span></a>` : ''}<button type="button" class="btn btn--ink btn--icon" data-scroll-top aria-label="맨 위로">${ICONS.chevron}</button></div>
<div class="toast-host" id="toasts" aria-live="polite"></div>
<div class="modal" id="modal-sms" aria-hidden="true" role="dialog" aria-labelledby="modal-sms-title"><div class="modal__panel glass"><button class="modal__close" type="button" data-modal-close aria-label="닫기">${ICONS.close}</button>
  <p class="eyebrow">무료 문자 상담 신청</p><h3 id="modal-sms-title" class="h3">담당 창업전문가가 연락드립니다</h3>
  <form class="form" data-form="sms"><input type="hidden" name="listingId"><input type="hidden" name="agentId">
    <p class="form__ctx" data-sms-ctx></p>
    <label>이름<input name="name" required maxlength="20" placeholder="홍길동"></label>
    <label>휴대폰<input name="phone" required inputmode="tel" pattern="[0-9\\-]{9,14}" placeholder="010-0000-0000"></label>
    <label>남길 말씀<div class="chips" data-presets><button type="button">상담 요청합니다</button><button type="button">지금 전화주세요</button><button type="button">금액 조정 가능한가요?</button><button type="button">직접 볼 수 있나요?</button></div><textarea name="message" rows="3" maxlength="500" placeholder="궁금한 점을 적어주세요"></textarea></label>
    <label class="check"><input type="checkbox" name="agree" required> <span>개인정보 수집·이용에 동의합니다. (상담 목적, 1년 보관) <a href="${u('/privacy/')}" target="_blank">보기</a></span></label>
    <button class="btn btn--red btn--lg btn--block" type="submit">${ICONS.sms}상담 신청 전송</button>
  </form></div><button class="modal__backdrop" type="button" data-modal-close aria-label="닫기"></button></div>`;
}

// 공통 레이아웃
export function layout({ title, desc, path, body, active = '', ld = [], og, type = 'website', noindex = false, extraHead = '', bodyClass = '', keywords = [], canonicalPath }) {
  const canonical = abs(canonicalPath || path);
  const ogKey = og ? '' : (() => { const m = String(path || '/').split('/').filter(Boolean); if (!m.length) return 'main'; return [`${m[0]}-${m[1]}`, m[0], `kw-${m[0]}`, m[0] === 'category' ? 'listings' : ''].find(k => k && existsSync(join(__pub, 'img', 'og', `${k}.jpg`))) || 'main'; })();
  const ogImg = og || abs(`/img/og/${ogKey}.jpg`);
  const ldAll = [
    { '@context': 'https://schema.org', '@type': 'Organization', '@id': abs('/#org'), name: SITE.name, alternateName: ['창업가이드 창업컨설팅', 'changupguide'], legalName: SITE.company, founder: { '@type': 'Person', name: SITE.ceo }, foundingDate: '2014-04-01', taxID: SITE.bizNo, url: abs('/'), logo: abs('/logo.png'), ...(SITE.phone ? { telephone: SITE.phoneTel } : {}), ...(SITE.email ? { email: SITE.email } : {}), address: { '@type': 'PostalAddress', streetAddress: SITE.addressStreet, addressLocality: SITE.addressLocality, addressRegion: '서울특별시', addressCountry: 'KR' }, ...(SITE.phone ? { contactPoint: [{ '@type': 'ContactPoint', telephone: SITE.phoneTel, contactType: 'sales', areaServed: 'KR', availableLanguage: 'ko', hoursAvailable: 'Mo-Su 00:00-24:00' }] } : {}), description: SITE.slogan, knowsAbout: SEO.keywords },
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#website'), url: abs('/'), name: SITE.name, inLanguage: 'ko-KR', publisher: { '@id': abs('/#org') }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('/listings/') + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
    ...ld,
  ];
  const robots = (SITE.noindex || noindex) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${esc(SITE.name)}"><meta property="og:locale" content="ko_KR"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(ogImg)}">${og ? '' : `<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(SITE.name)} 공유 이미지">`}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(ogImg)}">
<meta name="theme-color" content="#FFCC00">
${SITE.naverVerification ? `<meta name="naver-site-verification" content="${esc(SITE.naverVerification)}">` : ''}
${SITE.googleVerification ? `<meta name="google-site-verification" content="${esc(SITE.googleVerification)}">` : ''}
${SITE.bingVerification ? `<meta name="msvalidate.01" content="${esc(SITE.bingVerification)}">` : ''}
${trackingHead()}
<link rel="icon" href="${u('/favicon.ico')}" sizes="any"><link rel="icon" href="${u('/img/brand/mark.png')}" type="image/png"><link rel="apple-touch-icon" href="${u('/apple-touch-icon.png')}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} 창업 인사이트" href="${u('/rss.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="${u('/css/site.css?v=' + BUILD_ID)}">
<link rel="stylesheet" href="${u('/css/site-v3.css?v=' + BUILD_ID)}">
<link rel="stylesheet" href="${u('/css/site-v4.css?v=' + BUILD_ID)}">
<link rel="stylesheet" href="${u('/css/site-v5.css?v=' + BUILD_ID)}">
<script>window.CU={base:${JSON.stringify(SITE.base)},api:${JSON.stringify(process.env.API_URL || '')},site:${JSON.stringify(SITE.url)}};</script>
${extraHead}
${ldAll.map(jsonld).join('\n')}
</head>
<body class="${bodyClass}">
${SITE.gtmId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${esc(SITE.gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ''}
<a class="skip" href="#main">본문 바로가기</a>
${header(active)}
<main id="main">${body}</main>
${footer()}
<script type="module" src="${u('/js/site.js?v=' + BUILD_ID)}"></script>
</body>
</html>`;
}
export const BUILD_ID = Date.now().toString(36);
