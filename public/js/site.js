// 창업가이드 공통 인터랙션: 히어로 롤링, 드로어, 모달, 토스트, 갤러리 라이트박스, 통화 연결 알림, 문자 상담 폼, 검색 추천
const CU = window.CU || { base: '', api: '' };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';
const ICON_ERR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

// ---------- 토스트 ----------
export function toast(msg, kind = '', ms = 3200) {
  const host = $('#toasts'); if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${kind ? 'toast--' + kind : ''}`;
  el.innerHTML = `${kind === 'ok' ? ICON_OK : kind === 'err' ? ICON_ERR : ''}<span></span>`;
  el.querySelector('span').textContent = msg;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms);
}
window.cuToast = toast;

// ---------- 로컬 저장(데모 모드) ----------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('cu:' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('cu:' + k, JSON.stringify(v)); } catch {} },
  push(k, v, max = 200) { const a = store.get(k, []); a.unshift(v); store.set(k, a.slice(0, max)); },
};

// ---------- API ----------
async function api(path, body) {
  if (!CU.api) return { demo: true };
  const r = await fetch(CU.api.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}
function beacon(path, body) {
  if (!CU.api) return false;
  try { return navigator.sendBeacon(CU.api.replace(/\/$/, '') + path, new Blob([JSON.stringify(body)], { type: 'application/json' })); } catch { return false; }
}

// ---------- 드로어 ----------
function initDrawer() {
  $$('[data-drawer-open]').forEach(b => b.addEventListener('click', () => {
    const d = $('#drawer-' + b.dataset.drawerOpen); if (!d) return;
    d.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }));
  $$('[data-drawer-close]').forEach(b => b.addEventListener('click', () => closeDrawers()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawers(); closeModals(); } });
}
function closeDrawers() { $$('.drawer[aria-hidden="false"]').forEach(d => d.setAttribute('aria-hidden', 'true')); document.body.style.overflow = ''; }

// ---------- 모달 ----------
export function openModal(id) { const m = $('#' + id); if (!m) return; m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; const f = m.querySelector('input:not([type=hidden]),button:not(.modal__close)'); f && setTimeout(() => f.focus(), 50); }
export function closeModals() { $$('.modal[aria-hidden="false"]').forEach(m => m.setAttribute('aria-hidden', 'true')); document.body.style.overflow = ''; }
function initModals() {
  $$('[data-modal-close]').forEach(b => b.addEventListener('click', closeModals));
  $$('[data-modal-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openModal(b.dataset.modalOpen); }));
}

// ---------- 히어로 롤링 ----------
function initHero() {
  const hero = $('.hero'); if (!hero) return;
  const track = $('.hero__track', hero); const slides = $$('.slide', track); if (slides.length < 2) return;
  let i = 0, timer, startX = null;
  const dots = $('.hero__dots', hero); const counter = $('.hero__counter', hero);
  slides.forEach((_, k) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `${k + 1}번 배너`); b.addEventListener('click', () => go(k, true)); dots.appendChild(b); });
  function go(k, user) { i = (k + slides.length) % slides.length; track.style.transform = `translateX(-${i * 100}%)`; $$('button', dots).forEach((b, n) => n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')); if (counter) counter.textContent = `${i + 1} / ${slides.length}`; if (user) restart(); }
  function restart() { clearInterval(timer); timer = setInterval(() => go(i + 1), 5200); }
  $('.hero__arrow--prev', hero)?.addEventListener('click', () => go(i - 1, true));
  $('.hero__arrow--next', hero)?.addEventListener('click', () => go(i + 1, true));
  hero.addEventListener('pointerdown', e => { startX = e.clientX; });
  hero.addEventListener('pointerup', e => { if (startX == null) return; const dx = e.clientX - startX; startX = null; if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1, true); });
  hero.addEventListener('mouseenter', () => clearInterval(timer)); hero.addEventListener('mouseleave', restart);
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
  go(0); restart();
}

// ---------- 스크롤 리빌·카운터·바 ----------
function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; e.target.classList.add('is-in'); io.unobserve(e.target);
    $$('[data-count]', e.target).concat(e.target.matches('[data-count]') ? [e.target] : []).forEach(el => countUp(el));
    $$('.bar__fill[data-w]', e.target).forEach(b => { b.style.width = b.dataset.w + '%'; });
  }), { threshold: .15 });
  $$('.reveal, .stat, .sales__box').forEach(el => io.observe(el));
}
function countUp(el) {
  const target = Number(el.dataset.count); const suffix = el.dataset.suffix || ''; const t0 = performance.now(); const dur = 1200;
  const step = now => { const p = Math.min(1, (now - t0) / dur); const v = Math.round(target * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('ko-KR') + suffix; if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ---------- 통화 연결 + 담당자 문자 알림 ----------
function initCall() {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-call]'); if (!a) return;
    const listingId = a.dataset.call; const agentId = a.dataset.agent; const phone = a.dataset.phone; const title = a.dataset.title || document.title;
    const payload = { listingId, agentId, phone, title, url: location.href.split('#')[0], ua: navigator.userAgent, at: new Date().toISOString() };
    store.push('calls', payload, 100);
    const sent = beacon('/api/call-events', payload);
    if (sent) toast('담당자에게 지금 보신 매물 링크를 문자로 보냈습니다. 바로 연결됩니다.', 'ok', 2500);
    else if (!CU.api) toast('담당자에게 바로 연결합니다. (서버 연결 시 매물 링크가 자동 문자 발송됩니다)', '', 2500);
    // 데스크톱에서 tel: 링크가 동작하지 않을 때 번호 안내
    if (!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && phone) { e.preventDefault(); copy(phone); toast(`담당자 번호 ${phone} 를 복사했습니다. 모바일에서는 바로 통화됩니다.`, 'ok', 3500); }
  });
}
function copy(t) { try { navigator.clipboard.writeText(t); } catch {} }

// ---------- 문자 상담 모달 ----------
function initSms() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sms]'); if (!b) return; e.preventDefault();
    const f = $('#modal-sms form'); if (!f) return;
    f.listingId.value = b.dataset.sms || ''; f.agentId.value = b.dataset.agent || '';
    const ctx = $('[data-sms-ctx]', f); ctx.textContent = b.dataset.title ? `문의 매물: No.${b.dataset.sms} ${b.dataset.title}` : (b.dataset.agentName ? `담당: ${b.dataset.agentName} 창업전문가` : '');
    openModal('modal-sms');
  });
  $$('[data-presets] button').forEach(p => p.addEventListener('click', () => { const ta = p.closest('label').querySelector('textarea'); ta.value = ta.value ? ta.value + ' ' + p.textContent : p.textContent; ta.focus(); }));
  $$('form[data-form]').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    data.type = f.dataset.form; data.url = location.href; data.at = new Date().toISOString();
    if (data.phone && !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(data.phone.replace(/\s/g, ''))) { toast('휴대폰 번호 형식을 확인해 주세요.', 'err'); return; }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '전송 중…';
    try {
      const r = await api('/api/inquiries', data);
      store.push('inquiries', data, 50);
      toast(r.demo ? '접수되었습니다. (데모: 서버 연결 후 담당자에게 문자·관리자 문의함으로 전달됩니다)' : '접수되었습니다. 담당 창업전문가가 곧 연락드립니다.', 'ok', 4200);
      f.reset(); closeModals();
      if (f.dataset.done) location.href = f.dataset.done;
    } catch (err) { toast('전송에 실패했습니다. 전화로 문의해 주세요: 010-5548-6188', 'err', 4500); }
    btn.disabled = false; btn.innerHTML = old;
  }));
}

// ---------- 갤러리 ----------
function initGallery() {
  const g = $('.gallery'); if (!g) return;
  const main = $('.gallery__main img', g); const thumbs = $$('.gallery__thumbs button', g); const srcs = thumbs.map(t => t.dataset.full);
  let cur = 0;
  function show(k) { cur = (k + srcs.length) % srcs.length; main.src = srcs[cur]; thumbs.forEach((t, n) => n === cur ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')); const c = $('.gallery__count b', g); if (c) c.textContent = cur + 1; }
  thumbs.forEach((t, n) => t.addEventListener('click', () => show(n)));
  // 라이트박스
  let lb = $('#lightbox');
  if (!lb) {
    lb = document.createElement('div'); lb.className = 'modal'; lb.id = 'lightbox'; lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML = `<div class="modal__panel modal__panel--wide"><button class="modal__close" type="button" data-modal-close aria-label="닫기">${ICON_ERR}</button><img class="lightbox__img" alt="매장 사진 확대"><button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="이전"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button><button class="lightbox__nav lightbox__nav--next" type="button" aria-label="다음"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div><button class="modal__backdrop" type="button" data-modal-close aria-label="닫기"></button>`;
    document.body.appendChild(lb);
    $$('[data-modal-close]', lb).forEach(b => b.addEventListener('click', closeModals));
    $('.lightbox__nav--prev', lb).addEventListener('click', () => { show(cur - 1); $('.lightbox__img', lb).src = srcs[cur]; });
    $('.lightbox__nav--next', lb).addEventListener('click', () => { show(cur + 1); $('.lightbox__img', lb).src = srcs[cur]; });
  }
  main.addEventListener('click', () => { $('.lightbox__img', lb).src = srcs[cur]; openModal('lightbox'); });
  document.addEventListener('keydown', e => { if (lb.getAttribute('aria-hidden') === 'false') { if (e.key === 'ArrowLeft') $('.lightbox__nav--prev', lb).click(); if (e.key === 'ArrowRight') $('.lightbox__nav--next', lb).click(); } });
  show(0);
}

// ---------- 최근 본 매물 ----------
function trackRecent() {
  const d = document.body.dataset; if (!d.listingId) return;
  const a = store.get('recent', []).filter(x => x.id !== d.listingId);
  a.unshift({ id: d.listingId, t: d.listingTitle, img: d.listingImg, at: Date.now() });
  store.set('recent', a.slice(0, 12));
}
function renderRecent() {
  const host = $('[data-recent]'); if (!host) return;
  const a = store.get('recent', []).filter(x => x.id !== document.body.dataset.listingId);
  if (!a.length) { host.closest('section')?.remove(); return; }
  host.innerHTML = a.slice(0, 6).map(x => `<a class="chip" href="${CU.base}/listing/${x.id}/">${x.img ? `<img src="${x.img}" alt="" width="28" height="21" style="border-radius:6px;object-fit:cover">` : ''}<span>${x.t}</span></a>`).join('');
}

// ---------- 검색어 추천 ----------
let SUGGEST = null;
async function initSuggest() {
  const inputs = $$('input[data-suggest]'); if (!inputs.length) return;
  inputs.forEach(inp => {
    const box = document.createElement('div'); box.className = 'suggest'; inp.parentElement.appendChild(box);
    let active = -1;
    inp.addEventListener('input', async () => {
      const q = inp.value.trim(); if (q.length < 1) { box.classList.remove('is-open'); return; }
      if (!SUGGEST) { try { SUGGEST = await (await fetch(`${CU.base}/suggest.json`)).json(); } catch { return; } }
      const n = q.replace(/\s/g, '').toLowerCase();
      const hits = SUGGEST.filter(s => s.k.includes(n)).slice(0, 8);
      if (!hits.length) { box.classList.remove('is-open'); return; }
      box.innerHTML = hits.map(h => `<button type="button" data-q="${h.q}">${h.t}<small>${h.n}건</small></button>`).join('');
      box.classList.add('is-open'); active = -1;
      $$('button', box).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); inp.value = b.dataset.q; inp.form.submit(); }));
    });
    inp.addEventListener('keydown', e => { const bs = $$('button', box); if (!box.classList.contains('is-open') || !bs.length) return; if (e.key === 'ArrowDown') { active = (active + 1) % bs.length; } else if (e.key === 'ArrowUp') { active = (active - 1 + bs.length) % bs.length; } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); inp.value = bs[active].dataset.q; inp.form.submit(); return; } else return; e.preventDefault(); bs.forEach((b, i) => b.classList.toggle('is-active', i === active)); });
    inp.addEventListener('blur', () => setTimeout(() => box.classList.remove('is-open'), 120));
  });
}

// ---------- 기타 ----------
function initMisc() {
  $$('[data-scroll-top]').forEach(b => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })));
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => { copy(b.dataset.copy); toast(`${b.dataset.copyLabel || '복사'} 완료: ${b.dataset.copy}`, 'ok'); }));
  $$('[data-share]').forEach(b => b.addEventListener('click', async () => { const d = { title: document.title, url: location.href }; if (navigator.share) { try { await navigator.share(d); } catch {} } else { copy(location.href); toast('링크를 복사했습니다.', 'ok'); } }));
  const fab = $('.filter-fab'); if (fab) fab.addEventListener('click', () => { const f = $('.filters'); f.classList.toggle('is-open'); });
  // 헤더 그림자
  const hdr = $('.hdr'); window.addEventListener('scroll', () => hdr && hdr.classList.toggle('is-scrolled', window.scrollY > 10), { passive: true });
  // 플로팅 CTA 는 상세 스티키바가 있으면 모바일에서 숨김
  if ($('.sticky-bar') && matchMedia('(max-width:860px)').matches) { const f = $('#floatCta'); if (f) f.style.display = 'none'; }
}

initDrawer(); initModals(); initHero(); initReveal(); initCall(); initSms(); initGallery(); trackRecent(); renderRecent(); initSuggest(); initMisc();
