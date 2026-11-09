// 창업미디어 공통 인터랙션: 히어로 롤링, 드로어, 모달, 토스트, 갤러리 라이트박스, 통화 연결 알림, 문자 상담 폼, 검색 추천
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
  const hero = $('.hero2') || $('.hero'); if (!hero) return;
  const track = $('.hero2__track, .hero__track', hero); const slides = $$('.hslide, .slide', track); if (slides.length < 2) return;
  let i = 0, timer, startX = null;
  const dots = $('[data-hero-pager], .hero__dots', hero); const counter = $('.hero__counter', hero);
  slides.forEach((_, k) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `${k + 1}번 배너`); b.addEventListener('click', () => go(k, true)); dots.appendChild(b); });
  function go(k, user) { i = (k + slides.length) % slides.length; track.style.transform = `translateX(-${i * 100}%)`; $$('button', dots).forEach((b, n) => n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')); if (counter) counter.textContent = `${i + 1} / ${slides.length}`; if (user) restart(); }
  function restart() { clearInterval(timer); timer = setInterval(() => go(i + 1), 5600); }
  $('.hero2__arrow--prev, .hero__arrow--prev', hero)?.addEventListener('click', () => go(i - 1, true));
  $('.hero2__arrow--next, .hero__arrow--next', hero)?.addEventListener('click', () => go(i + 1, true));
  hero.addEventListener('pointerdown', e => { startX = e.clientX; });
  hero.addEventListener('pointerup', e => { if (startX == null) return; const dx = e.clientX - startX; startX = null; if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1, true); });
  $$('.hslide__box, .hero2__pager', hero).forEach(el => { el.addEventListener('mouseenter', () => clearInterval(timer)); el.addEventListener('mouseleave', restart); });
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : restart());
  go(0); restart();
}

// ---------- 탭 (스켈레톤 전환) ----------
function initTabs() {
  $$('[data-tabs]').forEach(t => {
    const nav = $(':scope > .tabs__nav', t); const tabs = $$(':scope > .tabs__nav > [role=tab]', t); const panels = $$(':scope > .tabs__panels > .tabs__panel', t); const sk = $(':scope > .tabs__panels > .tabs__skeleton', t); let busy = false; let quiet = false; let stopped = false; let resume;
    tabs.forEach((tab, k) => tab.addEventListener('click', e => {
      if (e.isTrusted) { stopped = true; clearTimeout(resume); resume = setTimeout(() => { stopped = false; }, 15000); }
      if (busy || tab.getAttribute('aria-selected') === 'true') return; busy = true;
      tabs.forEach(x => x.setAttribute('aria-selected', 'false')); tab.setAttribute('aria-selected', 'true');
      panels.forEach(p => p.hidden = true);
      if (nav && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: tab.offsetLeft - nav.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' });
      const show = () => { if (sk) sk.hidden = true; if (panels[k]) panels[k].hidden = false; $$('.reveal', panels[k] || t).forEach(el => el.classList.add('is-in')); busy = false; };
      if (sk && !quiet) { sk.hidden = false; setTimeout(show, 260); } else show();
    }));
    t.addEventListener('keydown', e => { const idx = tabs.indexOf(document.activeElement); if (idx < 0) return; let n = null; if (e.key === 'ArrowRight') n = (idx + 1) % tabs.length; if (e.key === 'ArrowLeft') n = (idx - 1 + tabs.length) % tabs.length; if (n != null) { tabs[n].focus(); tabs[n].click(); } });
    const auto = Number(t.dataset.auto || 0);
    if (auto && tabs.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let hold = false, seen = false;
      nav.addEventListener('mouseenter', () => hold = true); nav.addEventListener('mouseleave', () => hold = false); t.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) hold = true; }); t.addEventListener('focusout', () => hold = false);
      new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: .25 }).observe(t);
      setInterval(() => { if (stopped || hold || !seen || document.hidden) return; const i = tabs.findIndex(x => x.getAttribute('aria-selected') === 'true'); quiet = true; tabs[(i + 1) % tabs.length].click(); quiet = false; }, auto);
    }
  });
}

// ---------- 한 줄 롤링 카드 ----------
function initRails() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-rail]').forEach(r => {
    const t = $('.rail__track', r); const bar = $('.rail__bar i', r); const total = t.children.length; let hold = false, busy = false, turned = 0;
    const step = () => { const it = t.children[0]; return it ? it.getBoundingClientRect().width + (parseFloat(getComputedStyle(t).columnGap) || 16) : 300; };
    const paint = () => { const max = t.scrollWidth - t.clientWidth; const view = t.clientWidth / (t.scrollWidth || 1); r.classList.toggle('is-static', max <= 2); if (!bar) return; const w = view * 100; const pos = (((turned + t.scrollLeft / step()) % total) + total) % total; bar.style.width = `${Math.round(w)}%`; bar.style.marginLeft = `${Math.min(100 - w, pos / total * 100).toFixed(1)}%`; };
    // 스크롤 스냅을 잠시 끄고 시간 기반으로 이동 (브라우저별 부드러운 스크롤·스냅 충돌 방지)
    function glide(to, done) {
      const from = t.scrollLeft; const start = Date.now(); const dur = still ? 0 : 520; t.style.scrollSnapType = 'none';
      const tick = () => { const p = dur ? Math.min(1, (Date.now() - start) / dur) : 1; t.scrollLeft = from + (to - from) * (1 - Math.pow(1 - p, 3)); if (p < 1) setTimeout(tick, 16); else { done && done(); t.style.scrollSnapType = ''; paint(); busy = false; } };
      tick();
    }
    function move(d) {
      if (busy || t.scrollWidth - t.clientWidth <= 2) return; busy = true; const w = step();
      if (d > 0) { const base = t.scrollLeft; glide(base + w, () => { t.style.scrollSnapType = 'none'; t.appendChild(t.children[0]); t.scrollLeft = base; turned++; }); }
      else { t.style.scrollSnapType = 'none'; t.insertBefore(t.children[t.children.length - 1], t.children[0]); t.scrollLeft += w; turned--; glide(t.scrollLeft - w); }
    }
    t.addEventListener('scroll', paint, { passive: true }); addEventListener('resize', paint); paint(); new ResizeObserver(paint).observe(t);
    $('[data-rail-prev]', r)?.addEventListener('click', () => move(-1)); $('[data-rail-next]', r)?.addEventListener('click', () => move(1));
    r.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) hold = true; }); r.addEventListener('focusout', () => hold = false);
    let tm; t.addEventListener('touchstart', () => { hold = true; clearTimeout(tm); }, { passive: true }); t.addEventListener('touchend', () => { tm = setTimeout(() => hold = false, 4000); }, { passive: true });
    const auto = Number(r.dataset.auto || 0);
    if (auto && !still) setInterval(() => { if (hold || document.hidden || r.offsetParent === null) return; const b = r.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return; move(1); }, auto);
  });
}

// ---------- 조건형 리드 폼 ----------
let LEAD_INDEX = null;
function initLead() {
  $$('form[data-lead]').forEach(f => {
    const root = f.closest('.lead'); const steps = $$('[data-step]', f); const no = $('[data-lead-no]', f); const label = $('[data-lead-label]', f); const bar = $('[data-lead-bar]', f); const prev = $('[data-lead-prev]', f); const next = $('[data-lead-next]', f); const submit = $('[data-lead-submit]', f); const count = $('[data-lead-count]', root); const msg = f.elements.message;
    f.classList.add('is-js');
    const presetOn = $$('.lead__opt.is-on', f); let i = 0;
    const val = n => $$(`.lead__opt.is-on[data-n="${n}"]`, f).map(b => b.dataset.v);
    function sync() {
      for (const n of ['budget', 'category', 'area', 'style', 'timing']) f.elements[n].value = val(n).join(', ');
      const v = (k, t) => t ? `${k}: ${t}` : '';
      msg.value = [v('권리금', val('budget').join(', ')), v('업종', val('category').join(', ')), v('상권', val('area').join(', ')), v('지역', [f.elements.sido.value, f.elements.gugun.value].filter(Boolean).join(' ')), v('운영', val('style').join(', ')), v('시기', val('timing').join(', ')), v('희망 브랜드', f.elements.brandWish.value), v('유입', document.title.split('|')[0].trim())].filter(Boolean).join(' / ');
      tally();
    }
    function show(k) { i = Math.max(0, Math.min(steps.length - 1, k)); steps.forEach((s, n) => s.classList.toggle('is-on', n === i)); no.textContent = i + 1; label.textContent = steps[i].dataset.label; bar.style.width = `${(i + 1) / steps.length * 100}%`; prev.style.visibility = i ? 'visible' : 'hidden'; next.hidden = i === steps.length - 1; submit.hidden = i !== steps.length - 1; }
    async function tally() {
      if (!LEAD_INDEX) { try { LEAD_INDEX = await (await fetch(`${CU.base}/search-index.json`)).json(); } catch { return; } }
      const b = $('.lead__opt.is-on[data-n="budget"][data-min]', f); const cat = val('category')[0]; const sido = f.elements.sido.value; const areas = val('area').filter(a => ['역세권', '1군상권', '대학가', '몰·마트', '병원', '신도시'].includes(a)); const auto = val('style').includes('오토·투잡');
      const names = $$('.lead__opt[data-n="category"]', f).map(o => o.dataset.v);
      const n = LEAD_INDEX.filter(e => (!b || (e.premium != null && e.premium >= +b.dataset.min && e.premium < +b.dataset.max)) && (!cat || cat === names[names.length - 1] || e.k1 === cat) && (!sido || (sido === '기타' ? !['서울', '경기', '인천'].includes(e.s) : e.s === sido)) && (!areas.length || areas.some(a => e.tags.includes(a))) && (!auto || e.tags.some(t => ['풀오토', '오토운영', '투잡'].includes(t)))).length;
      count.textContent = n.toLocaleString('ko-KR');
      count.closest('[data-lead-live]').classList.toggle('is-zero', n === 0);
    }
    f.addEventListener('click', e => {
      const o = e.target.closest('.lead__opt'); if (!o) return;
      const multi = !!o.parentElement.closest('[data-multi]');
      if (!multi) { $$(`.lead__opt[data-n="${o.dataset.n}"]`, f).forEach(x => { if (x !== o) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); } }); }
      o.classList.toggle('is-on', multi ? undefined : true); o.setAttribute('aria-pressed', o.classList.contains('is-on'));
      sync();
      if (!multi && (o.dataset.n === 'budget' || o.dataset.n === 'category')) setTimeout(() => show(i + 1), 180);
    });
    f.addEventListener('input', sync);
    f.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && i < steps.length - 1) { e.preventDefault(); show(i + 1); } });
    prev.addEventListener('click', () => show(i - 1)); next.addEventListener('click', () => show(i + 1));
    f.addEventListener('reset', () => setTimeout(() => { $$('.lead__opt', f).forEach(o => { const on = presetOn.includes(o); o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); }); sync(); show(0); }));
    show(0); sync();
  });
}

// ---------- 스크롤 리빌·카운터·바 ----------
function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; e.target.classList.add('is-in'); io.unobserve(e.target);
    $$('[data-count]', e.target).concat(e.target.matches('[data-count]') ? [e.target] : []).forEach(el => countUp(el));
    $$('.bar__fill[data-w]', e.target).forEach(b => { b.style.width = b.dataset.w + '%'; });
  }), { threshold: .15 });
  $$('.reveal, .stat, .sales__box').forEach(el => io.observe(el));
  setTimeout(() => $$('.reveal:not(.is-in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); }), 1200);
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


// ---------- 진행 절차 스크롤 시퀀스 ----------
function initSeq() {
  const root = $('[data-seq]'); if (!root) return;
  const steps = $$('[data-seq-step]', root); const btns = $$('[data-seq-go]', root); const prog = $('[data-seq-progress]', root);
  if (!steps.length) return;
  let active = 0;
  function setActive(i) {
    active = i;
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-past', k < i); });
    btns.forEach((b, k) => { b.setAttribute('aria-current', k === i ? 'step' : 'false'); b.parentElement.classList.toggle('is-done', k < i); });
    if (prog) prog.style.height = `${Math.round(i / Math.max(1, steps.length - 1) * 100)}%`;
    const nav = btns[i] && btns[i].closest('.seq__nav'); if (nav && nav.scrollWidth > nav.clientWidth) btns[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  // 뷰포트 상단 40% 지점을 지나는 단계를 활성화 (IntersectionObserver: 배경 탭에서도 동작)
  const pick = () => { const mid = innerHeight * 0.42; let best = 0, bd = Infinity; steps.forEach((s, k) => { const r = s.getBoundingClientRect(); const d = Math.abs((r.top + Math.min(r.height, 320) / 2) - mid); if (d < bd) { bd = d; best = k; } }); if (best !== active) setActive(best); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(() => pick(), { rootMargin: '-30% 0px -50% 0px', threshold: [0, .25, .5, .75, 1] });
    steps.forEach(s => io.observe(s));
  }
  addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick);
  btns.forEach((b, k) => b.addEventListener('click', () => { steps[k].scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(k); }));
  setActive(0); pick();
}

// ---------- 히어로 2~9번 배경은 첫 화면 이후 지연 적용 ----------
function initHeroBg() {
  const apply = () => $$('.hslide[data-bg]').forEach(s => { s.style.setProperty('--bg', `url('${s.dataset.bg}')`); s.style.setProperty('--bg-m', `url('${s.dataset.bgM || s.dataset.bg}')`); s.removeAttribute('data-bg'); });
  if (document.readyState === 'complete') setTimeout(apply, 300); else addEventListener('load', () => setTimeout(apply, 300));
}

// ---------- 지역별 지도 ↔ 시도 탭 동기화 ----------
function initRegionMap() {
  const root = $('[data-region-map]'); if (!root) return;
  const tabs = $$('[data-sido-tab]', root); const chips = $$('.chips--sido .chip', root); const paths = $$('.kmap__sido', root);
  const go = sido => { const t = tabs.find(x => x.dataset.sidoTab === sido); if (t && t.getAttribute('aria-selected') !== 'true') t.click(); chips.forEach(c => c.classList.toggle('is-on', c.dataset.sido === sido)); paths.forEach(p => p.classList.toggle('is-hover', p.dataset.sido === sido)); };
  paths.forEach(p => { if (!p.classList.contains('is-has')) return; p.addEventListener('mouseenter', () => go(p.dataset.sido)); p.addEventListener('focus', () => go(p.dataset.sido)); p.closest('a')?.addEventListener('focus', () => go(p.dataset.sido)); });
  chips.forEach(c => { if (!c.dataset.sido || c.classList.contains('is-dim')) return; c.addEventListener('mouseenter', () => go(c.dataset.sido)); c.addEventListener('focus', () => go(c.dataset.sido)); });
  // 터치 기기: 첫 탭은 선택, 두 번째 탭은 이동
  let last = '';
  root.addEventListener('click', e => { const a = e.target.closest('.kmap a, .chips--sido .chip[data-sido]'); if (!a || !matchMedia('(hover:none)').matches) return; const sido = (a.dataset.sido ?? $('.kmap__sido', a)?.dataset.sido) || ''; if (!sido) return; if (last !== sido) { e.preventDefault(); last = sido; go(sido); } });
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
  if ($('.sticky-bar')) { document.body.classList.add('has-sticky'); if (matchMedia('(max-width:860px)').matches) { const f = $('#floatCta'); if (f) f.style.display = 'none'; } }
}

initDrawer(); initModals(); initHero(); initHeroBg(); initTabs(); initRails(); initLead(); initSeq(); initRegionMap(); initReveal(); initCall(); initSms(); initGallery(); trackRecent(); renderRecent(); initSuggest(); initMisc();
