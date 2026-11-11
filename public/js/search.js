// 매물 검색 페이지 — search-index.json을 받아 브라우저에서 필터·정렬·페이지네이션
import { searchIndex, fmtWon, fmtMan, phoneTel } from './lib/text.mjs';
import { CATEGORIES, THEMES, BUDGETS } from './data.mjs';
const CU = window.CU || { base: '' };
const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PAGE = 24;
const state = { q: '', sido: '', gugun: '', brandSlug: '', code: '', kind: '', theme: '', budget: '', sort: 'recent', page: 1, minProfit: 0 };
let INDEX = null;
const META = JSON.parse($('#search-meta').textContent); // {regions:{sido:[gugun...]}, brands:[{name,slug,n}]}

function readUrl() {
  const p = new URLSearchParams(location.search);
  for (const k of Object.keys(state)) if (p.has(k)) state[k] = k === 'page' || k === 'minProfit' ? Number(p.get(k)) : p.get(k);
}
function writeUrl() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'recent')) p.set(k, v);
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
}
const ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.8 2.1z"/></svg>';
const tones = ['yellow', 'red', 'blue'], rots = [-6, 5, -3];
function card(e) {
  const img = e.img ? `<img src="${CU.base}/${e.img.includes('/thumb/') ? e.img : e.img.replace('photos/', 'photos/thumb/')}" alt="${esc(e.t)} 매장 사진" loading="lazy" decoding="async" class="card__img" width="480" height="360">` : '<div class="img-empty" aria-hidden="true"></div>';
  return `<article class="card" data-id="${e.id}"><a class="card__media" href="${CU.base}/listing/${e.id}/">${img}${e.tags.length ? `<div class="card__stickers">${e.tags.slice(0, 3).map((t, i) => `<span class="sticker sticker--${tones[i % 3]} sm" style="--rot:${rots[i % 3]}deg">${esc(t)}</span>`).join('')}</div>` : ''}${e.b ? `<span class="card__brand">${esc(e.b)}</span>` : ''}${e.premium > 0 && e.profit > 0 && e.premium / e.profit <= 18 ? `<span class="card__payback" title="권리금 ÷ 월수익(세전) 단순 계산, 점주 인건비 제외">회수 약 ${Math.max(1, Math.round(e.premium / e.profit))}개월</span>` : ''}</a>
  <div class="card__body"><div class="card__loc">${ICON_PIN}<span>${esc([e.s, e.g].filter(Boolean).join(' '))}</span><span class="dot">·</span><span>${esc(e.k2 || e.k1)}</span></div>
  <h3 class="card__title"><a href="${CU.base}/listing/${e.id}/">${esc(e.t)}</a></h3>
  <dl class="card__nums"><div><dt>월매출</dt><dd>${e.sales ? fmtMan(e.sales) : '<span class="muted">문의</span>'}</dd></div><div><dt>월수익</dt><dd class="hot">${e.profit ? fmtMan(e.profit) : '<span class="muted">문의</span>'}</dd></div><div><dt>권리금</dt><dd class="cool">${e.premium ? fmtWon(e.premium) : '협의'}</dd></div></dl>
  <div class="card__foot"><span class="card__agent">${esc(e.a || '담당자')} 창업전문가</span><a class="btn btn--call btn--sm" href="tel:${phoneTel(e.ap || '')}" data-call="${e.id}" data-agent="${esc(e.ai)}" data-phone="${esc(e.ap || '')}" data-title="${esc(e.t)}">${ICON_PHONE}<span>전화</span></a></div></div></article>`;
}

function renderFilters() {
  const f = $('#filters');
  const sidos = Object.keys(META.regions);
  f.innerHTML = `
  <form class="filters__q" data-fq><input type="search" name="q" value="${esc(state.q)}" placeholder="지역 + 브랜드 (예: 인천 메가커피)" aria-label="키워드 검색"><button type="submit" aria-label="검색"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button></form>
  <details open><summary>지역 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="chips" data-f="sido">${sidos.map(s => `<button type="button" class="chip ${state.sido === s ? 'is-on' : ''}" data-v="${s}">${s}<small>${META.regions[s].reduce((a, g) => a + g.n, 0)}</small></button>`).join('')}</div>
    <div class="chips" data-f="gugun">${(state.sido ? META.regions[state.sido] : []).map(g => `<button type="button" class="chip ${state.gugun === g.name ? 'is-on' : ''}" data-v="${g.name}">${g.name}<small>${g.n}</small></button>`).join('')}</div></details>
  <details open><summary>브랜드 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="chips" data-f="brandSlug">${META.brands.slice(0, 40).map(b => `<button type="button" class="chip ${state.brandSlug === b.slug ? 'is-on' : ''}" data-v="${b.slug}">${esc(b.name)}<small>${b.n}</small></button>`).join('')}</div></details>
  <details open><summary>예산(권리금) <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="chips" data-f="budget">${BUDGETS.map(b => `<button type="button" class="chip chip--red ${state.budget === b.slug ? 'is-on' : ''}" data-v="${b.slug}">${b.name}</button>`).join('')}</div>
    <div class="range"><label>최소 월수익 <output>${state.minProfit ? fmtMan(state.minProfit) + ' 이상' : '전체'}</output></label><input type="range" min="0" max="3000" step="100" value="${state.minProfit}" data-f="minProfit"></div></details>
  <details><summary>업종 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="chips" data-f="code">${CATEGORIES.map(c => `<button type="button" class="chip ${String(state.code) === String(c.code) ? 'is-on' : ''}" data-v="${c.code}">${c.name}</button>`).join('')}</div>
    <div class="chips" data-f="kind">${(state.code ? (CATEGORIES.find(c => String(c.code) === String(state.code))?.kinds || []) : []).map(k => `<button type="button" class="chip ${String(state.kind) === String(k[0]) ? 'is-on' : ''}" data-v="${k[0]}">${k[1]}</button>`).join('')}</div></details>
  <details><summary>테마 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="chips" data-f="theme">${THEMES.map(t => `<button type="button" class="chip ${state.theme === t.name ? 'is-on' : ''}" data-v="${t.name}">${t.name}</button>`).join('')}</div></details>
  <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn btn--ink btn--block" data-apply>적용</button><button type="button" class="btn btn--white" data-reset>초기화</button></div>`;
  $$('[data-f] .chip', f).forEach(b => b.addEventListener('click', () => {
    const k = b.parentElement.dataset.f; state[k] = state[k] === b.dataset.v ? '' : b.dataset.v; state.page = 1;
    if (k === 'sido') state.gugun = ''; if (k === 'code') state.kind = '';
    renderFilters(); run();
  }));
  $('[data-f="minProfit"]', f).addEventListener('input', e => { state.minProfit = Number(e.target.value); $('.range output', f).textContent = state.minProfit ? fmtMan(state.minProfit) + ' 이상' : '전체'; });
  $('[data-f="minProfit"]', f).addEventListener('change', () => { state.page = 1; run(); });
  $('[data-fq]', f).addEventListener('submit', e => { e.preventDefault(); state.q = e.target.q.value.trim(); state.page = 1; run(); });
  $('[data-apply]', f).addEventListener('click', () => { f.classList.remove('is-open'); run(); });
  $('[data-reset]', f).addEventListener('click', () => { Object.assign(state, { q: '', sido: '', gugun: '', brandSlug: '', code: '', kind: '', theme: '', budget: '', sort: 'recent', page: 1, minProfit: 0 }); renderFilters(); run(); });
}

function run() {
  if (!INDEX) return;
  writeUrl();
  const { parsed, results } = searchIndex(INDEX, state.q, state);
  const total = results.length; const pages = Math.max(1, Math.ceil(total / PAGE)); if (state.page > pages) state.page = pages;
  const slice = results.slice((state.page - 1) * PAGE, state.page * PAGE);
  $('#resultCount').textContent = total.toLocaleString('ko-KR');
  const chips = [];
  if (state.q) chips.push(`<span class="badge badge--yellow">검색어: ${esc(state.q)}</span>`);
  parsed.regions.forEach(r => chips.push(`<span class="badge badge--blue">지역 인식: ${esc([r.sido, r.gugun].filter(Boolean).join(' '))}</span>`));
  parsed.brands.forEach(b => chips.push(`<span class="badge badge--red">${b.generic ? '업종' : '브랜드'} 인식: ${esc(b.name)}</span>`));
  if (parsed.budgetMax) chips.push(`<span class="badge">권리금 ${fmtWon(parsed.budgetMax)} 이하</span>`);
  if (parsed.budgetMin) chips.push(`<span class="badge">권리금 ${fmtWon(parsed.budgetMin)} 이상</span>`);
  parsed.terms.forEach(t => chips.push(`<span class="badge badge--cream">키워드: ${esc(t)}</span>`));
  for (const [k, label] of [['sido', '지역'], ['gugun', ''], ['budget', '예산'], ['theme', '테마']]) if (state[k]) chips.push(`<span class="badge badge--cream">${label ? label + ': ' : ''}${esc(k === 'budget' ? BUDGETS.find(b => b.slug === state[k])?.name : state[k])}</span>`);
  if (state.brandSlug) chips.push(`<span class="badge badge--cream">브랜드: ${esc(META.brands.find(b => b.slug === state.brandSlug)?.name || state.brandSlug)}</span>`);
  $('#parsed').innerHTML = chips.join('') + (chips.length ? ' <button type="button" class="chip" data-clear>전체 해제</button>' : '');
  $('[data-clear]')?.addEventListener('click', () => { $('[data-reset]').click(); });
  const grid = $('#results');
  if (!total) {
    grid.innerHTML = `<div class="results__empty" style="grid-column:1/-1"><svg viewBox="0 0 120 120"><path d="M20 40l8-18h64l8 18z" fill="#FF3D2E" stroke="#14121F" stroke-width="5" stroke-linejoin="round"/><path d="M20 40h80v8a10 10 0 0 1-20 0 10 10 0 0 1-20 0 10 10 0 0 1-20 0 10 10 0 0 1-20 0z" fill="#FFCC00" stroke="#14121F" stroke-width="5"/><rect x="28" y="56" width="64" height="44" fill="#fff" stroke="#14121F" stroke-width="5"/></svg><h2 class="h3">조건에 맞는 매물이 아직 없습니다</h2><p class="muted">조건을 줄이거나, 창업 의뢰를 남기시면 담당자가 조건에 맞는 매장이 나올 때 바로 연락드립니다.</p><a class="btn btn--red btn--lg" href="${CU.base}/inquiry/">창업 의뢰 남기기</a></div>`;
  } else grid.innerHTML = slice.map(card).join('');
  const pager = $('#pager'); const btns = [];
  const from = Math.max(1, state.page - 3), to = Math.min(pages, from + 6);
  if (state.page > 1) btns.push(`<button type="button" data-p="${state.page - 1}">‹</button>`);
  for (let p = from; p <= to; p++) btns.push(`<button type="button" data-p="${p}" ${p === state.page ? 'aria-current="page"' : ''}>${p}</button>`);
  if (state.page < pages) btns.push(`<button type="button" data-p="${state.page + 1}">›</button>`);
  pager.innerHTML = pages > 1 ? btns.join('') : '';
  $$('button', pager).forEach(b => b.addEventListener('click', () => { state.page = Number(b.dataset.p); run(); $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  document.title = `${state.q ? state.q + ' 창업 매물 ' : ''}매물 검색 (${total.toLocaleString()}건) | 창업가이드`;
}

async function init() {
  readUrl(); renderFilters();
  $('#sort').value = state.sort;
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; run(); });
  try {
    const r = await fetch(`${CU.base}/search-index.json`); INDEX = await r.json();
  } catch { $('#results').innerHTML = '<p class="results__empty">검색 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>'; return; }
  run();
}
init();
