// 창업가이드 관리자 — 단일 파일 SPA (해시 라우터). 서버(API) 또는 데모(브라우저 저장) 모드 자동 전환.
import { createApi } from './api.js';
import { CATEGORIES, THEMES, BUDGETS, SIDO_ORDER } from '../js/data.mjs';
import { GUGUN, BRAND_LIST, makeTitle, fmtWon, fmtMan, fmtNum, parseWon, brandByName, extractTags, fmtDate, cleanRawTitle } from '../js/lib/text.mjs';

const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const app = $('#app'); let api, me, unread = 0, cache = {};
const BASE = (window.CU_BASE || '').replace('__SITE_BASE__', '');
const siteUrl = p => `${location.origin}${BASE}${p}`;
const TAGS = ['풀오토', '오토운영', '급매', '특급', '역세권', '배달', '주5일', '신규오픈', '리뉴얼', '1군상권', '주차완비', '대기업', '초보추천', '여성추천', '시니어추천', '소자본', '고수익', '투잡', '신도시', '대학가', '병원', '몰·마트'];
const STATUS = { active: ['공개', 'g'], held: ['보류', 'y'], done: ['거래완료', 'b'], archived: ['삭제', 'c'] };
const INQ_STATUS = { new: ['새 문의', 'r'], contacted: ['연락 중', 'y'], done: ['완료', 'g'], spam: ['스팸', 'c'] };
const photoSrc = p => !p ? '' : p.startsWith('data:') || /^https?:/.test(p) ? p : p.startsWith('upload/') ? 'https://www.changupmedia.com/' + p : `../${p}`;
const thumbSrc = p => !p ? '' : p.startsWith('data:') || /^https?:/.test(p) ? p : p.startsWith('upload/') ? 'https://www.changupmedia.com/' + p : `../${p.replace('photos/', 'photos/thumb/')}`;

export function toast(msg, kind = '', ms = 3200) { const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), ms); }
const fail = e => { console.error(e); toast(e.message || String(e), 'err', 4500); };
const agentName = id => (cache.agents || []).find(a => a.id === id)?.name || id || '-';

// ---------- 라우터 ----------
const routes = {};
function route(path, fn) { routes[path] = fn; }
async function render() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [name, ...rest] = hash.split('/');
  if (!me) return renderLogin();
  const fn = routes[name] || routes.dashboard;
  try { cache.agents = cache.agents || await api.agents(); } catch {}
  app.innerHTML = shell(name);
  const view = $('#view');
  view.innerHTML = '<div class="loading">불러오는 중…</div>';
  try { await fn(view, rest); } catch (e) { view.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  try { const m = await api.me(); unread = m.unread; const b = $('[data-unread]'); if (b) b.textContent = unread || ''; if (b) b.classList.toggle('hide', !unread); } catch {}
}
window.addEventListener('hashchange', render);

function shell(active) {
  const nav = [['dashboard', '대시보드'], ['listings', '매물 관리'], ['photos', '사진 라이브러리'], ['inbox', '문의함'], ['calls', '통화 알림'], ['messages', '메시지·공지'], ['posts', '발행 글'], ...(me.isAdmin ? [['agents', '담당자 관리'], ['settings', '설정']] : [['profile', '내 정보']])];
  return `<div class="shell"><aside class="side" id="side">
    <a class="logo" href="#/dashboard"><svg viewBox="0 0 48 48"><path d="M6 32 24 8l18 24z" fill="#FFCC00" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="26" r="5" fill="#2D4CFF"/></svg>창업<b>가이드</b></a>
    ${nav.map(([k, n]) => `<a class="nav ${active === k ? 'is-on' : ''}" href="#/${k}">${n}${k === 'messages' ? `<span class="cnt ${unread ? '' : 'hide'}" data-unread>${unread || ''}</span>` : ''}</a>`).join('')}
    <a class="nav" href="../" target="_blank">사이트 보기 ↗</a>
    <div class="me"><b>${esc(me.name)}</b>${esc(me.role)} · ${me.isAdmin ? '관리자' : '담당자'}<br><span class="muted">${esc(me.id)}</span><button class="btn btn--sm btn--block" data-logout>로그아웃</button></div>
  </aside><main class="main"><div class="topbar"><div style="display:flex;gap:8px;align-items:center"><button class="btn btn--sm mobile-menu" data-menu>☰</button><h1 id="title"></h1></div><div id="actions"></div></div>${api.demo ? `<div class="demo-bar">데모 모드 — 입력 내용은 이 브라우저에만 저장됩니다. 서버(API) 연결 시 실제 데이터·문자 발송·자동 재빌드가 동작합니다. <button class="btn btn--sm" data-demo-reset>데모 초기화</button></div>` : ''}<div id="view"></div></main></div>`;
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-logout]')) { await api.logout(); me = null; render(); }
  if (e.target.closest('[data-menu]')) $('#side').classList.toggle('is-open');
  if (e.target.closest('[data-demo-reset]') && confirm('데모 데이터를 초기 상태로 되돌릴까요?')) { api.reset(); location.reload(); }
  const nav = e.target.closest('.side a'); if (nav) $('#side')?.classList.remove('is-open');
});
const setTitle = (t, actions = '') => { $('#title').textContent = t; $('#actions').innerHTML = actions; };

// ---------- 로그인 ----------
function renderLogin() {
  app.innerHTML = `<div class="login"><div class="card"><div class="logo">창업<b>가이드</b> 관리자</div><p class="muted" style="margin-bottom:16px">담당 창업전문가·관리자 전용</p>
    <form id="loginForm" class="grid2" style="grid-template-columns:1fr"><label class="field"><span>아이디</span><input name="id" required autocomplete="username" placeholder="담당자 아이디"></label><label class="field"><span>비밀번호</span><input name="password" type="password" required autocomplete="current-password"></label><button class="btn btn--red btn--lg btn--block" type="submit">로그인</button></form>
    ${api.demo ? `<div class="alert info" style="margin-top:14px">데모 모드: 아이디 <code class="kbd">admin</code>(관리자) 또는 담당자 아이디(예: <code class="kbd">${esc((cache.agents || api.db?.agents || []).find(a => !a.isAdmin)?.id || 'lovechang2')}</code>), 비밀번호 <code class="kbd">1234</code></div>` : '<p class="muted" style="margin-top:12px;font-size:.82rem">비밀번호를 잊으셨으면 관리자에게 재설정을 요청하세요.</p>'}
  </div></div>`;
  $('#loginForm').addEventListener('submit', async e => { e.preventDefault(); const f = new FormData(e.target); try { const r = await api.login(f.get('id').trim(), f.get('password')); me = r.user; toast(`${me.name}님 환영합니다`, 'ok'); location.hash = '#/dashboard'; render(); } catch (err) { fail(err); } });
}

// ---------- 대시보드 ----------
route('dashboard', async view => {
  setTitle('대시보드', `<a class="btn btn--red" href="#/listings/new">+ 매물 등록</a>`);
  const [s, inq, calls, notices, msgs] = await Promise.all([api.stats(), api.inquiries(), api.calls(), api.notices(), api.messages()]);
  const newInq = inq.filter(i => i.status === 'new').slice(0, 6); const recentCalls = calls.slice(0, 6); const un = msgs.filter(m => m.toId === me.id && !m.readAt);
  view.innerHTML = `<div class="grid4">
    <div class="stat"><b>${s.listings}</b><span>공개 매물${me.isAdmin ? ' (전체)' : ' (내 담당)'}</span></div><div class="stat ink"><b>${s.held}</b><span>보류 매물</span></div><div class="stat"><b>${s.newInquiries}</b><span>새 문의</span></div><div class="stat blue"><b>${s.callsToday}</b><span>24시간 내 통화 연결</span></div></div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>새 문의 <a class="btn btn--sm" href="#/inbox">전체</a></h2>${newInq.length ? `<table class="table">${newInq.map(i => `<tr><td><span class="badge ${INQ_STATUS[i.status][1]}">${{ sms: '문자상담', buy: '창업의뢰', sell: '양도의뢰' }[i.type] || i.type}</span></td><td><b>${esc(i.name)}</b><br><a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></td><td class="muted">${esc((i.message || '').slice(0, 40))}${i.listingId ? `<br><a href="#/listings/${i.listingId}">No.${i.listingId}</a>` : ''}</td><td class="muted nowrap">${fmtDate(i.createdAt)}</td></tr>`).join('')}</table>` : '<p class="muted">새 문의가 없습니다.</p>'}</div>
      <div class="card"><h2>최근 통화 연결 <a class="btn btn--sm" href="#/calls">전체</a></h2>${recentCalls.length ? `<table class="table">${recentCalls.map(c => `<tr><td><a href="#/listings/${c.listingId}">No.${c.listingId || '-'}</a><br><span class="muted">${esc((c.title || '').slice(0, 34))}</span></td><td>${me.isAdmin ? esc(agentName(c.agentId)) : ''}</td><td><span class="badge ${c.smsStatus === 'sent' ? 'g' : c.smsStatus === 'demo' ? 'y' : 'r'}">${c.smsStatus === 'sent' ? '문자 발송' : c.smsStatus === 'demo' ? '데모' : '미발송'}</span></td><td class="muted nowrap">${new Date(c.createdAt).toLocaleString('ko-KR', { hour12: false }).slice(0, 17)}</td></tr>`).join('')}</table>` : '<p class="muted">아직 통화 연결 기록이 없습니다. 고객이 매물에서 "담당자 전화 연결"을 누르면 여기에 기록되고 담당자에게 매물 링크가 문자로 갑니다.</p>'}</div>
      <div class="card"><h2>공지 <a class="btn btn--sm" href="#/messages">전체</a></h2>${notices.slice(0, 4).map(n => `<p><span class="badge ${n.readByMe ? 'c' : 'r'}">${n.readByMe ? '읽음' : 'NEW'}</span> <b>${esc(n.title)}</b> <span class="muted">${fmtDate(n.createdAt)}</span></p>`).join('') || '<p class="muted">공지가 없습니다.</p>'}</div>
      <div class="card"><h2>받은 메시지 <a class="btn btn--sm" href="#/messages">열기</a></h2>${un.length ? un.slice(0, 4).map(m => `<p><b>${esc(agentName(m.fromId))}</b>: ${esc(m.body.slice(0, 60))}</p>`).join('') : '<p class="muted">읽지 않은 메시지가 없습니다.</p>'}</div>
    </div>
    <div class="card" style="margin-top:14px"><h2>바로가기</h2><div class="chips"><a class="chip" href="#/listings/new">매물 등록</a><a class="chip" href="#/photos">사진 올리기</a><a class="chip" href="#/inbox">문의 처리</a>${me.isAdmin ? '<a class="chip" href="#/posts">오늘 글 발행</a><a class="chip" href="#/settings">문자 발송 설정</a>' : '<a class="chip" href="#/profile">내 정보·비밀번호</a>'}<a class="chip" href="../listings/" target="_blank">사이트 검색 페이지 ↗</a></div>${s.lastBuild ? `<p class="muted" style="margin-top:10px;font-size:.82rem">사이트 반영: ${s.lastBuild.ok ? '정상' : '실패'} · ${fmtDate(s.lastBuild.at)} ${new Date(s.lastBuild.at).toLocaleTimeString('ko-KR', { hour12: false })}${s.lastBuild.ms ? ` (${(s.lastBuild.ms / 1000).toFixed(1)}초)` : ''}</p>` : ''}</div>`;
});

// ---------- 매물 목록 ----------
route('listings', async (view, rest) => {
  if (rest[0] === 'new') return listingForm(view, null);
  if (rest[0]) return listingForm(view, rest[0]);
  setTitle('매물 관리', `<a class="btn btn--red" href="#/listings/new">+ 매물 등록</a>`);
  const all = await api.listings(); cache.listings = all;
  const st = { q: '', status: 'active', mine: !me.isAdmin, page: 1 };
  const draw = () => {
    const n = s => String(s || '').replace(/\s/g, '').toLowerCase();
    let items = all.filter(l => (st.status === 'all' ? l.status !== 'archived' : l.status === st.status) && (!st.mine || l.agentId === me.id));
    if (st.q) { const q = n(st.q); items = items.filter(l => n(`${l.id} ${l.title} ${l.titleRaw} ${l.brand} ${l.sido} ${l.gugun} ${l.agentName}`).includes(q)); }
    const per = 30, pages = Math.max(1, Math.ceil(items.length / per)); if (st.page > pages) st.page = pages;
    const slice = items.slice((st.page - 1) * per, st.page * per);
    view.innerHTML = `<div class="toolbar"><input type="search" placeholder="번호·제목·브랜드·지역·담당자 검색" value="${esc(st.q)}" data-q><select data-status>${[['active', '공개'], ['held', '보류'], ['done', '거래완료'], ['archived', '삭제됨'], ['all', '전체(삭제 제외)']].map(([v, t]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${t}</option>`).join('')}</select>${me.isAdmin ? `<label class="chip ${st.mine ? 'is-on' : ''}" data-mine>내 담당만</label>` : ''}<span class="muted">${items.length}건</span></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>사진</th><th>번호</th><th>제목 (자동)</th><th>지역·브랜드</th><th class="right">월매출</th><th class="right">월수익</th><th class="right">권리금</th><th>담당</th><th>상태</th><th>갱신</th><th></th></tr></thead><tbody>
    ${slice.map(l => `<tr data-id="${l.id}"><td>${l.images && l.images[0] ? `<img class="thumb" src="${thumbSrc(l.images[0])}" alt="">` : '<div class="thumb"></div>'}</td><td>${l.id}</td><td><a href="#/listings/${l.id}"><b>${esc(l.title)}</b></a><br><span class="muted" style="font-size:.78rem">${esc((l.summary || '').slice(0, 50))}</span></td><td>${esc([l.sido, l.gugun].join(' '))}<br><span class="badge y">${esc(l.brand || l.kind2 || '-')}</span></td><td class="right">${l.sales ? fmtMan(l.sales) : '-'}</td><td class="right" style="color:var(--red);font-weight:900">${l.profit ? fmtMan(l.profit) : '-'}</td><td class="right" style="color:var(--blue);font-weight:900">${l.premium ? fmtWon(l.premium) : '협의'}</td><td>${esc(l.agentName)}</td><td><span class="badge ${STATUS[l.status]?.[1] || 'c'}">${STATUS[l.status]?.[0] || l.status}</span></td><td class="muted nowrap">${fmtDate(l.updatedAt)}</td><td class="nowrap"><a class="btn btn--sm" href="#/listings/${l.id}">수정</a> <a class="btn btn--sm btn--ghost" href="../listing/${l.id}/" target="_blank">보기</a></td></tr>`).join('') || '<tr><td colspan="11" class="muted">매물이 없습니다.</td></tr>'}</tbody></table></div>
    <div class="pager">${Array.from({ length: pages }, (_, i) => `<button ${i + 1 === st.page ? 'aria-current="page"' : ''} data-p="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    $('[data-q]', view).addEventListener('input', e => { st.q = e.target.value; st.page = 1; const pos = e.target.selectionStart; draw(); const inp = $('[data-q]', view); inp.focus(); inp.setSelectionRange(pos, pos); });
    $('[data-status]', view).addEventListener('change', e => { st.status = e.target.value; st.page = 1; draw(); });
    $('[data-mine]', view)?.addEventListener('click', () => { st.mine = !st.mine; st.page = 1; draw(); });
    $$('[data-p]', view).forEach(b => b.addEventListener('click', () => { st.page = Number(b.dataset.p); draw(); }));
  };
  draw();
});

// ---------- 매물 등록/수정 폼 ----------
async function listingForm(view, id) {
  let l, base = null, lock = null;
  if (id) { const r = await api.getListing(id); l = structuredClone(r.item); base = l.updatedAt; lock = r.lock; api.lock(id).catch(() => {}); }
  else l = { status: 'active', sido: '서울', gugun: '', brand: '', brandSlug: '', kind1: '', kind2: '', code: null, kindCode: null, theme: '', newTown: '', sales: null, expense: null, profit: null, monthlyCost: null, premium: null, areaM2: null, floor: '', salesBasis: 1, expenseBreakdown: {}, summary: '', description: '', tags: [], images: [], agentId: me.id, agentName: me.name, agentPhone: me.mobile };
  const canEdit = !id || me.isAdmin || l.agentId === me.id;
  setTitle(id ? `매물 수정 No.${id}` : '매물 등록', `<a class="btn" href="#/listings">목록</a>${id ? ` <a class="btn btn--ghost" href="../listing/${id}/" target="_blank">사이트에서 보기 ↗</a>` : ''}`);
  const cat = CATEGORIES.find(c => c.name === l.kind1) || CATEGORIES.find(c => c.code === l.code);
  const eb = l.expenseBreakdown || {};
  const fieldNum = (name, label, val, hint = '', req = false) => `<label class="field ${req ? 'req' : ''}"><span>${label}</span><input name="${name}" inputmode="numeric" value="${val ?? ''}" placeholder="만원 단위 숫자"><span class="hint">${hint}</span></label>`;
  view.innerHTML = `${!canEdit ? `<div class="alert err">이 매물은 ${esc(l.agentName)} 담당입니다. 본인 담당 매물만 수정할 수 있으며, 담당 변경은 관리자에게 메시지로 요청하세요.</div>` : ''}${lock ? `<div class="lock-banner">⚠ ${esc(lock.name || lock.agentId)}님이 ${new Date(lock.at).toLocaleTimeString('ko-KR', { hour12: false })}부터 이 매물을 편집 중입니다. 동시에 저장하면 나중 저장이 거부됩니다.</div>` : ''}
  <form id="lf" ${!canEdit ? 'inert' : ''}>
  <div class="title-preview"><small>자동 생성 제목 (지역 + 브랜드 + 매출·수익 + 예산) — 입력하면 바로 바뀝니다</small><span data-title-preview>${esc(makeTitle(l))}</span></div>
  <div class="fsec"><h3><span class="num">1</span>지역·업종·브랜드</h3><div class="grid4">
    <label class="field req"><span>시·도</span><select name="sido">${SIDO_ORDER.map(s => `<option ${l.sido === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <label class="field req"><span>구·시·군</span><select name="gugun"></select></label>
    <label class="field"><span>브랜드 (프랜차이즈명)</span><input name="brand" list="brands" value="${esc(l.brand)}" placeholder="예) 메가커피 — 없으면 비움"><datalist id="brands">${BRAND_LIST.map(b => `<option value="${esc(b.name)}">`).join('')}</datalist><span class="hint">사전에 있는 이름을 쓰면 브랜드 페이지·검색에 자동 연결됩니다</span></label>
    <label class="field"><span>테마</span><select name="theme"><option value="">선택 안 함</option>${THEMES.map(t => `<option ${l.theme === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
    <label class="field req"><span>업종 (대분류)</span><select name="kind1"><option value="">선택</option>${CATEGORIES.map(c => `<option ${c.name === l.kind1 ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <label class="field req"><span>업종 (소분류)</span><select name="kind2"></select></label>
    <label class="field"><span>신도시 상권</span><input name="newTown" value="${esc(l.newTown || '')}" placeholder="예) 위례신도시 (해당 시)"></label>
    <label class="field"><span>상태</span><select name="status">${Object.entries(STATUS).filter(([k]) => k !== 'archived').map(([k, [t]]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div></div>
  <div class="fsec"><h3><span class="num">2</span>숫자 (만원 단위, 임대보증금 제외)</h3><div class="grid4">
    ${fieldNum('sales', '월매출', l.sales, '예) 3500 → 3,500만원')}${fieldNum('expense', '월지출', l.expense, '재료비+인건비+월비용+관리비+기타')}${fieldNum('profit', '월수익 (세전)', l.profit, '비우면 월매출-월지출로 자동 계산', true)}${fieldNum('monthlyCost', '월비용 (임대료 등)', l.monthlyCost, '월세·관리비 등 고정비')}
    <label class="field req"><span>권리금 (예산)</span><input name="premium" value="${l.premium ?? ''}" placeholder="12000 또는 1억2천"><span class="hint">숫자(만원) 또는 "1억5천" 형식. 비우면 "협의"</span></label>
    ${fieldNum('areaM2', '면적 (㎡)', l.areaM2, '평 × 3.3 = ㎡')}<label class="field"><span>층</span><input name="floor" value="${esc(l.floor || '')}" placeholder="1"></label>
    <label class="field"><span>매출 근거</span><select name="salesBasis">${[[1, '매출 자료 확인 (POS·카드)'], [2, '양도인 진술'], [3, '담당자 현장 확인']].map(([v, t]) => `<option value="${v}" ${Number(l.salesBasis) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div>
  <details style="margin-top:10px"><summary style="font-weight:900;cursor:pointer">월지출 세부 내역 (선택) — 비율은 자동 계산</summary><div class="grid4" style="margin-top:8px">${['재료비', '인건비', '월비용(세전)', '관리비', '기타경비'].map(k => `<label class="field"><span>${k}</span><input name="eb_${k}" inputmode="numeric" value="${eb[k]?.amount ?? ''}" placeholder="만원"></label>`).join('')}</div><div class="bars" data-bars style="margin-top:8px"></div></details></div>
  <div class="fsec"><h3><span class="num">3</span>사진 <span class="muted" style="font-weight:500;font-size:.82rem">첫 사진이 대표 사진 · 라이브러리에서 고르거나 새로 올리기</span></h3><div class="photos-pick" data-photos></div></div>
  <div class="fsec"><h3><span class="num">4</span>설명</h3>
    <label class="field"><span>한줄 요약 (셀링포인트)</span><input name="summary" value="${esc(l.summary || '')}" maxlength="120" placeholder="예) 목동역 초역세권 · 풀오토 운영 · 직원 승계 가능"></label>
    <label class="field" style="margin-top:10px"><span>태그 (스티커 배지)</span><div class="chips" data-tags>${TAGS.map(t => `<span class="chip ${(l.tags || []).includes(t) ? 'is-on' : ''}" data-tag="${t}">${t}</span>`).join('')}</div></label>
    <label class="field" style="margin-top:10px"><span>상세 설명 (담당 전문가의 안내)</span><textarea name="description" rows="8" placeholder="매장 특징, 상권, 운영 방식, 양도 사유 등. 정확한 위치·상호는 적지 마세요.">${esc(l.description || '')}</textarea></label>
    ${l.titleRaw ? `<p class="muted" style="font-size:.8rem;margin-top:8px">기존 사이트 원제목: ${esc(l.titleRaw)}</p>` : ''}
  </div>
  ${me.isAdmin ? `<div class="fsec"><h3><span class="num">5</span>담당자</h3><label class="field"><span>담당 창업전문가</span><select name="agentId">${(cache.agents || []).filter(a => a.active !== false).map(a => `<option value="${a.id}" ${a.id === l.agentId ? 'selected' : ''}>${esc(a.name)} (${esc(a.mobile)})${a.isAdmin ? ' · 관리자' : ''}</option>`).join('')}</select><span class="hint">담당을 바꾸면 양쪽 담당자에게 메시지가 갑니다</span></label></div>` : `<p class="muted">담당: ${esc(l.agentName)} (${esc(l.agentPhone)})</p>`}
  </form>
  <div class="drawer__foot" style="width:auto;left:240px">${id && canEdit ? `<button class="btn btn--ghost" type="button" data-archive style="margin-right:auto;color:var(--red)">삭제(보관)</button>` : ''}<a class="btn" href="#/listings">취소</a>${canEdit ? `<button class="btn btn--red btn--lg" type="button" data-save>${id ? '저장' : '등록'}</button>` : ''}</div>`;
  const f = $('#lf');
  const fillGugun = () => { const s = f.sido.value; f.gugun.innerHTML = `<option value="">선택</option>${(GUGUN[s] || []).map(g => `<option ${g === l.gugun ? 'selected' : ''}>${g}</option>`).join('')}`; };
  const fillKind2 = () => { const c = CATEGORIES.find(c => c.name === f.kind1.value); f.kind2.innerHTML = `<option value="">선택</option>${(c ? c.kinds : []).map(k => `<option value="${k[1]}" ${k[1] === l.kind2 ? 'selected' : ''}>${k[1]}</option>`).join('')}`; };
  fillGugun(); fillKind2();
  const read = () => {
    const d = { ...l };
    d.sido = f.sido.value; d.gugun = f.gugun.value; d.brand = f.brand.value.trim(); const b = brandByName(d.brand); d.brand = b && !b.generic ? b.name : d.brand; d.brandSlug = b && !b.generic ? b.slug : ''; d.theme = f.theme.value; d.kind1 = f.kind1.value; d.kind2 = f.kind2.value; const c = CATEGORIES.find(c => c.name === d.kind1); d.code = c ? c.code : null; d.kindCode = c ? (c.kinds.find(k => k[1] === d.kind2) || [null])[0] : null; d.newTown = f.newTown.value.trim(); d.status = f.status.value;
    d.sales = parseWon(f.sales.value); d.expense = parseWon(f.expense.value); d.profit = parseWon(f.profit.value) ?? (d.sales && d.expense ? d.sales - d.expense : null); d.monthlyCost = parseWon(f.monthlyCost.value); d.premium = parseWon(f.premium.value); d.areaM2 = f.areaM2.value ? Number(f.areaM2.value) : null; d.floor = f.floor.value.trim(); d.salesBasis = Number(f.salesBasis.value);
    const ebd = {}; let tot = 0; for (const k of ['재료비', '인건비', '월비용(세전)', '관리비', '기타경비']) { const v = parseWon(f[`eb_${k}`].value); if (v != null) { ebd[k] = { amount: v }; tot += v; } } const den = d.sales || tot; for (const k in ebd) ebd[k].pct = den ? Math.round(ebd[k].amount / den * 1000) / 10 : 0; d.expenseBreakdown = ebd; if (!d.expense && tot) d.expense = tot;
    d.summary = f.summary.value.trim(); d.description = f.description.value.trim(); d.tags = $$('[data-tag].is-on', f).map(x => x.dataset.tag); d.images = images.slice(); if (f.agentId) d.agentId = f.agentId.value;
    d.title = makeTitle(d); return d;
  };
  let images = (l.images || []).slice();
  const drawPhotos = () => { $('[data-photos]', f).innerHTML = images.map((p, i) => `<div class="ph">${i === 0 ? '<span class="main">대표</span>' : ''}<img src="${thumbSrc(p)}" alt=""><button type="button" class="x" data-rm="${i}">×</button><div class="mv">${i > 0 ? `<button type="button" data-mv="${i}:-1">‹</button>` : ''}${i < images.length - 1 ? `<button type="button" data-mv="${i}:1">›</button>` : ''}</div></div>`).join('') + `<button type="button" class="add" data-pick>＋ 라이브러리에서<br>선택 / 업로드</button>`; $$('[data-rm]', f).forEach(b => b.addEventListener('click', () => { images.splice(Number(b.dataset.rm), 1); drawPhotos(); })); $$('[data-mv]', f).forEach(b => b.addEventListener('click', () => { const [i, d] = b.dataset.mv.split(':').map(Number); const t = images[i]; images[i] = images[i + d]; images[i + d] = t; drawPhotos(); })); $('[data-pick]', f).addEventListener('click', () => photoPicker(sel => { for (const p of sel) if (!images.includes(p)) images.push(p); drawPhotos(); })); };
  drawPhotos();
  const sync = () => { const d = read(); $('[data-title-preview]', f).textContent = d.title; const rows = Object.entries(d.expenseBreakdown); $('[data-bars]', f).innerHTML = rows.map(([k, v]) => `<div class="bar"><span>${k}</span><div class="track"><div class="fill" style="width:${Math.min(100, v.pct)}%"></div></div><span>${fmtNum(v.amount)}만 · ${v.pct}%</span></div>`).join(''); if (!f.profit.value && d.sales && d.expense) f.profit.placeholder = `자동: ${fmtNum(d.sales - d.expense)}`; };
  f.addEventListener('input', sync); f.addEventListener('change', sync);
  f.sido.addEventListener('change', () => { l.gugun = ''; fillGugun(); sync(); }); f.kind1.addEventListener('change', () => { l.kind2 = ''; fillKind2(); sync(); });
  $$('[data-tag]', f).forEach(c => c.addEventListener('click', () => { c.classList.toggle('is-on'); sync(); }));
  f.brand.addEventListener('change', () => { const b = brandByName(f.brand.value); if (b && !b.generic && b.name !== f.brand.value) { f.brand.value = b.name; toast(`브랜드명을 "${b.name}"으로 통일했습니다`, 'ok'); } sync(); });
  sync();
  $('[data-save]')?.addEventListener('click', async () => {
    const d = read(); const errs = [];
    if (!d.sido || !d.gugun) errs.push('지역(시·도, 구·시·군)'); if (!d.kind1 || !d.kind2) errs.push('업종'); if (!d.profit && !d.sales) errs.push('월매출 또는 월수익'); if (!d.images.length) errs.push('사진 1장 이상');
    if (errs.length) return toast('입력 확인: ' + errs.join(', '), 'err', 4500);
    const btn = $('[data-save]'); btn.disabled = true;
    try {
      const r = id ? await api.updateListing(d, base) : await api.createListing(d);
      if (r.duplicateOf) toast(`주의: 같은 조건의 매물 No.${r.duplicateOf}이 이미 있습니다 (등록은 완료)`, 'err', 6000);
      toast(id ? '저장했습니다. 사이트에는 잠시 후 반영됩니다.' : `등록했습니다 (No.${r.item.id}). 사이트에는 잠시 후 반영됩니다.`, 'ok'); cache.listings = null; location.hash = '#/listings';
    } catch (e) { if (e.status === 409) { if (confirm(e.message + '\n\n지금 화면의 내용을 버리고 최신 내용을 불러올까요?')) render(); } else fail(e); btn.disabled = false; }
  });
  $('[data-archive]')?.addEventListener('click', async () => { if (!confirm('이 매물을 삭제(보관)할까요? 사이트에서 내려가며 목록의 "삭제됨"에서 복구할 수 있습니다.')) return; try { await api.archiveListing(id); toast('삭제(보관)했습니다', 'ok'); cache.listings = null; location.hash = '#/listings'; } catch (e) { fail(e); } });
}

// ---------- 사진 라이브러리 / 피커 ----------
async function resizeImage(file, max = 1600, q = .85) { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return { data: c.toDataURL('image/jpeg', q), w: c.width, h: c.height }; }
async function uploadFiles(files, tags = []) { const out = []; for (const file of files) { if (!/^image\//.test(file.type)) continue; const big = await resizeImage(file, 1600, .85); const th = await resizeImage(file, 480, .8); const it = await api.uploadPhoto({ name: file.name, data: big.data, thumb: th.data, w: big.w, h: big.h, tags }); out.push(it); } return out; }
function photoPicker(onPick) {
  const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel"><h2 style="display:flex;justify-content:space-between;align-items:center">사진 선택 <button class="btn btn--sm" data-close>닫기</button></h2><div class="toolbar"><input type="search" placeholder="파일명·태그·매물번호" data-q><label class="chip is-on" data-mine>내 사진</label><label class="btn btn--yellow btn--sm">＋ 새 사진 업로드<input type="file" accept="image/*" multiple hidden data-up></label><span class="muted" data-cnt></span></div><div class="lib" data-lib></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn--red" data-ok>선택한 사진 추가</button></div></div>`;
  document.body.appendChild(m); let items = [], sel = new Set(), mine = true, q = '';
  const draw = () => { const n = s => String(s || '').toLowerCase(); const list = items.filter(p => (!mine || p.agentId === me.id) && (!q || n(p.name + ' ' + (p.tags || []).join(' ')).includes(n(q)))); $('[data-lib]', m).innerHTML = list.slice(0, 200).map(p => `<div class="it ${sel.has(p.file) ? 'is-on' : ''}" data-f="${esc(p.file)}"><img src="${thumbSrc(p.thumb || p.file)}" loading="lazy" alt=""><div class="meta">${esc(p.name)}${p.tags?.length ? ' · ' + esc(p.tags.join(',')) : ''}</div></div>`).join('') || '<p class="muted">사진이 없습니다. 새 사진을 업로드하세요.</p>'; $('[data-cnt]', m).textContent = `${list.length}장`; $$('.it', m).forEach(it => it.addEventListener('click', () => { const f = it.dataset.f; sel.has(f) ? sel.delete(f) : sel.add(f); it.classList.toggle('is-on'); })); };
  api.photos().then(r => { items = r; draw(); });
  $('[data-q]', m).addEventListener('input', e => { q = e.target.value; draw(); }); $('[data-mine]', m).addEventListener('click', e => { mine = !mine; e.target.classList.toggle('is-on', mine); draw(); });
  $('[data-up]', m).addEventListener('change', async e => { try { toast('업로드 중…'); const up = await uploadFiles([...e.target.files]); items = [...up, ...items]; for (const p of up) sel.add(p.file); draw(); toast(`${up.length}장 업로드 완료`, 'ok'); } catch (err) { fail(err); } });
  $('[data-close]', m).addEventListener('click', () => m.remove()); $('.modal__bg', m).addEventListener('click', () => m.remove());
  $('[data-ok]', m).addEventListener('click', () => { onPick([...sel]); m.remove(); });
}
route('photos', async view => {
  setTitle('사진 라이브러리', `<label class="btn btn--red">＋ 사진 업로드<input type="file" accept="image/*" multiple hidden data-up></label>`);
  let items = await api.photos(); let mine = !me.isAdmin, q = '';
  const draw = () => { const n = s => String(s || '').toLowerCase(); const list = items.filter(p => (!mine || p.agentId === me.id) && (!q || n(p.name + ' ' + (p.tags || []).join(' ') + ' ' + agentName(p.agentId)).includes(n(q)))); view.innerHTML = `<div class="toolbar"><input type="search" placeholder="파일명·태그·담당자" value="${esc(q)}" data-q>${me.isAdmin ? `<label class="chip ${mine ? 'is-on' : ''}" data-mine>내 사진만</label>` : ''}<span class="muted">${list.length}장 · 매물 등록 화면에서 "라이브러리에서 선택"으로 바로 쓸 수 있습니다</span></div><div class="lib">${list.slice(0, 300).map(p => `<div class="it" title="${esc(p.name)} · ${esc(agentName(p.agentId))}"><img src="${thumbSrc(p.thumb || p.file)}" loading="lazy" alt=""><div class="meta">${esc(p.name)} · ${esc(agentName(p.agentId))}</div>${(me.isAdmin || p.agentId === me.id) ? `<button class="del" data-del="${p.id}" title="삭제">×</button>` : ''}</div>`).join('') || '<p class="muted">사진이 없습니다.</p>'}</div>`; $('[data-q]', view).addEventListener('input', e => { q = e.target.value; const pos = e.target.selectionStart; draw(); const i = $('[data-q]', view); i.focus(); i.setSelectionRange(pos, pos); }); $('[data-mine]', view)?.addEventListener('click', () => { mine = !mine; draw(); }); $$('[data-del]', view).forEach(b => b.addEventListener('click', async () => { if (!confirm('이 사진을 삭제할까요? 매물에서 사용 중이면 삭제되지 않습니다.')) return; try { await api.deletePhoto(b.dataset.del); items = items.filter(p => p.id !== b.dataset.del); draw(); toast('삭제했습니다', 'ok'); } catch (e) { fail(e); } })); };
  draw();
  $('[data-up]').addEventListener('change', async e => { try { toast('업로드 중…'); const up = await uploadFiles([...e.target.files]); items = [...up, ...items]; draw(); toast(`${up.length}장 업로드 완료`, 'ok'); } catch (err) { fail(err); } });
});

// ---------- 문의함 ----------
route('inbox', async view => {
  setTitle('문의함');
  let items = await api.inquiries(); let st = 'new', sel = null;
  const TYPE = { sms: '문자상담', buy: '창업의뢰', sell: '양도의뢰' };
  const draw = () => { const list = items.filter(i => st === 'all' || i.status === st); view.innerHTML = `<div class="toolbar">${['new', 'contacted', 'done', 'spam', 'all'].map(k => `<span class="chip ${st === k ? 'is-on' : ''}" data-st="${k}">${k === 'all' ? '전체' : INQ_STATUS[k][0]} ${k === 'all' ? items.length : items.filter(i => i.status === k).length}</span>`).join('')}</div><div class="grid2" style="grid-template-columns:1.2fr 1fr;align-items:start"><div class="table-wrap"><table class="table"><thead><tr><th>유형</th><th>고객</th><th>내용</th><th>매물</th><th>담당</th><th>상태</th><th>접수</th></tr></thead><tbody>${list.map(i => `<tr class="${sel === i.id ? 'is-sel' : ''}" data-id="${i.id}" style="cursor:pointer"><td><span class="badge c">${TYPE[i.type] || i.type}</span></td><td><b>${esc(i.name)}</b><br>${esc(i.phone)}</td><td class="muted">${esc((i.message || '').slice(0, 36))}</td><td>${i.listingId ? `<a href="#/listings/${i.listingId}">No.${i.listingId}</a>` : '-'}</td><td>${esc(agentName(i.agentId))}</td><td><span class="badge ${INQ_STATUS[i.status]?.[1] || 'c'}">${INQ_STATUS[i.status]?.[0] || i.status}</span></td><td class="muted nowrap">${fmtDate(i.createdAt)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">문의가 없습니다.</td></tr>'}</tbody></table></div><div class="card inq-detail" data-detail>${sel ? detail(items.find(i => i.id === sel)) : '<p class="muted">왼쪽 목록에서 문의를 선택하세요.</p>'}</div></div>`;
    $$('[data-st]', view).forEach(c => c.addEventListener('click', () => { st = c.dataset.st; draw(); })); $$('tr[data-id]', view).forEach(r => r.addEventListener('click', () => { sel = r.dataset.id; draw(); }));
    const d = $('[data-detail]', view); d.querySelector('[data-save]')?.addEventListener('click', async () => { const i = items.find(x => x.id === sel); try { await api.updateInquiry(sel, { status: d.querySelector('[name=status]').value, note: d.querySelector('[name=note]').value, agentId: d.querySelector('[name=agentId]')?.value }); i.status = d.querySelector('[name=status]').value; i.note = d.querySelector('[name=note]').value; if (d.querySelector('[name=agentId]')) i.agentId = d.querySelector('[name=agentId]').value; toast('저장했습니다', 'ok'); draw(); } catch (e) { fail(e); } }); };
  const detail = i => { const extra = Object.entries(i.data || {}).filter(([k]) => !['name', 'phone', 'message', 'listingId', 'agentId', 'type', 'url', 'at', 'agree'].includes(k) && i.data[k]); return `<h2>${TYPE[i.type] || i.type} · ${esc(i.name)}</h2><dl><dt>연락처</dt><dd><a href="tel:${esc(i.phone)}" class="btn btn--sm btn--yellow">☎ ${esc(i.phone)}</a> <a href="sms:${esc(i.phone)}" class="btn btn--sm">문자</a></dd><dt>내용</dt><dd>${esc(i.message || '-')}</dd>${i.listingId ? `<dt>매물</dt><dd><a href="#/listings/${i.listingId}">No.${i.listingId}</a> · <a href="../listing/${i.listingId}/" target="_blank">사이트 ↗</a></dd>` : ''}${extra.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join('')}<dt>접수</dt><dd>${new Date(i.createdAt).toLocaleString('ko-KR', { hour12: false })}${i.data?.url ? `<br><span class="muted" style="font-size:.78rem">${esc(i.data.url)}</span>` : ''}</dd></dl><hr style="border:0;border-top:2px dashed var(--line);margin:12px 0"><div class="grid2"><label class="field"><span>처리 상태</span><select name="status">${Object.entries(INQ_STATUS).map(([k, [t]]) => `<option value="${k}" ${i.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>${me.isAdmin ? `<label class="field"><span>담당자</span><select name="agentId"><option value="">미배정</option>${(cache.agents || []).map(a => `<option value="${a.id}" ${a.id === i.agentId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>` : ''}</div><label class="field" style="margin-top:8px"><span>처리 메모</span><textarea name="note" rows="3">${esc(i.note || '')}</textarea></label><button class="btn btn--red" style="margin-top:10px" data-save>저장</button>`; };
  draw();
});

// ---------- 통화 알림 ----------
route('calls', async view => {
  setTitle('통화 연결 알림', '<span class="muted">고객이 매물에서 "담당자 전화 연결"을 누른 기록 · 담당자에게 매물 링크 문자 발송</span>');
  const items = await api.calls();
  view.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>시각</th><th>매물</th><th>담당</th><th>문자 발송</th><th>기기</th></tr></thead><tbody>${items.map(c => `<tr><td class="nowrap">${new Date(c.createdAt).toLocaleString('ko-KR', { hour12: false })}</td><td>${c.listingId ? `<a href="#/listings/${c.listingId}"><b>No.${c.listingId}</b></a><br><span class="muted">${esc((c.title || '').slice(0, 60))}</span>` : '<span class="muted">담당자 페이지</span>'}</td><td>${esc(agentName(c.agentId))}<br><span class="muted">${esc(c.phone || '')}</span></td><td><span class="badge ${c.smsStatus === 'sent' ? 'g' : c.smsStatus === 'demo' ? 'y' : 'r'}">${c.smsStatus === 'sent' ? '발송' : c.smsStatus === 'demo' ? '데모' : '실패'}</span><br><span class="muted" style="font-size:.74rem">${esc((c.smsDetail || '').slice(0, 60))}</span></td><td class="muted" style="font-size:.78rem">${esc((c.ua || '').replace(/Mozilla\/5\.0 \(([^)]+)\).*/, '$1').slice(0, 40))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">기록이 없습니다.</td></tr>'}</tbody></table></div>`;
});

// ---------- 메시지·공지 ----------
route('messages', async view => {
  setTitle('메시지·공지', me.isAdmin ? '<button class="btn btn--yellow" data-notice>+ 공지 작성</button>' : '');
  const [msgs, notices] = await Promise.all([api.messages(), api.notices()]);
  const contacts = me.isAdmin ? [{ id: '*', name: '전체 담당자 (공지 메시지)' }, ...(cache.agents || []).filter(a => a.id !== me.id)] : [...(cache.agents || []).filter(a => a.isAdmin), ...(cache.agents || []).filter(a => !a.isAdmin && a.id !== me.id)];
  let cur = contacts[0]?.id;
  const draw = () => { const th = msgs.filter(m => cur === '*' ? m.toId === '*' : (m.fromId === cur && m.toId === me.id) || (m.fromId === me.id && m.toId === cur)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); view.innerHTML = `<div class="card" style="margin-bottom:14px"><h2>공지</h2>${notices.map(n => `<details ${n.readByMe ? '' : 'open'} style="border-bottom:1px dashed var(--line);padding:6px 0"><summary style="font-weight:900;cursor:pointer"><span class="badge ${n.readByMe ? 'c' : 'r'}">${n.readByMe ? '읽음' : 'NEW'}</span> ${esc(n.title)} <span class="muted" style="font-weight:500">${fmtDate(n.createdAt)} · ${esc(agentName(n.authorId))}${me.isAdmin ? ` · 읽음 ${n.reads}명` : ''}</span></summary><p style="white-space:pre-wrap;padding:8px 0 4px">${esc(n.body)}</p>${!n.readByMe ? `<button class="btn btn--sm" data-read="${n.id}">확인했습니다</button>` : ''}</details>`).join('') || '<p class="muted">공지가 없습니다.</p>'}</div>
    <div class="msgs"><div class="list">${contacts.map(c => { const u = msgs.filter(m => m.fromId === c.id && m.toId === me.id && !m.readAt).length; return `<button class="${cur === c.id ? 'is-on' : ''}" data-c="${c.id}">${esc(c.name)}${c.isAdmin ? ' <span class="badge y">관리자</span>' : ''}${u ? `<span class="badge r">${u}</span>` : ''}</button>`; }).join('')}</div>
    <div class="thread"><div class="body">${th.map(m => `<div class="bubble ${m.fromId === me.id ? 'me' : ''}">${esc(m.body)}${m.listingId ? ` <a href="#/listings/${m.listingId}"><b>No.${m.listingId}</b></a>` : ''}<small>${esc(agentName(m.fromId))} · ${new Date(m.createdAt).toLocaleString('ko-KR', { hour12: false }).slice(0, 17)}${m.toId === '*' ? ' · 전체' : ''}</small></div>`).join('') || '<p class="muted">대화가 없습니다. 담당 변경 요청, 매물 확인 요청 등을 남겨보세요.</p>'}</div><form data-send><textarea name="body" placeholder="메시지 (예: No.743098 담당 변경 요청드립니다)" required></textarea><div style="display:flex;flex-direction:column;gap:6px"><button class="btn btn--red" type="submit">보내기</button>${!api.demo && me.isAdmin ? '<label class="chip" style="font-size:.74rem"><input type="checkbox" name="sms"> 문자도</label>' : ''}</div></form></div></div>`;
    $$('[data-c]', view).forEach(b => b.addEventListener('click', () => { cur = b.dataset.c; draw(); })); $$('[data-read]', view).forEach(b => b.addEventListener('click', async () => { await api.readNotice(b.dataset.read); const n = notices.find(x => x.id === b.dataset.read); n.readByMe = 1; draw(); }));
    $('[data-send]', view).addEventListener('submit', async e => { e.preventDefault(); const fd = new FormData(e.target); const body = fd.get('body').trim(); if (!body) return; const lm = body.match(/No\.?\s*(\d{5,7})/i); try { await api.sendMessage({ toId: cur, body, listingId: lm ? lm[1] : '', sms: !!fd.get('sms') }); msgs.unshift({ id: 'tmp' + Date.now(), fromId: me.id, toId: cur, body, listingId: lm ? lm[1] : '', createdAt: new Date().toISOString() }); draw(); } catch (err) { fail(err); } }); const b = $('.thread .body', view); b.scrollTop = b.scrollHeight; };
  draw();
  $('[data-notice]')?.addEventListener('click', () => { const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel" style="width:min(560px,100%)"><h2>공지 작성</h2><form data-f style="display:grid;gap:10px;margin-top:10px"><label class="field"><span>제목</span><input name="title" required></label><label class="field"><span>내용</span><textarea name="body" rows="6" required></textarea></label>${!api.demo ? '<label class="chip"><input type="checkbox" name="sms"> 담당자 전원에게 문자 알림</label>' : ''}<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn" data-close>취소</button><button class="btn btn--red" type="submit">게시</button></div></form></div>`; document.body.appendChild(m); $('[data-close]', m).addEventListener('click', () => m.remove()); $('[data-f]', m).addEventListener('submit', async e => { e.preventDefault(); const fd = new FormData(e.target); try { await api.postNotice({ title: fd.get('title'), body: fd.get('body'), sms: !!fd.get('sms') }); m.remove(); toast('공지를 게시했습니다', 'ok'); render(); } catch (err) { fail(err); } }); });
});

// ---------- 발행 글 ----------
route('posts', async view => {
  setTitle('창업 인사이트 발행', me.isAdmin ? '<button class="btn btn--red" data-gen>오늘 글 3편 생성</button>' : '');
  const items = await api.posts();
  const today = new Date().toISOString().slice(0, 10);
  view.innerHTML = `<div class="alert info">매일 <b>09:05 · 13:05 · 18:05</b>에 지역·브랜드·예산이 모두 확인된 매물을 골라 1편씩 자동 발행됩니다 (GitHub Actions 또는 서버 스케줄). 제목과 본문에는 항상 <b>지역 + 브랜드 + 예산(권리금)</b>이 들어갑니다. 오늘 발행: <b>${items.filter(p => String(p.date).slice(0, 10) === today).length}편</b></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>발행일</th><th>제목</th><th>분류</th><th>매물</th><th>상태</th><th></th></tr></thead><tbody>${items.map(p => `<tr><td class="nowrap">${esc(String(p.date).slice(0, 16).replace('T', ' '))}</td><td><b>${esc(p.title)}</b></td><td>${esc(p.category || '')}</td><td>${p.listingId ? `<a href="#/listings/${p.listingId}">No.${p.listingId}</a>` : '-'}</td><td><span class="badge ${p.status === 'published' ? 'g' : 'y'}">${p.status === 'published' ? '발행' : '초안'}</span></td><td class="nowrap"><a class="btn btn--sm" href="../blog/${encodeURIComponent(p.slug)}/" target="_blank">보기</a> ${me.isAdmin ? `<button class="btn btn--sm btn--ghost" data-toggle="${esc(p.slug)}" data-st="${p.status}">${p.status === 'published' ? '내리기' : '발행'}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">아직 발행된 글이 없습니다.</td></tr>'}</tbody></table></div>`;
  $$('[data-toggle]', view).forEach(b => b.addEventListener('click', async () => { try { await api.updatePost(b.dataset.toggle, { status: b.dataset.st === 'published' ? 'draft' : 'published' }); toast('변경했습니다', 'ok'); render(); } catch (e) { fail(e); } }));
  $('[data-gen]')?.addEventListener('click', async () => { const b = $('[data-gen]'); b.disabled = true; b.textContent = '생성 중…'; try { const r = await api.generatePosts({ count: 3 }); toast(r.log || (r.ok ? '생성 완료' : '실패'), r.ok ? 'ok' : 'err', 6000); render(); } catch (e) { fail(e); b.disabled = false; } });
});

// ---------- 담당자 관리 (관리자) ----------
route('agents', async view => {
  if (!me.isAdmin) { location.hash = '#/profile'; return; }
  setTitle('담당자 관리', '<button class="btn btn--red" data-new>+ 담당자 추가</button>');
  const items = await api.agents(); cache.agents = items; const listings = cache.listings || await api.listings(); cache.listings = listings;
  view.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>이름</th><th>아이디</th><th>직책</th><th>휴대폰</th><th>카톡 / 이메일</th><th class="right">공개 매물</th><th>권한</th><th>상태</th><th></th></tr></thead><tbody>${items.map(a => `<tr><td>${a.photo ? `<img class="avatar" src="${thumbSrc(a.photo)}" alt="">` : '<div class="avatar"></div>'}</td><td><b>${esc(a.name)}</b></td><td class="muted">${esc(a.id)}</td><td>${esc(a.role)}</td><td>${esc(a.mobile)}</td><td class="muted">${esc(a.kakao || '-')}<br>${esc(a.email || '')}</td><td class="right">${listings.filter(l => l.agentId === a.id && l.status === 'active').length}</td><td>${a.isAdmin ? '<span class="badge y">관리자</span>' : '담당자'}</td><td><span class="badge ${a.active !== false ? 'g' : 'c'}">${a.active !== false ? '활성' : '비활성'}</span></td><td><button class="btn btn--sm" data-edit="${a.id}">수정</button></td></tr>`).join('')}</tbody></table></div><p class="muted" style="margin-top:10px;font-size:.84rem">담당자를 비활성화하면 로그인이 막히고 사이트의 담당자 목록에서 빠집니다. 그 담당자의 매물은 남아 있으므로 다른 담당자에게 이관하세요(매물 수정 → 담당자).</p>`;
  const edit = a => agentForm(a, async () => { cache.agents = null; render(); });
  $$('[data-edit]', view).forEach(b => b.addEventListener('click', () => edit(items.find(a => a.id === b.dataset.edit))));
  $('[data-new]').addEventListener('click', () => edit(null));
});
function agentForm(a, done) {
  const isNew = !a; a = a || { id: '', name: '', role: '창업전문가', mobile: '', tel: '02-515-8900', kakao: '', email: '', photo: '', intro: '', active: true, isAdmin: false };
  const self = !isNew && a.id === me.id;
  const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel"><h2>${isNew ? '담당자 추가' : `${esc(a.name)} 정보 수정`}</h2><form data-f style="display:grid;gap:10px;margin-top:10px"><div class="grid2">
    <label class="field req"><span>아이디 (로그인)</span><input name="id" value="${esc(a.id)}" ${isNew ? 'required pattern="[A-Za-z0-9_]{3,20}"' : 'readonly'} placeholder="영문·숫자 3~20자"></label><label class="field req"><span>이름</span><input name="name" value="${esc(a.name)}" required></label>
    <label class="field"><span>직책</span><input name="role" value="${esc(a.role)}" placeholder="팀장 / 전무 / 창업전문가"></label><label class="field req"><span>휴대폰 (고객 연결·문자 수신)</span><input name="mobile" value="${esc(a.mobile)}" required placeholder="010-0000-0000"></label>
    <label class="field"><span>사무실 전화</span><input name="tel" value="${esc(a.tel || '')}"></label><label class="field"><span>카카오톡 ID</span><input name="kakao" value="${esc(a.kakao || '')}"></label>
    <label class="field"><span>이메일</span><input name="email" value="${esc(a.email || '')}"></label><label class="field"><span>프로필 사진</span><div style="display:flex;gap:8px;align-items:center">${a.photo ? `<img class="avatar" src="${thumbSrc(a.photo)}" alt="" data-ph-img>` : '<div class="avatar" data-ph-img></div>'}<input type="hidden" name="photo" value="${esc(a.photo || '')}"><label class="btn btn--sm">올리기<input type="file" accept="image/*" hidden data-ph></label></div></label></div>
    <label class="field"><span>소개 (담당자 페이지에 표시)</span><textarea name="intro" rows="4">${esc(a.intro || '')}</textarea></label>
    ${me.isAdmin ? `<div class="chips"><label class="chip"><input type="checkbox" name="active" ${a.active !== false ? 'checked' : ''}> 활성</label><label class="chip"><input type="checkbox" name="isAdmin" ${a.isAdmin ? 'checked' : ''}> 관리자 권한</label></div>` : ''}
    <div class="grid2">${!isNew && self && !me.isAdmin ? '<label class="field"><span>현재 비밀번호</span><input name="currentPassword" type="password" autocomplete="current-password"></label>' : ''}<label class="field"><span>${isNew ? '초기 비밀번호' : '새 비밀번호 (변경 시만)'}</span><input name="password" type="password" autocomplete="new-password" placeholder="${isNew ? '비우면 changeme1234' : '비우면 유지'}"></label></div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn" data-close>취소</button><button class="btn btn--red" type="submit">저장</button></div></form></div>`;
  document.body.appendChild(m); $('[data-close]', m).addEventListener('click', () => m.remove());
  $('[data-ph]', m).addEventListener('change', async e => { try { const up = await uploadFiles([e.target.files[0]], ['프로필']); if (up[0]) { m.querySelector('[name=photo]').value = up[0].file; const img = $('[data-ph-img]', m); const n = document.createElement('img'); n.className = 'avatar'; n.src = thumbSrc(up[0].thumb || up[0].file); n.dataset.phImg = ''; img.replaceWith(n); toast('사진 올림', 'ok'); } } catch (err) { fail(err); } });
  $('[data-f]', m).addEventListener('submit', async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries()); fd.active = !!e.target.active?.checked; fd.isAdmin = !!e.target.isAdmin?.checked; if (!fd.password) delete fd.password; try { if (isNew) await api.createAgent(fd); else await api.updateAgent(a.id, fd); if (self) { me = { ...me, ...fd, password: undefined }; } m.remove(); toast('저장했습니다', 'ok'); done(); } catch (err) { fail(err); } });
}
route('profile', async view => { setTitle('내 정보'); view.innerHTML = `<div class="card"><p><b>${esc(me.name)}</b> ${esc(me.role)} · ${esc(me.mobile)} · ${esc(me.id)}</p><p class="muted">고객 통화 연결·문자 알림은 위 휴대폰 번호로 갑니다. 번호가 바뀌면 꼭 수정하세요.</p><button class="btn btn--red" data-edit>정보·비밀번호 수정</button></div>`; $('[data-edit]', view).addEventListener('click', () => agentForm(me, () => { cache.agents = null; render(); })); });

// ---------- 설정 (관리자) ----------
route('settings', async view => {
  if (!me.isAdmin) { location.hash = '#/dashboard'; return; }
  setTitle('설정');
  const s = await api.settings(); const sms = s.sms || {};
  view.innerHTML = `<div class="grid2" style="align-items:start">
    <div class="card"><h2>통화 알림·문의 문자 발송</h2><form data-sms style="display:grid;gap:10px">
      <label class="field"><span>발송 서비스</span><select name="provider">${[['none', '사용 안 함 (기록만)'], ['aligo', '알리고 (apis.aligo.in)'], ['solapi', '솔라피 / 쿨SMS']].map(([v, t]) => `<option value="${v}" ${sms.provider === v ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="hint">알리고·솔라피 모두 사전에 발신번호 등록이 필요합니다. 키는 서버에만 저장됩니다.</span></label>
      <label class="field"><span>발신번호</span><input name="sender" value="${esc(sms.sender || '')}" placeholder="등록된 발신번호 (예 01055486188)"></label>
      <div class="grid2"><label class="field"><span>알리고 API key</span><input name="aligoKey" value="${esc(sms.aligoKey || '')}"></label><label class="field"><span>알리고 user_id</span><input name="aligoUser" value="${esc(sms.aligoUser || '')}"></label><label class="field"><span>솔라피 API key</span><input name="solapiKey" value="${esc(sms.solapiKey || '')}"></label><label class="field"><span>솔라피 API secret</span><input name="solapiSecret" value="${esc(sms.solapiSecret || '')}"></label></div>
      <label class="chip"><input type="checkbox" name="notifyAdmin" ${s.notifyAdmin ? 'checked' : ''}> 새 문의가 오면 관리자에게도 문자</label>
      <div style="display:flex;gap:8px"><button class="btn btn--red" type="submit">저장</button><button class="btn" type="button" data-test>내 번호로 테스트 발송</button></div></form></div>
    <div><div class="card"><h2>사이트 반영</h2><p class="muted">매물·담당자 변경은 저장 후 약 10초 뒤 자동으로 사이트에 반영됩니다. 바로 반영하려면 아래 버튼.</p>${s.lastBuild ? `<p>마지막 반영: <b>${s.lastBuild.ok ? '정상' : '실패'}</b> · ${new Date(s.lastBuild.at).toLocaleString('ko-KR', { hour12: false })}${s.lastBuild.ms ? ` · ${(s.lastBuild.ms / 1000).toFixed(1)}초` : ''}</p>${!s.lastBuild.ok ? `<pre style="white-space:pre-wrap;font-size:.75rem;background:var(--cream-2);padding:8px;border-radius:8px">${esc(s.lastBuild.log || '')}</pre>` : ''}` : ''}<button class="btn btn--yellow" data-rebuild>지금 사이트 반영</button></div>
    <div class="card" style="margin-top:14px"><h2>사이트 정보</h2><p>주소: <a href="${esc(s.siteUrl || '../')}" target="_blank">${esc(s.siteUrl || '(미설정)')}</a></p><p class="muted" style="font-size:.84rem">회사명·주소·대표번호·고지문은 <code class="kbd">src/data.mjs</code>의 SITE 항목에서 수정합니다. 네이버 서치어드바이저·구글 서치콘솔 소유확인 코드도 같은 곳에 넣습니다.</p></div>
    <div class="card" style="margin-top:14px"><h2>활동 기록</h2><div data-audit class="muted">불러오는 중…</div></div></div></div>`;
  $('[data-sms]', view).addEventListener('submit', async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries()); try { await api.saveSettings({ sms: { provider: fd.provider, sender: fd.sender, aligoKey: fd.aligoKey, aligoUser: fd.aligoUser, solapiKey: fd.solapiKey, solapiSecret: fd.solapiSecret }, notifyAdmin: !!e.target.notifyAdmin.checked }); toast('저장했습니다', 'ok'); } catch (err) { fail(err); } });
  $('[data-test]', view).addEventListener('click', async () => { try { const r = await api.testSms(me.mobile); toast(r.ok ? '테스트 문자를 보냈습니다' : '발송 실패: ' + r.detail, r.ok ? 'ok' : 'err', 5000); } catch (e) { fail(e); } });
  $('[data-rebuild]', view).addEventListener('click', async () => { try { await api.rebuild(); toast('반영을 시작했습니다. 10~60초 뒤 사이트를 새로고침하세요.', 'ok', 5000); } catch (e) { fail(e); } });
  try { const a = await api.audit(); $('[data-audit]', view).innerHTML = `<table class="table" style="font-size:.8rem">${a.slice(0, 40).map(x => `<tr><td class="nowrap">${new Date(x.at).toLocaleString('ko-KR', { hour12: false }).slice(0, 17)}</td><td>${esc(agentName(x.agentId))}</td><td>${esc(x.action)}</td><td>${esc(x.target)} ${esc(String(x.detail || '').slice(0, 40))}</td></tr>`).join('')}</table>`; } catch { $('[data-audit]', view).textContent = '-'; }
});

// ---------- 시작 ----------
(async () => {
  api = await createApi();
  try { const m = await api.me(); me = m.user; unread = m.unread; } catch { me = null; }
  if (!location.hash) location.hash = '#/dashboard';
  render();
})();
