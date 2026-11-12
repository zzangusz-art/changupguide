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
const thumbSrc = p => !p ? '' : p.startsWith('data:') || /^https?:/.test(p) ? p : p.startsWith('upload/') ? 'https://www.changupmedia.com/' + p : p.includes('/thumb/') ? `../${p}` : `../${p.replace('photos/', 'photos/thumb/')}`;

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
  window.spaceBg?.stop();
  const fn = routes[name] || routes.dashboard;
  try { cache.agents = cache.agents || await api.agents(); } catch {}
  app.innerHTML = shell(name);
  const view = $('#view');
  view.innerHTML = '<div class="loading">불러오는 중…</div>';
  try { await fn(view, rest); } catch (e) { view.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  try { const m = await api.me(); unread = m.unread; const b = $('[data-unread]'); if (b) b.textContent = unread || ''; if (b) b.classList.toggle('hide', !unread); } catch {}
}
window.addEventListener('hashchange', render);
window.addEventListener('cu-retry', e => toast(`서버 응답을 기다리는 중… 자동으로 다시 시도합니다 (${e.detail})`, '', 2500));

function shell(active) {
  const nav = [['dashboard', '대시보드'], ['listings', '매물 관리'], ['my', '내가 등록한 매물'], ['brands', '브랜드 관리'], ['photos', '사진 라이브러리'], ['inbox', '문의함'], ['calls', '통화 알림'], ['messages', '메시지·공지'], ['posts', '발행 글'], ['help', '사용 매뉴얼'], ...(me.isAdmin ? [['agents', '직원 계정'], ['settings', '설정·백업']] : [['profile', '내 정보']])];
  return `<div class="shell"><aside class="side" id="side">
    <a class="logo" href="#/dashboard"><svg viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#FFCC00"/><path d="M11.5 28.5 27 13M16.5 13H27v10.5" fill="none" stroke="#111" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>창업<b>가이드</b></a>
    ${nav.map(([k, n]) => `<a class="nav ${active === k ? 'is-on' : ''}" href="#/${k}">${n}${k === 'messages' ? `<span class="cnt ${unread ? '' : 'hide'}" data-unread>${unread || ''}</span>` : ''}</a>`).join('')}
    <a class="nav" href="../" target="_blank">사이트 보기 ↗</a>
    <div class="me"><b>${esc(me.name)}</b>${esc(me.role)} · ${me.isAdmin ? '관리자' : '직원'}<br><span class="muted">${esc(me.id)}</span><button class="btn btn--sm btn--block" data-logout>로그아웃</button></div>
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
  window.spaceBg?.start();
  app.innerHTML = `<div class="login"><form class="login-card" id="loginForm">
    <div class="brand"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#FFCC00"/><path d="M11.5 28.5 27 13M16.5 13H27v10.5" fill="none" stroke="#111" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>창업<b>가이드</b></span></div>
    <h1>매물 관리 시스템</h1>
    <p class="sub">창업가이드 직원 전용 시스템입니다.<br>계정이 없으면 관리자에게 문의하세요.</p>
    <label for="liUser">아이디</label><input id="liUser" name="id" required autocomplete="username">
    <label for="liPass">비밀번호</label><input id="liPass" name="password" type="password" required autocomplete="current-password">
    <button type="submit">로그인</button>
    ${api.demo ? '<div class="login-demo">데모: <code>admin</code>(관리자) · <code>staff1</code>(직원) / 비밀번호 <code>1234</code></div>' : ''}
    <div class="login-note">무단 접근 및 자료 외부 유출을 금지합니다. · <a href="manual.html" target="_blank" style="color:inherit;text-decoration:underline">사용 매뉴얼</a></div>
  </form></div>`;
  $('#loginForm').addEventListener('submit', async e => { e.preventDefault(); const f = new FormData(e.target); try { const r = await api.login(f.get('id').trim(), f.get('password')); me = r.user; toast(`${me.name}님 환영합니다`, 'ok'); location.hash = '#/dashboard'; render(); } catch (err) { fail(err); } });
}

// ---------- 대시보드 ----------
function startGuide() {
  try { if (localStorage.getItem('cu-guide-off')) return ''; } catch {}
  return `<div class="card guide" style="margin-bottom:14px"><h2>처음 사용하시나요? 3단계면 됩니다 <button class="btn btn--sm btn--ghost" data-guide-off>닫기</button></h2><div class="guide__steps"><a href="#/listings/new"><b>1</b><span><strong>매물 등록</strong>지역·브랜드·월매출·권리금만 넣으면 제목과 지출이 자동으로 채워집니다</span></a><a href="#/my"><b>2</b><span><strong>사진 올리기</strong>매물 화면에서 "사진 올리기"로 휴대폰 사진을 바로 추가하세요</span></a><a href="#/my"><b>3</b><span><strong>상태 바꾸기</strong>거래가 끝나면 목록에서 상태를 "거래완료"로 바꾸면 끝</span></a></div><p class="muted" style="font-size:.8rem;margin-top:8px">자세한 방법은 왼쪽 메뉴 <a href="#/help" style="text-decoration:underline">사용 매뉴얼</a>에 있습니다.</p></div>`;
}
async function todoBoard() {
  const L = cache.listings || (cache.listings = await api.listings()); const mine = l => me.isAdmin ? !l.sample : (l.agentId === me.id || l.createdBy === me.id);
  const live = L.filter(l => mine(l) && l.status === 'active'); const old = Date.now() - 30 * 86400000;
  const noPhoto = live.filter(l => !(l.images || []).length); const stale = live.filter(l => new Date(l.updatedAt).getTime() < old);
  const row = (l, extra = '') => `<li><a href="#/listings/${l.id}"><b>No.${l.id}</b> ${esc((l.title || '').slice(0, 38))}</a>${extra}</li>`;
  if (!noPhoto.length && !stale.length) return '';
  return `<div class="card todo" style="margin-bottom:14px"><h2>할 일 ${me.isAdmin ? '(전체)' : '(내 매물)'}</h2><div class="grid2">${noPhoto.length ? `<div><p><span class="badge r">사진 없음 ${noPhoto.length}건</span> 사진이 있는 매물이 문의를 더 많이 받습니다</p><ul>${noPhoto.slice(0, 5).map(l => row(l)).join('')}</ul></div>` : ''}${stale.length ? `<div><p><span class="badge y">30일 넘게 그대로 ${stale.length}건</span> 바뀐 게 없으면 "확인"만 눌러 최신 상태로 표시</p><ul>${stale.slice(0, 5).map(l => row(l, ` <button class="btn btn--sm" data-touch="${l.id}">변동 없음 확인</button>`)).join('')}</ul></div>` : ''}</div></div>`;
}
document.addEventListener('click', async e => {
  const g = e.target.closest('[data-guide-off]'); if (g) { try { localStorage.setItem('cu-guide-off', '1'); } catch {} g.closest('.guide')?.remove(); }
  const t = e.target.closest('[data-touch]'); if (t) { t.disabled = true; try { const r = await api.getListing(t.dataset.touch); await api.updateListing({ ...r.item }, r.item.updatedAt); cache.listings = null; t.textContent = '확인됨 ✓'; toast('최신 상태로 표시했습니다', 'ok'); } catch (err) { fail(err); t.disabled = false; } }
});
async function staffBoard() {
  const L = cache.listings || (cache.listings = await api.listings()); const wk = weekAgo(); const live = L.filter(l => l.status !== 'archived');
  const rows = (cache.agents || []).filter(a => a.active !== false).map(a => ({ a, made: live.filter(l => l.createdBy === a.id), mine: live.filter(l => l.agentId === a.id) })).sort((x, y) => y.made.length - x.made.length);
  return `<div class="card" style="margin-top:14px"><h2>직원별 등록 현황 <a class="btn btn--sm" href="#/agents">직원 계정</a></h2><table class="table"><thead><tr><th>직원</th><th class="right">최근 7일 등록</th><th class="right">등록 전체</th><th class="right">담당 공개</th><th class="right">담당 보류</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.a.name)}</b> <span class="muted">${esc(r.a.role || '')}</span></td><td class="right">${r.made.filter(l => String(l.createdAt) >= wk).length}</td><td class="right">${r.made.length}</td><td class="right">${r.mine.filter(l => l.status === 'active').length}</td><td class="right">${r.mine.filter(l => l.status === 'held').length}</td></tr>`).join('')}</tbody></table><p class="muted" style="font-size:.8rem;margin-top:8px">담당 미배정 ${live.filter(l => !l.agentId).length}건 · 외부 수집 검증 대기 ${live.filter(l => srcOf(l) === 'legacy').length}건</p></div>`;
}
route('dashboard', async view => {
  setTitle('대시보드', `<a class="btn btn--red" href="#/listings/new">+ 매물 등록</a>`);
  const [s, inq, calls, notices, msgs] = await Promise.all([api.stats(), api.inquiries(), api.calls(), api.notices(), api.messages()]);
  const newInq = inq.filter(i => i.status === 'new').slice(0, 6); const recentCalls = calls.slice(0, 6); const un = msgs.filter(m => m.toId === me.id && !m.readAt);
  const stg = s.storage; const stWarn = stg && !stg.persistent ? '<div class="alert err">⚠ 데이터 저장소(Railway 볼륨)가 연결되지 않았습니다. 이 상태로 재배포하면 등록한 매물이 사라집니다. Railway → changupguide → Volumes 에서 /app/data 볼륨을 확인하세요.</div>' : stg?.lastBackup && !stg.lastBackup.ok ? `<div class="alert err">⚠ 자동 백업이 실패했습니다: ${esc(stg.lastBackup.error || '')} — 설정 → 백업에서 확인하세요.</div>` : '';
  view.innerHTML = `${stWarn}${startGuide()}${await todoBoard()}<div class="grid4">
    <div class="stat"><b>${s.listings}</b><span>공개 매물${me.isAdmin ? ' (전체)' : ' (내 담당)'}</span></div><div class="stat ink"><b>${s.held}</b><span>보류 매물</span></div><div class="stat"><b>${s.newInquiries}</b><span>새 문의</span></div><div class="stat blue"><b>${s.callsToday}</b><span>24시간 내 통화 연결</span></div></div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>새 문의 <a class="btn btn--sm" href="#/inbox">전체</a></h2>${newInq.length ? `<table class="table">${newInq.map(i => `<tr><td><span class="badge ${INQ_STATUS[i.status][1]}">${{ sms: '문자상담', buy: '창업의뢰', sell: '양도의뢰' }[i.type] || i.type}</span></td><td><b>${esc(i.name)}</b><br><a href="tel:${esc(i.phone)}">${esc(i.phone)}</a></td><td class="muted">${esc((i.message || '').slice(0, 40))}${i.listingId ? `<br><a href="#/listings/${i.listingId}">No.${i.listingId}</a>` : ''}</td><td class="muted nowrap">${fmtDate(i.createdAt)}</td></tr>`).join('')}</table>` : '<p class="muted">새 문의가 없습니다.</p>'}</div>
      <div class="card"><h2>최근 통화 연결 <a class="btn btn--sm" href="#/calls">전체</a></h2>${recentCalls.length ? `<table class="table">${recentCalls.map(c => `<tr><td><a href="#/listings/${c.listingId}">No.${c.listingId || '-'}</a><br><span class="muted">${esc((c.title || '').slice(0, 34))}</span></td><td>${me.isAdmin ? esc(agentName(c.agentId)) : ''}</td><td><span class="badge ${c.smsStatus === 'sent' ? 'g' : c.smsStatus === 'demo' ? 'y' : 'r'}">${c.smsStatus === 'sent' ? '문자 발송' : c.smsStatus === 'demo' ? '데모' : '미발송'}</span></td><td class="muted nowrap">${new Date(c.createdAt).toLocaleString('ko-KR', { hour12: false }).slice(0, 17)}</td></tr>`).join('')}</table>` : '<p class="muted">아직 통화 연결 기록이 없습니다. 고객이 매물에서 "담당자 전화 연결"을 누르면 여기에 기록되고 담당자에게 매물 링크가 문자로 갑니다.</p>'}</div>
      <div class="card"><h2>공지 <a class="btn btn--sm" href="#/messages">전체</a></h2>${notices.slice(0, 4).map(n => `<p><span class="badge ${n.readByMe ? 'c' : 'r'}">${n.readByMe ? '읽음' : 'NEW'}</span> <b>${esc(n.title)}</b> <span class="muted">${fmtDate(n.createdAt)}</span></p>`).join('') || '<p class="muted">공지가 없습니다.</p>'}</div>
      <div class="card"><h2>받은 메시지 <a class="btn btn--sm" href="#/messages">열기</a></h2>${un.length ? un.slice(0, 4).map(m => `<p><b>${esc(agentName(m.fromId))}</b>: ${esc(m.body.slice(0, 60))}</p>`).join('') : '<p class="muted">읽지 않은 메시지가 없습니다.</p>'}</div>
    </div>
    ${me.isAdmin ? await staffBoard() : ''}
    <div class="card" style="margin-top:14px"><h2>바로가기</h2><div class="chips"><a class="chip" href="#/listings/new">매물 등록</a><a class="chip" href="#/my">내가 등록한 매물</a><a class="chip" href="#/brands">브랜드 기본값</a><a class="chip" href="#/photos">사진 올리기</a><a class="chip" href="#/inbox">문의 처리</a>${me.isAdmin ? '<a class="chip" href="#/posts">오늘 글 발행</a><a class="chip" href="#/settings">문자 발송 설정</a>' : '<a class="chip" href="#/profile">내 정보·비밀번호</a>'}<a class="chip" href="../listings/" target="_blank">사이트 검색 페이지 ↗</a></div>${s.lastBuild ? `<p class="muted" style="margin-top:10px;font-size:.82rem">사이트 반영: ${s.lastBuild.ok ? '정상' : '실패'} · ${fmtDate(s.lastBuild.at)} ${new Date(s.lastBuild.at).toLocaleTimeString('ko-KR', { hour12: false })}${s.lastBuild.ms ? ` (${(s.lastBuild.ms / 1000).toFixed(1)}초)` : ''}</p>` : ''}</div>`;
});

// ---------- 매물 목록 ----------
const LEGACY_SRC = 'changupmedia.com';
const SRC = { sample: ['예시', 'y'], own: ['자체 등록', 'g'], legacy: ['외부 수집·미검증', 'r'], verified: ['외부 수집·검증 완료', 'b'] };
const srcOf = l => l.sample ? 'sample' : l.source === LEGACY_SRC ? (l.verified ? 'verified' : 'legacy') : 'own';
const canEditL = l => me.isAdmin || l.agentId === me.id || (l.createdBy === me.id && !l.agentId);
async function quickStatus(lid, status) { const r = await api.getListing(lid); const it = { ...r.item, status }; await api.updateListing(it, r.item.updatedAt); return it; }
const weekAgo = () => new Date(Date.now() - 7 * 86400000).toISOString();
const agentCell = l => l.agentId ? esc((cache.agents || []).find(a => a.id === l.agentId)?.name || l.agentName || l.agentId) : '<span class="badge c">미배정</span>';
route('listings', async (view, rest) => {
  if (rest[0] === 'new') return listingForm(view, null, rest[1]);
  if (rest[0]) return listingForm(view, rest[0]);
  return listingList(view, false);
});
route('my', async view => listingList(view, true));
async function listingList(view, my) {
  setTitle(my ? '내가 등록한 매물' : '매물 관리', `<a class="btn btn--red" href="#/listings/new">+ 매물 등록</a>`);
  const all = await api.listings(); cache.listings = all;
  const mineAll = all.filter(l => l.createdBy === me.id || l.agentId === me.id);
  const st = { q: '', status: my ? 'all' : 'active', agent: my || me.isAdmin ? '' : 'me', src: '', page: 1, sel: new Set() };
  const draw = () => {
    const n = s => String(s || '').replace(/\s/g, '').toLowerCase();
    let items = (my ? mineAll : all).filter(l => st.status === 'all' ? l.status !== 'archived' : l.status === st.status);
    if (st.agent === 'me') items = items.filter(l => l.agentId === me.id || l.createdBy === me.id); else if (st.agent === 'none') items = items.filter(l => !l.agentId); else if (st.agent) items = items.filter(l => l.agentId === st.agent);
    if (st.src) items = items.filter(l => srcOf(l) === st.src);
    if (st.q) { const q = n(st.q); items = items.filter(l => n(`${l.id} ${l.title} ${l.titleRaw} ${l.brand} ${l.sido} ${l.gugun} ${l.agentName}`).includes(q)); }
    const per = 30, pages = Math.max(1, Math.ceil(items.length / per)); if (st.page > pages) st.page = pages;
    const slice = items.slice((st.page - 1) * per, st.page * per);
    const wk = weekAgo();
    const head = my ? `<div class="grid4" style="margin-bottom:14px"><div class="stat"><b>${mineAll.filter(l => l.createdBy === me.id).length}</b><span>내가 등록한 매물</span></div><div class="stat ink"><b>${mineAll.filter(l => l.createdBy === me.id && String(l.createdAt) >= wk).length}</b><span>최근 7일 등록</span></div><div class="stat"><b>${mineAll.filter(l => l.agentId === me.id && l.status === 'active').length}</b><span>내 담당 · 공개</span></div><div class="stat blue"><b>${mineAll.filter(l => l.agentId === me.id && l.status === 'held').length}</b><span>내 담당 · 보류</span></div></div>` : '';
    const agentOpts = `<option value="">담당 전체</option><option value="me" ${st.agent === 'me' ? 'selected' : ''}>내 매물</option><option value="none" ${st.agent === 'none' ? 'selected' : ''}>미배정</option>${(cache.agents || []).map(a => `<option value="${esc(a.id)}" ${st.agent === a.id ? 'selected' : ''}>${esc(a.name)}${a.active === false ? ' (비활성)' : ''}</option>`).join('')}`;
    const bulk = me.isAdmin && st.sel.size ? `<div class="bulkbar"><b>${st.sel.size}건 선택</b><select data-bulk-agent><option value="">담당자 선택</option>${(cache.agents || []).filter(a => a.active !== false).map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select><button class="btn btn--sm" data-bulk="agent">담당 변경</button><select data-bulk-status>${Object.entries(STATUS).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select><button class="btn btn--sm" data-bulk="status">상태 변경</button><button class="btn btn--sm btn--yellow" data-bulk="verify">검증 완료 표시</button><button class="btn btn--sm btn--ghost" data-bulk="unverify">검증 해제</button><button class="btn btn--sm btn--ghost" data-bulk="clear">선택 해제</button></div>` : '';
    const samples = all.filter(l => l.sample && l.status !== 'archived');
    const sampleBar = me.isAdmin && samples.length && !my ? `<div class="alert warn" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">사이트에 <b>예시 매물 ${samples.length}건</b>이 보이고 있습니다. 실제 매물을 등록한 뒤 한 번에 내리세요. <button class="btn btn--sm btn--ink" data-samples-off>예시 매물 모두 내리기</button></div>` : '';
    view.innerHTML = `${head}${sampleBar}<div class="toolbar"><input type="search" placeholder="번호·제목·브랜드·지역·담당자 검색" value="${esc(st.q)}" data-q><select data-status>${[['active', '공개'], ['held', '보류'], ['done', '거래완료'], ['archived', '삭제됨'], ['all', '전체(삭제 제외)']].map(([v, t]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${t}</option>`).join('')}</select>${my ? '' : `<select data-agent>${agentOpts}</select>`}<select data-src><option value="">출처 전체</option>${Object.entries(SRC).map(([k, [t]]) => `<option value="${k}" ${st.src === k ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="muted">${items.length}건</span></div>${bulk}
    <div class="table-wrap"><table class="table"><thead><tr>${me.isAdmin ? `<th><input type="checkbox" data-all ${slice.length && slice.every(l => st.sel.has(l.id)) ? 'checked' : ''}></th>` : ''}<th>사진</th><th>번호</th><th>제목</th><th>지역·브랜드</th><th class="right">월매출</th><th class="right">월수익</th><th class="right">권리금</th><th>담당 / 등록</th><th>상태</th><th>갱신</th><th></th></tr></thead><tbody>
    ${slice.map(l => { const s = srcOf(l); return `<tr data-id="${l.id}">${me.isAdmin ? `<td><input type="checkbox" data-sel="${l.id}" ${st.sel.has(l.id) ? 'checked' : ''}></td>` : ''}<td>${l.images && l.images[0] ? `<img class="thumb" src="${thumbSrc(l.images[0])}" alt="">` : '<div class="thumb"></div>'}</td><td>${l.id}</td><td><a href="#/listings/${l.id}"><b>${esc(l.title)}</b></a><br><span class="muted" style="font-size:.78rem">${esc((l.summary || '').slice(0, 50))}</span></td><td>${esc([l.sido, l.gugun].join(' '))}<br><span class="badge y">${esc(l.brand || l.kind2 || '-')}</span></td><td class="right">${l.sales ? fmtMan(l.sales) : '-'}</td><td class="right" style="color:var(--red);font-weight:900">${l.profit ? fmtMan(l.profit) : '-'}</td><td class="right" style="color:var(--blue);font-weight:900">${l.premium ? fmtWon(l.premium) : '협의'}</td><td>${agentCell(l)}${l.createdBy ? `<br><span class="muted" style="font-size:.74rem">등록 ${esc(agentName(l.createdBy))}</span>` : ''}</td><td>${canEditL(l) && l.status !== 'archived' ? `<select class="st-sel st-${l.status}" data-st-id="${l.id}" title="바로 변경">${Object.entries(STATUS).filter(([k]) => k !== 'archived').map(([k, [t]]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select>` : `<span class="badge ${STATUS[l.status]?.[1] || 'c'}">${STATUS[l.status]?.[0] || l.status}</span>`}<br><span class="badge ${SRC[s][1]}" style="margin-top:3px">${SRC[s][0]}</span>${l.duplicateOf ? `<br><span class="badge r" title="기존 사이트 중복 등록 — 사이트 목록에는 No.${l.duplicateOf}만 표시">중복 No.${l.duplicateOf}</span>` : ''}</td><td class="muted nowrap">${fmtDate(l.updatedAt)}</td><td class="nowrap"><a class="btn btn--sm" href="#/listings/${l.id}">수정</a> <a class="btn btn--sm btn--ghost" href="#/listings/new/${l.id}" title="같은 내용으로 새 매물 등록">복제</a></td></tr>`; }).join('') || `<tr><td colspan="12" class="muted">${my ? '아직 등록한 매물이 없습니다. 오른쪽 위 "+ 매물 등록"으로 시작하세요.' : '매물이 없습니다.'}</td></tr>`}</tbody></table></div>
    <div class="pager">${Array.from({ length: pages }, (_, i) => `<button ${i + 1 === st.page ? 'aria-current="page"' : ''} data-p="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    $('[data-q]', view).addEventListener('input', e => { st.q = e.target.value; st.page = 1; const pos = e.target.selectionStart; draw(); const inp = $('[data-q]', view); inp.focus(); inp.setSelectionRange(pos, pos); });
    $('[data-status]', view).addEventListener('change', e => { st.status = e.target.value; st.page = 1; draw(); });
    $('[data-agent]', view)?.addEventListener('change', e => { st.agent = e.target.value; st.page = 1; draw(); });
    $('[data-src]', view).addEventListener('change', e => { st.src = e.target.value; st.page = 1; draw(); });
    $$('[data-p]', view).forEach(b => b.addEventListener('click', () => { st.page = Number(b.dataset.p); draw(); }));
    $$('[data-st-id]', view).forEach(sel => sel.addEventListener('change', async () => { sel.disabled = true; try { const it = await quickStatus(sel.dataset.stId, sel.value); const i = all.findIndex(x => x.id === it.id); if (i >= 0) Object.assign(all[i], { status: it.status, updatedAt: new Date().toISOString() }); toast(`No.${it.id} → ${STATUS[it.status][0]}`, 'ok'); draw(); } catch (e) { fail(e); sel.disabled = false; } }));
    $('[data-samples-off]', view)?.addEventListener('click', async () => { if (!confirm(`예시 매물 ${samples.length}건을 사이트에서 내릴까요? (삭제됨 목록에서 다시 살릴 수 있습니다)`)) return; try { await api.bulkListings(samples.map(l => l.id), { status: 'archived' }); toast('예시 매물을 내렸습니다. 사이트에는 잠시 후 반영됩니다.', 'ok'); for (const l of samples) l.status = 'archived'; draw(); } catch (e) { fail(e); } });
    $$('[data-sel]', view).forEach(c => c.addEventListener('change', () => { c.checked ? st.sel.add(c.dataset.sel) : st.sel.delete(c.dataset.sel); draw(); }));
    $('[data-all]', view)?.addEventListener('change', e => { for (const l of slice) e.target.checked ? st.sel.add(l.id) : st.sel.delete(l.id); draw(); });
    $$('[data-bulk]', view).forEach(b => b.addEventListener('click', async () => {
      const k = b.dataset.bulk; if (k === 'clear') { st.sel.clear(); return draw(); }
      const patch = k === 'agent' ? { agentId: $('[data-bulk-agent]', view).value } : k === 'status' ? { status: $('[data-bulk-status]', view).value } : { verified: k === 'verify' };
      if (k === 'agent' && !patch.agentId) return toast('담당자를 선택하세요', 'err');
      if (!confirm(`선택한 ${st.sel.size}건에 적용할까요?`)) return;
      try { const r = await api.bulkListings([...st.sel], patch); toast(`${r.n}건 변경했습니다`, 'ok'); st.sel.clear(); cache.listings = null; const fresh = await api.listings(); all.splice(0, all.length, ...fresh); draw(); } catch (e) { fail(e); }
    }));
  };
  draw();
}

// ---------- 지역·브랜드 자동완성 ----------
const SIDO_ALIAS = { 서울특별시: '서울', 서울시: '서울', 경기도: '경기', 인천광역시: '인천', 인천시: '인천', 부산광역시: '부산', 대구광역시: '대구', 대전광역시: '대전', 광주광역시: '광주', 울산광역시: '울산', 세종특별자치시: '세종' };
const REGIONS = SIDO_ORDER.flatMap(s => (GUGUN[s] || []).length ? GUGUN[s].map(g => `${s} ${g}`) : [s]);
function parseRegion(v) {
  let t = String(v || '').trim().replace(/\s+/g, ' '); if (!t) return null;
  for (const [k, a] of Object.entries(SIDO_ALIAS)) if (t.startsWith(k)) t = a + t.slice(k.length);
  if (REGIONS.includes(t)) { const [s, ...g] = t.split(' '); return { sido: s, gugun: g.join(' ') }; }
  const c = t.replace(/\s/g, ''); const hits = REGIONS.filter(r => r.replace(/\s/g, '').includes(c) || r.split(' ').slice(1).join('').startsWith(c));
  if (hits.length === 1) { const [s, ...g] = hits[0].split(' '); return { sido: s, gugun: g.join(' ') }; }
  const s0 = t.split(' ')[0]; if (SIDO_ORDER.includes(s0) && !(GUGUN[s0] || []).length) return { sido: s0, gugun: t.split(' ').slice(1).join(' ') };
  return hits.length ? { ambiguous: hits.slice(0, 6) } : null;
}
const canonName = s => String(s || '').replace(/\s/g, '').toLowerCase();
function findBrand(name) {
  const c = canonName(name); if (!c) return null; const list = cache.brands || [];
  const hit = list.find(b => canonName(b.name) === c || (b.aliases || []).some(a => canonName(a) === c));
  if (hit) return hit;
  const d = brandByName(name); if (d && !d.generic) return list.find(b => b.slug === d.slug) || { name: d.name, slug: d.slug };
  return null;
}
const EB_KEYS = ['재료비', '인건비', '월비용(세전)', '관리비', '기타경비'];

// ---------- 동시 수정·변경 이력 공통 ----------
const FIELD_LABEL = { title: '제목', titleManual: '제목 직접입력', status: '상태', sido: '시·도', gugun: '구·군', brand: '브랜드', brandSlug: '브랜드', kind1: '업종', kind2: '세부 업종', code: '업종 코드', kindCode: '업종 코드', theme: '테마', newTown: '신도시', sales: '월매출', expense: '월지출', profit: '월수익', monthlyCost: '월세', premium: '권리금', deposit: '보증금', areaM2: '면적', floor: '층', salesBasis: '매출 기준', expenseBreakdown: '지출 내역', summary: '한 줄 요약', description: '상세 설명', tags: '태그', images: '사진', agentId: '담당자', verified: '검증', sample: '예시 표시', kindLabel: '업종 표시' };
const fmtDT = t => t ? new Date(t).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
const showFld = (k, v) => k === 'status' && STATUS[v] ? STATUS[v][0] : k === 'agentId' ? agentName(v) : showVal(v);
const showVal = v => v == null || v === '' ? '(비어 있음)' : Array.isArray(v) ? (v.length ? `${v.length}개` : '(없음)') : typeof v === 'object' ? '(세부 내역)' : String(v).length > 40 ? String(v).slice(0, 40) + '…' : String(v);
const ACTION_LABEL = { update: '수정', archive: '삭제(보관)', bulk: '일괄 변경', reassign: '담당 변경', transfer: '직원 이관', revert: '되돌리기', restore: '백업 복원' };
async function historyModal(id, canEdit) {
  const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = '<div class="modal__bg" data-close></div><div class="modal__panel"><h2 style="margin-top:0">변경 이력 <span class="muted" style="font-size:.85rem">No.' + esc(id) + '</span></h2><div data-body class="muted">불러오는 중…</div><div style="text-align:right;margin-top:12px"><button class="btn" data-close>닫기</button></div></div>';
  document.body.appendChild(m); m.addEventListener('click', e => { if (e.target.closest('[data-close]')) m.remove(); });
  try {
    const r = await api.listingHistory(id); const body = $('[data-body]', m);
    if (!r.items.length) { body.textContent = '아직 변경 이력이 없습니다. 수정·삭제·담당 변경을 하면 직전 상태가 여기에 보관됩니다 (매물당 최근 60개).'; return; }
    body.innerHTML = `<p class="muted" style="font-size:.84rem">각 줄은 <b>그 변경이 일어나기 직전</b> 상태입니다. "이 상태로 되돌리기"를 누르면 현재 내용도 이력에 남으므로 언제든 다시 바꿀 수 있습니다.</p><table class="table" style="font-size:.84rem">${r.items.map(h => `<tr><td class="nowrap">${esc(fmtDT(h.at))}</td><td><b>${esc(h.by || '-')}</b><br><span class="badge c">${esc(ACTION_LABEL[h.action] || h.action)}</span></td><td>${h.changed.length ? h.changed.slice(0, 8).map(k => `<div>${esc(FIELD_LABEL[k] || k)}: <span class="muted">${esc(showFld(k, h.before[k]))}</span> → ${esc(showFld(k, h.after[k]))}</div>`).join('') : '<span class="muted">변경 항목 없음</span>'}</td><td>${canEdit ? `<button class="btn btn--sm" data-revert="${h.id}">이 상태로 되돌리기</button>` : ''}</td></tr>`).join('')}</table>`;
    $$('[data-revert]', body).forEach(b => b.addEventListener('click', async () => { if (!confirm('이 매물을 선택한 시점의 상태로 되돌릴까요? 지금 내용은 이력에 보관됩니다.')) return; try { await api.revertListing(id, b.dataset.revert); try { localStorage.removeItem(`cu-edit-${me.id}-${id}`); } catch {} toast('되돌렸습니다. 사이트에는 잠시 후 반영됩니다.', 'ok'); cache.listings = null; m.remove(); render(); } catch (e) { fail(e); } }));
  } catch (e) { $('[data-body]', m).textContent = e.message; }
}

// ---------- 매물 등록/수정 폼 (간소화: 지역·브랜드·숫자 3개면 등록) ----------
async function listingForm(view, id, copyFrom) {
  let l, base = null, lock = null, orig = null; const clientKey = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const EKEY = id ? `cu-edit-${me.id}-${id}` : '';
  if (!cache.brands) cache.brands = await api.brands().catch(() => []);
  if (id) { const r = await api.getListing(id); l = structuredClone(r.item); orig = structuredClone(r.item); base = l.updatedAt; lock = r.lock; api.lock(id).catch(() => {});
    // 저장하지 못한 수정 내용 불러오기 → 저장할 때 다른 직원의 변경과 자동으로 합쳐짐
    if (sessionStorage.getItem('cu-edit-load') === String(id)) { sessionStorage.removeItem('cu-edit-load'); try { const dr = JSON.parse(localStorage.getItem(EKEY)); if (dr?.d && dr.orig) { l = { ...dr.d, id: l.id }; orig = dr.orig; base = dr.orig.updatedAt; } } catch {} }
    // 편집 중 표시 유지 (1분마다) — 화면을 떠나면 멈춤
    const here = location.hash; const hb = setInterval(() => { if (location.hash !== here) return clearInterval(hb); api.lock(id).catch(() => {}); }, 60000); }
  else if (copyFrom) { const r = await api.getListing(copyFrom); l = structuredClone(r.item); for (const k of ['id', 'createdAt', 'updatedAt', 'updatedBy', 'createdBy', 'legacyId', 'legacyAgent', 'titleRaw', 'verified', 'duplicateOf', 'canonicalId']) delete l[k]; Object.assign(l, { source: 'own', images: [], status: 'active', titleManual: false, agentId: me.id, agentName: me.name, agentPhone: me.mobile }); }
  else if (sessionStorage.getItem('cu-draft-load')) { sessionStorage.removeItem('cu-draft-load'); l = JSON.parse(localStorage.getItem(`cu-draft-${me.id}`) || '{}').d || {}; l.agentId = me.id; l.agentName = me.name; l.agentPhone = me.mobile; }
  else { const last = JSON.parse(sessionStorage.getItem('cu-last-region') || 'null') || {}; l = { status: 'active', sido: last.sido || '', gugun: last.gugun || '', brand: '', brandSlug: '', kind1: '', kind2: '', code: null, kindCode: null, theme: '', newTown: '', sales: null, expense: null, profit: null, monthlyCost: null, premium: null, areaM2: null, floor: '', salesBasis: 1, expenseBreakdown: {}, summary: '', description: '', tags: [], images: [], agentId: me.id, agentName: me.name, agentPhone: me.mobile, title: '', titleManual: false }; }
  const canEdit = !id || me.isAdmin || l.agentId === me.id || (l.createdBy === me.id && !l.agentId);
  const isLegacy = l.source === LEGACY_SRC;
  setTitle(id ? `매물 수정 No.${id}` : copyFrom ? `매물 등록 (No.${copyFrom} 복제)` : '매물 등록', `<a class="btn" href="#/listings">목록</a>${id ? ` <a class="btn btn--ghost" href="#/listings/new/${id}">복제해서 새로 등록</a> <a class="btn btn--ghost" href="../listing/${id}/" target="_blank">사이트에서 보기 ↗</a> <button class="btn btn--ghost" type="button" data-history>변경 이력</button>` : ''}`);
  const eb = l.expenseBreakdown || {};
  const num = (name, label, val, hint = '', req = false) => `<label class="field ${req ? 'req' : ''}"><span>${label}</span><input name="${name}" inputmode="numeric" value="${val ?? ''}" placeholder="만원 단위"><span class="hint" data-hint="${name}">${hint}</span></label>`;
  const brandOpts = [...new Map([...(cache.brands || []).map(b => [b.name, b]), ...BRAND_LIST.map(b => [b.name, b])]).keys()];
  view.innerHTML = `${!canEdit ? `<div class="alert err">이 매물은 ${l.agentId ? `${esc(l.agentName)} 담당` : '담당 미배정'}입니다. 본인 담당·본인 등록 매물만 수정할 수 있으며, 담당 변경은 관리자에게 메시지로 요청하세요.</div>` : ''}${lock ? `<div class="lock-banner">⚠ ${esc(lock.name || lock.agentId)}님이 ${new Date(lock.at).toLocaleTimeString('ko-KR', { hour12: false })}부터 이 매물을 편집 중입니다. 같이 저장해도 서로 다른 항목은 자동으로 합쳐지고, 같은 항목을 고친 경우에만 어느 값을 쓸지 묻습니다.</div>` : ''}${isLegacy ? `<div class="alert ${l.verified ? 'info' : 'err'}">외부(창업미디어) 수집 매물입니다. ${l.verified ? '검증 완료로 표시되어 있습니다.' : '연락처·담당자·금액·소유/권리 관계를 확인하기 전에는 정식 오픈 시 사이트에 공개되지 않습니다.'}${l.legacyAgent?.name ? ` <span class="muted">원 담당자(외부): ${esc(l.legacyAgent.name)} ${esc(l.legacyAgent.phone || '')}</span>` : ''}</div>` : ''}
  <form id="lf" ${!canEdit ? 'inert' : ''} autocomplete="off">
  <div class="fsec"><h3><span class="num">1</span>필수 정보 <span class="muted" style="font-weight:500;font-size:.82rem">지역·브랜드를 고르면 업종·지출 비율·제목이 자동으로 채워집니다</span></h3><div class="grid4">
    <label class="field req" style="grid-column:span 2"><span>지역 (시·구 검색)</span><input name="region" list="regions" value="${esc([l.sido, l.gugun].filter(Boolean).join(' '))}" placeholder="예) 양천 → 서울 양천구"><datalist id="regions">${REGIONS.map(r => `<option value="${r}">`).join('')}</datalist><span class="hint" data-hint="region">구·시 이름 일부만 입력해도 됩니다</span></label>
    <label class="field" style="grid-column:span 2"><span>브랜드 (프랜차이즈명)</span><input name="brand" list="brands" value="${esc(l.brand)}" placeholder="예) 메가커피 — 개인 매장이면 비움"><datalist id="brands">${brandOpts.map(n => `<option value="${esc(n)}">`).join('')}</datalist><span class="hint" data-hint="brand">브랜드 관리에 등록된 기본값이 자동 적용됩니다</span></label>
    <label class="field req"><span>업종 (대분류)</span><select name="kind1"><option value="">선택</option>${CATEGORIES.map(c => `<option ${c.name === l.kind1 ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <label class="field req"><span>업종 (소분류)</span><select name="kind2"></select></label>
    ${num('sales', '월매출', l.sales, '예) 3500 → 3,500만원')}${num('profit', '월수익 (세전)', l.profit, '비우면 월매출 − 월지출로 자동 계산', true)}
    <label class="field req"><span>권리금 (예산)</span><input name="premium" value="${l.premium ?? ''}" placeholder="12000 또는 1억2천"><span class="hint" data-hint="premium">임대보증금 제외. 비우면 "협의"</span></label>
    <label class="field"><span>상태</span><select name="status">${Object.entries(STATUS).filter(([k]) => k !== 'archived').map(([k, [t]]) => `<option value="${k}" ${l.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div>
  <div class="brand-defaults" data-bdef hidden></div>
  <label class="field" style="margin-top:12px"><span>제목 <span class="muted" style="font-weight:500">지역 + 브랜드 + 매출·수익 + 예산으로 자동 생성 · 직접 고쳐도 됩니다</span></span><div style="display:flex;gap:8px"><input name="title" value="${esc(l.titleManual ? l.title : '')}" style="flex:1"><button type="button" class="btn btn--sm" data-title-auto ${l.titleManual ? '' : 'hidden'}>자동 제목으로</button></div></label></div>
  <div class="fsec"><h3><span class="num">2</span>사진 <span class="muted" style="font-weight:500;font-size:.82rem">선택 · 첫 사진이 대표 · 나중에 추가해도 됩니다</span></h3><div class="photos-pick" data-photos></div></div>
  <details class="fsec" ${id && (l.summary || l.description) ? 'open' : ''}><summary><h3 style="display:inline-flex"><span class="num">3</span>상세 정보 (선택) — 테마·지출 내역·면적·설명</h3></summary><div class="grid4" style="margin-top:10px">
    <label class="field"><span>테마</span><select name="theme"><option value="">선택 안 함</option>${THEMES.map(t => `<option ${l.theme === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
    <label class="field"><span>신도시 상권</span><input name="newTown" value="${esc(l.newTown || '')}" placeholder="예) 위례신도시"></label>
    ${num('expense', '월지출', l.expense, '지출 항목 합계')}${num('monthlyCost', '월비용 (임대료 등)', l.monthlyCost, '월세·관리비 등 고정비')}
    ${num('areaM2', '면적 (㎡)', l.areaM2, '평 × 3.3 = ㎡')}<label class="field"><span>층</span><input name="floor" value="${esc(l.floor || '')}" placeholder="1"></label>
    <label class="field"><span>매출 근거</span><select name="salesBasis">${[[1, '매출 자료 확인 (POS·카드)'], [2, '양도인 진술'], [3, '담당자 현장 확인']].map(([v, t]) => `<option value="${v}" ${Number(l.salesBasis) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div>
  <p style="font-weight:900;margin:14px 0 6px">월지출 세부 (만원) <span class="muted" style="font-weight:500;font-size:.8rem">브랜드 평균 비율로 자동 계산 · 직접 입력하면 그 값을 씁니다</span></p><div class="grid4">${EB_KEYS.map(k => `<label class="field"><span>${k}</span><input name="eb_${k}" inputmode="numeric" value="${eb[k]?.amount ?? ''}" placeholder="만원"></label>`).join('')}</div><div class="bars" data-bars style="margin-top:8px"></div>
    <label class="field" style="margin-top:12px"><span>한줄 요약 (셀링포인트)</span><input name="summary" value="${esc(l.summary || '')}" maxlength="120" placeholder="예) 목동역 초역세권 · 풀오토 운영 · 직원 승계 가능"></label>
    <label class="field" style="margin-top:10px"><span>태그</span><div class="chips" data-tags>${TAGS.map(t => `<span class="chip ${(l.tags || []).includes(t) ? 'is-on' : ''}" data-tag="${t}">${t}</span>`).join('')}</div></label>
    <label class="field" style="margin-top:10px"><span>상세 설명</span><textarea name="description" rows="7" placeholder="매장 특징, 상권, 운영 방식, 양도 사유 등. 정확한 위치·상호는 적지 마세요.">${esc(l.description || '')}</textarea></label>
    ${l.titleRaw ? `<p class="muted" style="font-size:.8rem;margin-top:8px">원 제목(외부): ${esc(l.titleRaw)}</p>` : ''}
  </details>
  ${me.isAdmin ? `<div class="fsec"><h3><span class="num">4</span>담당·검증 (관리자)</h3><div class="grid2"><label class="field"><span>담당 직원</span><select name="agentId"><option value="">미배정</option>${(cache.agents || []).filter(a => a.active !== false || a.id === l.agentId).map(a => `<option value="${a.id}" ${a.id === l.agentId ? 'selected' : ''}>${esc(a.name)} (${esc(a.mobile)})${a.isAdmin ? ' · 관리자' : ''}</option>`).join('')}</select><span class="hint">미배정 매물은 사이트에 회사 대표번호로 표시됩니다</span></label>${isLegacy ? `<label class="chip" style="align-self:end"><input type="checkbox" name="verified" ${l.verified ? 'checked' : ''}> 검증 완료 (연락처·금액·권리 확인)</label>` : ''}</div></div>` : `<p class="muted">담당: ${esc(l.agentName || '미배정')}${l.agentPhone ? ` (${esc(l.agentPhone)})` : ''}</p>`}
  </form>
  <div class="drawer__foot" style="width:auto;left:240px">${id && canEdit ? `<button class="btn btn--ghost" type="button" data-archive style="margin-right:auto;color:var(--red)">삭제(보관)</button>` : ''}<a class="btn" href="#/listings">취소</a>${canEdit && !id ? `<button class="btn btn--lg" type="button" data-save="more">등록 후 계속</button>` : ''}${canEdit ? `<button class="btn btn--red btn--lg" type="button" data-save>${id ? '저장' : '등록'}</button>` : ''}</div>`;
  const f = $('#lf');
  const touched = new Set(Object.keys(eb).map(k => 'eb_' + k)); if (id && l.expense != null) touched.add('expense'); if (id && l.profit != null) touched.add('profit');
  let brandRec = findBrand(l.brand); let titleManual = !!l.titleManual;
  const fillKind2 = sel => { const c = CATEGORIES.find(c => c.name === f.kind1.value); f.kind2.innerHTML = `<option value="">선택</option>${(c ? c.kinds : []).map(k => `<option value="${k[1]}" ${k[1] === sel ? 'selected' : ''}>${k[1]}</option>`).join('')}`; };
  fillKind2(l.kind2);
  const setVal = (name, v) => { const el = f[name]; if (!el || touched.has(name)) return; el.value = v ?? ''; el.classList.toggle('is-auto', v != null && v !== ''); };
  // 브랜드 기본값: 업종(고정) + 평균 지출 비율 → 월매출 입력 시 지출·수익 자동 계산
  const applyBrand = (initial = false) => {
    const box = $('[data-bdef]', f); const b = brandRec;
    if (!b) { box.hidden = true; $('[data-hint=brand]', f).textContent = f.brand.value.trim() ? '사전에 없는 브랜드 — 그대로 저장됩니다 (관리자가 브랜드 관리에서 추가 가능)' : '브랜드 관리에 등록된 기본값이 자동 적용됩니다'; return; }
    if (!initial) {
      if (b.kind1) { f.kind1.value = b.kind1; fillKind2(b.kind2 || ''); }
      if (b.theme && !f.theme.value) f.theme.value = b.theme;
      for (const t of b.tags || []) $(`[data-tag="${t}"]`, f)?.classList.add('is-on');
    }
    const pct = b.expensePct || {}; const has = EB_KEYS.filter(k => pct[k] != null);
    box.hidden = false; box.innerHTML = `${b.logo ? `<img src="${esc(photoSrc(b.logo))}" alt="">` : ''}<div><b>${esc(b.name)} 기본값 적용</b> <span class="muted">${b.kind1 ? `업종 ${esc(b.kind1)} › ${esc(b.kind2 || '-')}` : '업종 기본값 없음'}${has.length ? ` · ${has.map(k => `${k.replace('(세전)', '')} ${pct[k]}%`).join(' · ')}` : ' · 지출 비율 기본값 없음'}</span>${b.sampleCount ? `<br><span class="muted" style="font-size:.76rem">기존 매물 ${b.sampleCount}건 평균 · 노란 칸은 자동 계산값이며 직접 고치면 그 값이 우선합니다</span>` : ''}</div>${me.isAdmin && b.slug ? `<a class="btn btn--sm" href="#/brands/${esc(b.slug)}">기본값 수정</a>` : ''}`;
  };
  const recalc = () => {
    const sales = parseWon(f.sales.value); const pct = brandRec?.expensePct || {};
    if (sales && EB_KEYS.some(k => pct[k] != null)) {
      let tot = 0; for (const k of EB_KEYS) { const name = 'eb_' + k; if (touched.has(name)) { tot += parseWon(f[name].value) || 0; continue; } const v = pct[k] != null ? Math.round(sales * pct[k] / 100) : null; setVal(name, v); tot += v || 0; }
      setVal('expense', tot || null);
    }
    const exp = parseWon(f.expense.value); if (sales && exp != null) setVal('profit', sales - exp);
  };
  const read = () => {
    const d = { ...l };
    const r = parseRegion(f.region.value); d.sido = r && !r.ambiguous ? r.sido : ''; d.gugun = r && !r.ambiguous ? r.gugun : '';
    d.brand = f.brand.value.trim(); const b = findBrand(d.brand); d.brand = b ? b.name : d.brand; d.brandSlug = b ? b.slug : '';
    d.theme = f.theme.value; d.kind1 = f.kind1.value; d.kind2 = f.kind2.value; const c = CATEGORIES.find(c => c.name === d.kind1); d.code = c ? c.code : null; d.kindCode = c ? (c.kinds.find(k => k[1] === d.kind2) || [null])[0] : null; d.newTown = f.newTown.value.trim(); d.status = f.status.value;
    d.sales = parseWon(f.sales.value); d.expense = parseWon(f.expense.value); d.profit = parseWon(f.profit.value) ?? (d.sales && d.expense ? d.sales - d.expense : null); d.monthlyCost = parseWon(f.monthlyCost.value); d.premium = parseWon(f.premium.value); d.areaM2 = f.areaM2.value ? Number(f.areaM2.value) : null; d.floor = f.floor.value.trim(); d.salesBasis = Number(f.salesBasis.value);
    const ebd = {}; let tot = 0; for (const k of EB_KEYS) { const v = parseWon(f[`eb_${k}`].value); if (v != null) { ebd[k] = { amount: v }; tot += v; } } const den = d.sales || tot; for (const k in ebd) ebd[k].pct = den ? Math.round(ebd[k].amount / den * 1000) / 10 : 0; d.expenseBreakdown = ebd; if (!d.expense && tot) d.expense = tot;
    d.summary = f.summary.value.trim(); d.description = f.description.value.trim(); d.tags = $$('[data-tag].is-on', f).map(x => x.dataset.tag); d.images = images.slice();
    if (f.agentId) d.agentId = f.agentId.value; if (f.verified) d.verified = f.verified.checked;
    d.titleManual = titleManual && !!f.title.value.trim(); d.title = d.titleManual ? f.title.value.trim() : makeTitle(d);
    return d;
  };
  let images = (l.images || []).slice();
  const drawPhotos = () => { $('[data-photos]', f).innerHTML = images.map((p, i) => `<div class="ph">${i === 0 ? '<span class="main">대표</span>' : ''}<img src="${thumbSrc(p)}" alt=""><button type="button" class="x" data-rm="${i}">×</button><div class="mv">${i > 0 ? `<button type="button" data-mv="${i}:-1">‹</button>` : ''}${i < images.length - 1 ? `<button type="button" data-mv="${i}:1">›</button>` : ''}</div></div>`).join('') + `<label class="add add--up">📷 사진 올리기<br><small>여러 장 · 휴대폰 촬영 가능</small><input type="file" accept="image/*" multiple hidden data-up-direct></label><button type="button" class="add" data-pick>＋ 라이브러리에서<br>고르기</button>`; $('[data-up-direct]', f).addEventListener('change', e => addFiles([...e.target.files])); $$('[data-rm]', f).forEach(b => b.addEventListener('click', () => { images.splice(Number(b.dataset.rm), 1); drawPhotos(); })); $$('[data-mv]', f).forEach(b => b.addEventListener('click', () => { const [i, d] = b.dataset.mv.split(':').map(Number); const t = images[i]; images[i] = images[i + d]; images[i + d] = t; drawPhotos(); })); $('[data-pick]', f).addEventListener('click', () => photoPicker(sel => { for (const p of sel) if (!images.includes(p)) images.push(p); drawPhotos(); })); };
  const addFiles = async files => { files = files.filter(x => /^image\//.test(x.type)); if (!files.length) return; toast(`사진 ${files.length}장 올리는 중…`); try { const up = await uploadFiles(files, [f.brand.value.trim()].filter(Boolean)); for (const p of up) if (!images.includes(p.file)) images.push(p.file); drawPhotos(); toast(`${up.length}장 추가했습니다`, 'ok'); saveDraft(); } catch (err) { fail(err); } };
  const ph = $('[data-photos]', f); ph.addEventListener('dragover', e => { e.preventDefault(); ph.classList.add('is-drag'); }); ph.addEventListener('dragleave', () => ph.classList.remove('is-drag')); ph.addEventListener('drop', e => { e.preventDefault(); ph.classList.remove('is-drag'); addFiles([...e.dataTransfer.files]); });
  drawPhotos();
  // 임시저장: 새 매물 작성 중 내용이 브라우저에 자동 보관됨 (저장하면 삭제)
  const DKEY = `cu-draft-${me.id}`; let draftT;
  const saveDraft = () => { clearTimeout(draftT); draftT = setTimeout(() => { try { if (id) { if (canEdit) localStorage.setItem(EKEY, JSON.stringify({ at: new Date().toISOString(), d: read(), orig })); } else localStorage.setItem(DKEY, JSON.stringify({ at: new Date().toISOString(), d: read() })); } catch {} }, 600); };
  const sync = () => {
    const d = read();
    if (!titleManual) { f.title.value = ''; f.title.placeholder = d.title; }
    const r = parseRegion(f.region.value); $('[data-hint=region]', f).innerHTML = !f.region.value.trim() ? '구·시 이름 일부만 입력해도 됩니다' : r && !r.ambiguous ? `✔ ${esc(r.sido)} ${esc(r.gugun)}` : r?.ambiguous ? `여러 곳이 맞습니다: ${r.ambiguous.map(esc).join(', ')}` : '<span style="color:var(--red)">목록에서 지역을 고르세요</span>';
    for (const [k, fmt, base] of [['sales', fmtMan, '예) 3500 → 3,500만원'], ['profit', fmtMan, '비우면 월매출 − 월지출로 자동 계산'], ['premium', fmtWon, '임대보증금 제외. 비우면 "협의"']]) { const h = $(`[data-hint=${k}]`, f); if (h) h.innerHTML = d[k] != null && f[k].value.trim() ? `<b style="color:var(--ink)">= ${esc(fmt(d[k]))}</b>` : base; }
    const rows = Object.entries(d.expenseBreakdown); $('[data-bars]', f).innerHTML = rows.map(([k, v]) => `<div class="bar"><span>${k}</span><div class="track"><div class="fill" style="width:${Math.min(100, v.pct)}%"></div></div><span>${fmtNum(v.amount)}만 · ${v.pct}%</span></div>`).join('');
  };
  f.addEventListener('input', e => { const n = e.target.name; if (n === 'title') { titleManual = !!e.target.value.trim(); $('[data-title-auto]', f).hidden = !titleManual; } else if (n && (n.startsWith('eb_') || n === 'expense' || n === 'profit')) { touched.add(n); e.target.classList.remove('is-auto'); } if (n === 'sales' || (n && n.startsWith('eb_')) || n === 'expense') recalc(); sync(); });
  f.addEventListener('change', sync); f.addEventListener('input', saveDraft); f.addEventListener('change', saveDraft);
  f.region.addEventListener('change', () => { const r = parseRegion(f.region.value); if (r && !r.ambiguous) f.region.value = [r.sido, r.gugun].filter(Boolean).join(' '); sync(); });
  f.kind1.addEventListener('change', () => { fillKind2(''); sync(); });
  f.brand.addEventListener('change', () => { brandRec = findBrand(f.brand.value); if (brandRec && brandRec.name !== f.brand.value.trim()) { f.brand.value = brandRec.name; } applyBrand(); recalc(); sync(); });
  $('[data-title-auto]', f).addEventListener('click', () => { titleManual = false; f.title.value = ''; $('[data-title-auto]', f).hidden = true; sync(); });
  $$('[data-tag]', f).forEach(c => c.addEventListener('click', () => { c.classList.toggle('is-on'); sync(); }));
  applyBrand(!!id || !!copyFrom); if (!id) recalc(); sync();
  if (id && canEdit) { let dr = null; try { dr = JSON.parse(localStorage.getItem(EKEY) || 'null'); } catch {} if (dr?.d && dr.orig && JSON.stringify(dr.d) !== JSON.stringify(read())) { const bn = document.createElement('div'); bn.className = 'alert warn'; bn.innerHTML = `저장하지 못한 수정 내용이 있습니다 (${esc(fmtDT(dr.at))}) <button class="btn btn--sm btn--yellow" type="button" data-edit-load>불러오기</button> <button class="btn btn--sm btn--ghost" type="button" data-edit-drop>버리기</button> <span class="muted" style="font-weight:500">불러와서 저장하면 그사이 다른 직원이 바꾼 항목과 자동으로 합쳐집니다</span>`; view.prepend(bn); $('[data-edit-drop]', bn).addEventListener('click', () => { localStorage.removeItem(EKEY); bn.remove(); }); $('[data-edit-load]', bn).addEventListener('click', () => { sessionStorage.setItem('cu-edit-load', String(id)); render(); }); } }
  if (!id && !copyFrom) { let dr = null; try { dr = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch {} if (dr?.d && (dr.d.sales || dr.d.brand || dr.d.images?.length)) { const bn = document.createElement('div'); bn.className = 'alert warn'; bn.innerHTML = `작성 중이던 매물이 있습니다 (${esc(new Date(dr.at).toLocaleString('ko-KR', { hour12: false }).slice(0, 17))} · ${esc(dr.d.title || '')}) <button class="btn btn--sm btn--yellow" type="button" data-draft-load>이어서 작성</button> <button class="btn btn--sm btn--ghost" type="button" data-draft-drop>버리기</button>`; view.prepend(bn); $('[data-draft-drop]', bn).addEventListener('click', () => { localStorage.removeItem(DKEY); bn.remove(); }); $('[data-draft-load]', bn).addEventListener('click', () => { sessionStorage.setItem('cu-draft-load', '1'); render(); }); } }
  $$('[data-save]').forEach(btn => btn.addEventListener('click', async () => {
    const d = read(); const errs = [];
    if (!d.sido) errs.push('지역'); if (!d.kind1 || !d.kind2) errs.push('업종 (브랜드를 고르면 자동)'); if (!d.profit && !d.sales) errs.push('월매출 또는 월수익');
    if (errs.length) return toast('입력 확인: ' + errs.join(', '), 'err', 4500);
    $$('[data-save]').forEach(b => b.disabled = true);
    const doSave = force => id ? api.updateListing(d, base, orig, force) : api.createListing({ ...d, clientKey });
    try {
      let r;
      try { r = await doSave(false); }
      catch (e) {
        if (e.status !== 409 || !e.data?.conflicts) throw e;
        const lines = e.data.conflicts.map(c => `· ${FIELD_LABEL[c.key] || c.key}: ${e.data.by}님 값 「${showFld(c.key, c.theirs)}」 / 내 값 「${showFld(c.key, c.mine)}」`).join('\n');
        if (!confirm(`${e.message}\n\n${lines}\n\n[확인] 내 값으로 저장 (다른 항목은 자동으로 합쳐짐)\n[취소] 저장하지 않고 그대로 두기`)) { $$('[data-save]').forEach(b => b.disabled = false); return; }
        r = await doSave(true);
      }
      if (r.merged) toast(`${r.merged.by}님이 먼저 바꾼 ${r.merged.theirFields.map(k => FIELD_LABEL[k] || k).slice(0, 5).join('·') || '내용'}과 합쳐서 저장했습니다`, 'ok', 6000);
      if (id) try { localStorage.removeItem(EKEY); } catch {}
      if (r.duplicateOf) toast(`주의: 같은 조건의 매물 No.${r.duplicateOf}이 이미 있습니다 (등록은 완료)`, 'err', 6000);
      if (!id) try { localStorage.removeItem(`cu-draft-${me.id}`); } catch {}
      toast(id ? '저장했습니다. 사이트에는 잠시 후 반영됩니다.' : `등록했습니다 (No.${r.item.id}). 사이트에는 잠시 후 반영됩니다.`, 'ok'); cache.listings = null;
      if (btn.dataset.save === 'more') { sessionStorage.setItem('cu-last-region', JSON.stringify({ sido: d.sido, gugun: d.gugun })); if (location.hash === '#/listings/new') render(); else location.hash = '#/listings/new'; }
      else location.hash = id ? '#/listings' : '#/my';
    } catch (e) { if (e.status === 409) { if (confirm(e.message + '\n\n지금 화면의 내용을 버리고 최신 내용을 불러올까요? (취소하면 화면 내용이 그대로 남습니다)')) { try { localStorage.removeItem(EKEY); } catch {} render(); } } else fail(e); $$('[data-save]').forEach(b => b.disabled = false); }
  }));
  $('[data-history]')?.addEventListener('click', () => historyModal(id, canEdit));
  $('[data-archive]')?.addEventListener('click', async () => { if (!confirm('이 매물을 삭제(보관)할까요? 사이트에서 내려가며 목록의 "삭제됨"에서 복구할 수 있습니다.')) return; try { await api.archiveListing(id); toast('삭제(보관)했습니다', 'ok'); cache.listings = null; location.hash = '#/listings'; } catch (e) { fail(e); } });
}

// ---------- 브랜드 관리 ----------
route('brands', async (view, rest) => {
  setTitle('브랜드 관리', me.isAdmin ? '<button class="btn btn--red" data-new>+ 브랜드 추가</button>' : '');
  const items = cache.brands = await api.brands(); const listings = cache.listings || (cache.listings = await api.listings());
  const cnt = {}; for (const l of listings) if (l.brandSlug && l.status !== 'archived') cnt[l.brandSlug] = (cnt[l.brandSlug] || 0) + 1;
  let q = '';
  const draw = () => {
    const n = s => String(s || '').replace(/\s/g, '').toLowerCase();
    const list = items.filter(b => !q || n(`${b.name} ${(b.aliases || []).join(' ')} ${b.slug} ${b.kind2}`).includes(n(q))).sort((a, b) => (cnt[b.slug] || 0) - (cnt[a.slug] || 0));
    view.innerHTML = `<div class="alert info">브랜드를 등록해 두면 매물 등록 때 브랜드명만 고르면 <b>업종(고정값)</b>과 <b>평균 지출 비율</b>이 자동으로 들어가고, 월매출만 넣으면 월지출·월수익이 계산됩니다. 직원은 자동값을 언제든 직접 고칠 수 있습니다. 소개·이미지는 사이트 브랜드 페이지에 표시됩니다.</div>
    <div class="toolbar"><input type="search" placeholder="브랜드명·별칭 검색" value="${esc(q)}" data-q><span class="muted">${list.length}개</span></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>로고</th><th>브랜드</th><th>업종 (기본값)</th><th>평균 지출 비율</th><th class="right">매물</th><th>소개</th><th>수정일</th><th></th></tr></thead><tbody>${list.map(b => { const p = b.expensePct || {}; const has = EB_KEYS.filter(k => p[k] != null); return `<tr><td>${b.logo ? `<img src="${esc(photoSrc(b.logo))}" alt="" style="height:26px;max-width:80px;object-fit:contain">` : ''}</td><td><b>${esc(b.name)}</b>${(b.aliases || []).length ? `<br><span class="muted" style="font-size:.76rem">${esc(b.aliases.join(', '))}</span>` : ''}</td><td>${esc(b.kind1 || '-')}${b.kind2 ? ` › ${esc(b.kind2)}` : ''}</td><td class="muted" style="font-size:.8rem">${has.length ? has.map(k => `${k.replace('(세전)', '')} ${p[k]}%`).join(' · ') : '-'}</td><td class="right">${cnt[b.slug] || 0}</td><td>${b.intro ? '<span class="badge g">있음</span>' : '<span class="badge c">-</span>'}</td><td class="muted nowrap">${b.updatedAt ? fmtDate(b.updatedAt) : '-'}</td><td><button class="btn btn--sm" data-edit="${esc(b.slug)}">${me.isAdmin ? '수정' : '보기'}</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">브랜드가 없습니다.</td></tr>'}</tbody></table></div>`;
    $('[data-q]', view).addEventListener('input', e => { q = e.target.value; const pos = e.target.selectionStart; draw(); const i = $('[data-q]', view); i.focus(); i.setSelectionRange(pos, pos); });
    $$('[data-edit]', view).forEach(b => b.addEventListener('click', () => brandForm(items.find(x => x.slug === b.dataset.edit))));
  };
  draw();
  $('[data-new]')?.addEventListener('click', () => brandForm(null));
  if (rest[0]) { const b = items.find(x => x.slug === rest[0]); if (b) brandForm(b); }
});
function brandForm(b) {
  const isNew = !b; b = structuredClone(b || { slug: '', name: '', aliases: [], kind1: '', kind2: '', theme: '', expensePct: {}, tags: [], intro: '', logo: '', images: [] });
  const ro = !me.isAdmin; const p = b.expensePct || {};
  const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel" style="width:min(760px,100%)"><h2>${isNew ? '브랜드 추가' : `${esc(b.name)} 기본값`}</h2><form data-f style="display:grid;gap:10px;margin-top:10px" ${ro ? 'inert' : ''}><div class="grid2">
    <label class="field req"><span>브랜드명</span><input name="name" value="${esc(b.name)}" required></label>
    <label class="field req"><span>영문 주소 (사이트 URL)</span><input name="slug" value="${esc(b.slug)}" ${isNew ? 'required pattern="[a-z0-9-]{2,40}" placeholder="예) mega-coffee"' : 'readonly'}></label>
    <label class="field" style="grid-column:1/-1"><span>별칭 (쉼표로 구분 — 직원이 다르게 입력해도 같은 브랜드로 인식)</span><input name="aliases" value="${esc((b.aliases || []).join(', '))}" placeholder="예) 메가MGC커피, 메가 커피"></label>
    <label class="field"><span>업종 대분류 (고정값)</span><select name="kind1"><option value="">선택</option>${CATEGORIES.map(c => `<option ${c.name === b.kind1 ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <label class="field"><span>업종 소분류 (고정값)</span><select name="kind2"></select></label>
    <label class="field"><span>기본 테마</span><select name="theme"><option value="">선택 안 함</option>${THEMES.map(t => `<option ${b.theme === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label></div>
    <p style="font-weight:900;margin:4px 0 0">평균 지출 비율 (월매출 대비 %)</p><div class="grid4" style="grid-template-columns:repeat(5,1fr)">${EB_KEYS.map(k => `<label class="field"><span>${k}</span><input name="pct_${k}" inputmode="decimal" value="${p[k] ?? ''}" placeholder="%"></label>`).join('')}</div>
    <label class="field"><span>기본 태그</span><div class="chips">${TAGS.map(t => `<span class="chip ${(b.tags || []).includes(t) ? 'is-on' : ''}" data-tag="${t}">${t}</span>`).join('')}</div></label>
    <label class="field"><span>브랜드 소개 (사이트 브랜드 페이지에 표시)</span><textarea name="intro" rows="4" placeholder="브랜드 특징, 가맹 조건, 본사 승인 절차 등">${esc(b.intro || '')}</textarea></label>
    <div class="grid2"><label class="field"><span>로고</span><div style="display:flex;gap:8px;align-items:center"><img data-logo src="${esc(photoSrc(b.logo))}" alt="" style="height:34px;max-width:120px;object-fit:contain;${b.logo ? '' : 'display:none'}"><label class="btn btn--sm">로고 올리기<input type="file" accept="image/*" hidden data-logo-up></label></div></label>
    <label class="field"><span>대표 이미지</span><div class="photos-pick" data-imgs></div></label></div>
    ${b.sampleCount ? `<p class="muted" style="font-size:.8rem">초기값은 기존 매물 ${b.sampleCount}건의 평균에서 계산했습니다.</p>` : ''}
    <div style="display:flex;gap:8px;justify-content:flex-end">${!isNew && me.isAdmin ? '<button type="button" class="btn btn--ghost" data-del style="margin-right:auto;color:var(--red)">삭제</button>' : ''}<button type="button" class="btn" data-close>닫기</button>${me.isAdmin ? '<button class="btn btn--red" type="submit">저장</button>' : ''}</div></form></div>`;
  document.body.appendChild(m); const f = $('[data-f]', m);
  const fillK2 = sel => { const c = CATEGORIES.find(c => c.name === f.kind1.value); f.kind2.innerHTML = `<option value="">선택</option>${(c ? c.kinds : []).map(k => `<option value="${k[1]}" ${k[1] === sel ? 'selected' : ''}>${k[1]}</option>`).join('')}`; };
  fillK2(b.kind2); f.kind1.addEventListener('change', () => fillK2(''));
  let imgs = (b.images || []).slice();
  const drawImgs = () => { $('[data-imgs]', m).innerHTML = imgs.map((p, i) => `<div class="ph"><img src="${thumbSrc(p)}" alt=""><button type="button" class="x" data-rm="${i}">×</button></div>`).join('') + `<button type="button" class="add" data-pick>＋ 선택</button>`; $$('[data-rm]', m).forEach(x => x.addEventListener('click', () => { imgs.splice(Number(x.dataset.rm), 1); drawImgs(); })); $('[data-pick]', m).addEventListener('click', () => photoPicker(sel => { for (const p of sel) if (!imgs.includes(p)) imgs.push(p); drawImgs(); })); };
  drawImgs();
  $$('[data-tag]', m).forEach(c => c.addEventListener('click', () => c.classList.toggle('is-on')));
  $('[data-logo-up]', m).addEventListener('change', async e => { try { const up = await uploadFiles([e.target.files[0]], ['로고']); if (up[0]) { b.logo = up[0].file; const i = $('[data-logo]', m); i.src = photoSrc(b.logo); i.style.display = ''; } } catch (err) { fail(err); } });
  $('[data-close]', m).addEventListener('click', () => m.remove()); $('.modal__bg', m).addEventListener('click', () => m.remove());
  $('[data-del]', m)?.addEventListener('click', async () => { if (!confirm(`${b.name} 브랜드 기본값을 삭제할까요? 등록된 매물은 그대로 남습니다.`)) return; try { await api.deleteBrand(b.slug); cache.brands = null; m.remove(); toast('삭제했습니다', 'ok'); if (location.hash !== '#/brands') location.hash = '#/brands'; else render(); } catch (e) { fail(e); } });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const pct = {}; for (const k of EB_KEYS) { const v = f[`pct_${k}`].value.trim(); pct[k] = v === '' ? null : Math.round(Number(v) * 10) / 10; }
    const it = { ...b, name: f.name.value.trim(), slug: f.slug.value.trim(), aliases: f.aliases.value.split(',').map(s => s.trim()).filter(Boolean), kind1: f.kind1.value, kind2: f.kind2.value, theme: f.theme.value, expensePct: pct, tags: $$('[data-tag].is-on', m).map(x => x.dataset.tag), intro: f.intro.value.trim(), images: imgs };
    const c = CATEGORIES.find(c => c.name === it.kind1); it.code = c ? c.code : null; it.kindCode = c ? (c.kinds.find(k => k[1] === it.kind2) || [null])[0] : null;
    try { await api.saveBrand(it, isNew); cache.brands = null; m.remove(); toast('저장했습니다. 다음 매물 등록부터 적용됩니다.', 'ok'); if (location.hash !== '#/brands') location.hash = '#/brands'; else render(); } catch (err) { fail(err); }
  });
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

// ---------- 직원 계정 (관리자) ----------
route('agents', async view => {
  if (!me.isAdmin) { location.hash = '#/profile'; return; }
  setTitle('직원 계정', '<button class="btn btn--red" data-new>+ 직원 추가</button>');
  const items = await api.agents(); cache.agents = items; const listings = cache.listings || await api.listings(); cache.listings = listings;
  const wk = weekAgo(); const live = listings.filter(l => l.status !== 'archived');
  const unassigned = live.filter(l => !l.agentId); const legacyOpen = live.filter(l => srcOf(l) === 'legacy');
  view.innerHTML = `<div class="grid4" style="margin-bottom:14px"><div class="stat"><b>${items.filter(a => a.active !== false).length}</b><span>활성 계정</span></div><div class="stat ink"><b>${live.filter(l => String(l.createdAt) >= wk && l.createdBy).length}</b><span>최근 7일 신규 등록</span></div><a class="stat" href="#/listings" style="text-decoration:none"><b>${unassigned.length}</b><span>담당 미배정 매물</span></a><div class="stat blue"><b>${legacyOpen.length}</b><span>외부 수집 · 검증 대기</span></div></div>
  <div class="table-wrap"><table class="table"><thead><tr><th></th><th>이름</th><th>아이디</th><th>직책</th><th>휴대폰</th><th class="right">등록한 매물</th><th class="right">최근 7일</th><th class="right">담당 · 공개</th><th class="right">담당 · 전체</th><th>권한</th><th>상태</th><th></th></tr></thead><tbody>${items.map(a => { const mine = live.filter(l => l.agentId === a.id); const made = live.filter(l => l.createdBy === a.id); return `<tr style="${a.active === false ? 'opacity:.55' : ''}"><td>${a.photo ? `<img class="avatar" src="${thumbSrc(a.photo)}" alt="">` : '<div class="avatar"></div>'}</td><td><b>${esc(a.name)}</b></td><td class="muted">${esc(a.id)}</td><td>${esc(a.role)}</td><td>${esc(a.mobile)}</td><td class="right">${made.length}</td><td class="right">${made.filter(l => String(l.createdAt) >= wk).length}</td><td class="right">${mine.filter(l => l.status === 'active').length}</td><td class="right">${mine.length}</td><td>${a.isAdmin ? '<span class="badge y">관리자</span>' : '직원'}</td><td><span class="badge ${a.active !== false ? 'g' : 'c'}">${a.active !== false ? '활성' : '비활성(퇴사)'}</span></td><td class="nowrap"><button class="btn btn--sm" data-edit="${a.id}">수정</button> ${mine.length ? `<button class="btn btn--sm btn--ghost" data-move="${a.id}">매물 이관</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
  <p class="muted" style="margin-top:10px;font-size:.84rem">퇴사한 직원은 <b>수정 → 활성 해제</b>로 로그인만 막습니다. 계정과 매물·문의 기록은 그대로 남고, <b>매물 이관</b>으로 담당 매물과 진행 중 문의를 다른 직원에게 한 번에 넘길 수 있습니다. 개별 매물은 매물 관리에서 체크 후 "담당 변경"으로 바꿉니다.</p>`;
  const edit = a => agentForm(a, async () => { cache.agents = null; render(); });
  $$('[data-edit]', view).forEach(b => b.addEventListener('click', () => edit(items.find(a => a.id === b.dataset.edit))));
  $$('[data-move]', view).forEach(b => b.addEventListener('click', () => {
    const from = items.find(a => a.id === b.dataset.move); const n = live.filter(l => l.agentId === from.id).length;
    const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel" style="width:min(460px,100%)"><h2>${esc(from.name)} 매물 이관</h2><p class="muted" style="margin:8px 0">담당 매물 ${n}건과 진행 중인 문의를 아래 직원에게 넘깁니다.</p><label class="field"><span>이관받을 직원</span><select data-to>${items.filter(a => a.id !== from.id && a.active !== false).map(a => `<option value="${a.id}">${esc(a.name)} (${esc(a.role || '')})</option>`).join('')}</select></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" data-close>취소</button><button class="btn btn--red" data-go>이관</button></div></div>`;
    document.body.appendChild(m); $('[data-close]', m).addEventListener('click', () => m.remove()); $('.modal__bg', m).addEventListener('click', () => m.remove());
    $('[data-go]', m).addEventListener('click', async () => { try { const r = await api.transferAgent(from.id, $('[data-to]', m).value); m.remove(); toast(`${r.n}건 이관했습니다`, 'ok'); cache.listings = null; render(); } catch (e) { fail(e); } });
  }));
  $('[data-new]').addEventListener('click', () => edit(null));
});
function agentForm(a, done) {
  const isNew = !a; a = a || { id: '', name: '', role: '창업전문가', mobile: '', tel: '', kakao: '', email: '', photo: '', intro: '', active: true, isAdmin: false };
  const self = !isNew && a.id === me.id;
  const m = document.createElement('div'); m.className = 'modal is-open'; m.innerHTML = `<div class="modal__bg"></div><div class="modal__panel"><h2>${isNew ? '직원 추가' : `${esc(a.name)} 정보 수정`}</h2><form data-f style="display:grid;gap:10px;margin-top:10px"><div class="grid2">
    <label class="field req"><span>아이디 (로그인)</span><input name="id" value="${esc(a.id)}" ${isNew ? 'required pattern="[A-Za-z0-9_]{3,20}"' : 'readonly'} placeholder="영문·숫자 3~20자"></label><label class="field req"><span>이름</span><input name="name" value="${esc(a.name)}" required></label>
    <label class="field"><span>직책</span><input name="role" value="${esc(a.role)}" placeholder="팀장 / 전무 / 창업전문가"></label><label class="field req"><span>휴대폰 (고객 연결·문자 수신)</span><input name="mobile" value="${esc(a.mobile)}" required placeholder="010-0000-0000"></label>
    <label class="field"><span>사무실 전화</span><input name="tel" value="${esc(a.tel || '')}"></label><label class="field"><span>카카오톡 ID</span><input name="kakao" value="${esc(a.kakao || '')}"></label>
    <label class="field"><span>이메일</span><input name="email" value="${esc(a.email || '')}"></label><label class="field"><span>프로필 사진</span><div style="display:flex;gap:8px;align-items:center">${a.photo ? `<img class="avatar" src="${thumbSrc(a.photo)}" alt="" data-ph-img>` : '<div class="avatar" data-ph-img></div>'}<input type="hidden" name="photo" value="${esc(a.photo || '')}"><label class="btn btn--sm">올리기<input type="file" accept="image/*" hidden data-ph></label></div></label></div>
    <label class="field"><span>소개 (담당자 페이지에 표시)</span><textarea name="intro" rows="4">${esc(a.intro || '')}</textarea></label>
    ${me.isAdmin ? `<div class="chips"><label class="chip"><input type="checkbox" name="active" ${a.active !== false ? 'checked' : ''}> 활성 (해제 = 퇴사 처리, 매물은 유지)</label><label class="chip"><input type="checkbox" name="isAdmin" ${a.isAdmin ? 'checked' : ''}> 관리자 권한</label></div>` : ''}
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
      <label class="field"><span>발신번호</span><input name="sender" value="${esc(sms.sender || '')}" placeholder="등록된 발신번호 (숫자만)"></label>
      <div class="grid2"><label class="field"><span>알리고 API key</span><input name="aligoKey" value="${esc(sms.aligoKey || '')}"></label><label class="field"><span>알리고 user_id</span><input name="aligoUser" value="${esc(sms.aligoUser || '')}"></label><label class="field"><span>솔라피 API key</span><input name="solapiKey" value="${esc(sms.solapiKey || '')}"></label><label class="field"><span>솔라피 API secret</span><input name="solapiSecret" value="${esc(sms.solapiSecret || '')}"></label></div>
      <label class="chip"><input type="checkbox" name="notifyAdmin" ${s.notifyAdmin ? 'checked' : ''}> 새 문의가 오면 관리자에게도 문자</label>
      <div style="display:flex;gap:8px"><button class="btn btn--red" type="submit">저장</button><button class="btn" type="button" data-test>내 번호로 테스트 발송</button></div></form></div>
    <div><div class="card"><h2>사이트 반영</h2><p class="muted">매물·담당자 변경은 저장 후 약 10초 뒤 자동으로 사이트에 반영됩니다. 바로 반영하려면 아래 버튼.</p>${s.lastBuild ? `<p>마지막 반영: <b>${s.lastBuild.ok ? '정상' : '실패'}</b> · ${new Date(s.lastBuild.at).toLocaleString('ko-KR', { hour12: false })}${s.lastBuild.ms ? ` · ${(s.lastBuild.ms / 1000).toFixed(1)}초` : ''}</p>${!s.lastBuild.ok ? `<pre style="white-space:pre-wrap;font-size:.75rem;background:var(--cream-2);padding:8px;border-radius:8px">${esc(s.lastBuild.log || '')}</pre>` : ''}` : ''}<button class="btn btn--yellow" data-rebuild>지금 사이트 반영</button></div>
    <div class="card" style="margin-top:14px"><h2>사이트 정보</h2><p class="muted" style="font-size:.84rem">여기서 바꾸면 사이트 전체(상단·하단·문의 버튼)에 반영됩니다. 대표번호를 비워 두면 전화 버튼 대신 문의 버튼이 나옵니다.</p><form data-site style="display:grid;gap:10px;margin-top:8px"><div class="grid2"><label class="field"><span>대표번호</span><input name="phone" value="${esc(s.site?.phone || '')}" placeholder="예) 02-000-0000 (비우면 숨김)"></label><label class="field"><span>대표 이메일</span><input name="email" value="${esc(s.site?.email || '')}" placeholder="비우면 숨김"></label><label class="field" style="grid-column:1/-1"><span>상담 시간 안내</span><input name="hours" value="${esc(s.site?.hours || '')}" placeholder="예) 평일 09:00~18:00 · 온라인 문의 24시간"></label></div>
      <p style="font-weight:900;margin:8px 0 0">방문 분석 · 검색엔진 연결 <span class="muted" style="font-weight:500;font-size:.8rem">ID만 넣으면 사이트 모든 페이지에 자동 삽입됩니다</span></p><div class="grid2">${[['gaId', 'GA4 측정 ID', 'G-XXXXXXXXXX'], ['gtmId', '구글 태그 매니저 ID', 'GTM-XXXXXXX'], ['naverWa', '네이버 애널리틱스 사이트 ID', '예) a1b2c3d4e5f6'], ['clarityId', 'MS Clarity 프로젝트 ID (히트맵)', '예) abcd1234ef'], ['googleVerification', '구글 서치콘솔 확인 코드', 'meta content 값'], ['naverVerification', '네이버 서치어드바이저 확인 코드', 'meta content 값'], ['bingVerification', '빙 웹마스터 확인 코드', 'msvalidate.01 content 값']].map(([k, t, ph]) => `<label class="field"><span>${t}</span><input name="${k}" value="${esc(s.site?.[k] || '')}" placeholder="${ph}"></label>`).join('')}</div><div><button class="btn btn--red" type="submit">사이트 정보 저장</button></div></form><p class="muted" style="font-size:.78rem;margin-top:8px">상호·대표·사업자번호·주소는 사업자등록증 기준으로 고정되어 있습니다. 사이트 주소: <a href="${esc(s.siteUrl || '../')}" target="_blank">${esc(s.siteUrl || '(미설정)')}</a></p></div>
    <div class="card" style="margin-top:14px"><h2>자동 백업 · 데이터 안전</h2><div data-backups class="muted">불러오는 중…</div></div>
    <div class="card" style="margin-top:14px"><h2>백업 파일 · 복원 · 데이터 불러오기</h2><p class="muted" style="font-size:.84rem">백업 파일(JSON)에는 매물·변경 이력·브랜드·직원 계정·문의·설정·글이 모두 들어갑니다. 서버가 자동으로도 백업하지만, 월 1회 정도는 내려받아 PC에도 보관하세요. 복원하기 직전 상태는 자동으로 백업됩니다.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn--yellow" data-backup>백업 내려받기</button><label class="btn">백업 파일로 복원 / 매물 불러오기<input type="file" accept="application/json,.json" hidden data-restore></label><select data-restore-mode><option value="merge">합치기 (같은 번호는 덮어씀)</option><option value="replace">전체 교체 (주의)</option></select></div><p class="muted" style="font-size:.78rem;margin-top:6px">매물만 담긴 JSON 배열을 올리면 "매물 불러오기"로 처리합니다.</p></div>
    <div class="card" style="margin-top:14px"><h2>활동 기록</h2><div data-audit class="muted">불러오는 중…</div></div></div></div>`;
  $('[data-sms]', view).addEventListener('submit', async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries()); try { await api.saveSettings({ sms: { provider: fd.provider, sender: fd.sender, aligoKey: fd.aligoKey, aligoUser: fd.aligoUser, solapiKey: fd.solapiKey, solapiSecret: fd.solapiSecret }, notifyAdmin: !!e.target.notifyAdmin.checked }); toast('저장했습니다', 'ok'); } catch (err) { fail(err); } });
  $('[data-test]', view).addEventListener('click', async () => { try { const r = await api.testSms(me.mobile); toast(r.ok ? '테스트 문자를 보냈습니다' : '발송 실패: ' + r.detail, r.ok ? 'ok' : 'err', 5000); } catch (e) { fail(e); } });
  $('[data-rebuild]', view).addEventListener('click', async () => { try { await api.rebuild(); toast('반영을 시작했습니다. 10~60초 뒤 사이트를 새로고침하세요.', 'ok', 5000); } catch (e) { fail(e); } });
  $('[data-site]', view).addEventListener('submit', async e => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries()); try { await api.saveSettings({ site: Object.fromEntries(['phone', 'email', 'hours', 'gaId', 'gtmId', 'naverWa', 'clarityId', 'googleVerification', 'naverVerification', 'bingVerification'].map(k => [k, String(fd[k] || '').trim()])) }); toast('저장했습니다. 사이트에는 1분 안에 반영됩니다.', 'ok'); } catch (err) { fail(err); } });
  $('[data-backup]', view).addEventListener('click', async () => { try { const blob = await api.backup(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `changupguide-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('백업 파일을 내려받았습니다', 'ok'); } catch (e) { fail(e); } });
  $('[data-restore]', view).addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; const mode = $('[data-restore-mode]', view).value; try { const data = JSON.parse(await file.text()); const n = Array.isArray(data) ? data.length : Object.values(data.tables || {}).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0); if (!confirm(`${file.name} (${n}건)을 ${mode === 'replace' ? '전체 교체' : '합치기'} 방식으로 복원할까요?${mode === 'replace' ? '\n\n현재 데이터가 백업 내용으로 바뀝니다.' : ''}`)) return; const r = await api.restore(data, mode); toast('복원 완료: ' + Object.entries(r.counts || {}).map(([k, v]) => `${k} ${v}`).join(', '), 'ok', 6000); cache = {}; } catch (err) { fail(err); } e.target.value = ''; });
  const drawBackups = async () => { const box = $('[data-backups]', view); try {
    const b = await api.backups(); const st = b.storage || {}; const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB';
    const KIND = { boot: '배포·재시작 때', hourly: '1시간마다 (변경 있을 때)', daily: '매일', prerestore: '복원 직전', manual: '직접 만든 백업' };
    box.innerHTML = `<p style="margin:0 0 6px">${st.persistent ? '<span class="badge g">안전</span> 데이터가 Railway 볼륨에 저장되어 코드 업데이트·재배포 때 지워지지 않습니다.' : '<span class="badge r">위험</span> 볼륨이 연결되지 않았습니다 — 재배포 시 데이터가 사라집니다.'}</p>
      <p class="muted" style="font-size:.82rem;margin:0 0 8px">자동 백업: 배포·재시작 때, 변경이 있으면 1시간마다, 매일 1회, 복원 직전. DB ${st.dbBytes ? kb(st.dbBytes) : '-'} · 마지막 백업 ${st.lastBackup?.at ? fmtDT(st.lastBackup.at) + (st.lastBackup.ok ? '' : ' (실패)') : '-'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="btn btn--yellow btn--sm" data-mk-backup>지금 백업 만들기</button></div>
      ${(b.items || []).length ? `<div style="max-height:260px;overflow:auto"><table class="table" style="font-size:.8rem">${b.items.slice(0, 60).map(x => `<tr><td class="nowrap">${esc(fmtDT(x.at))}</td><td>${esc(KIND[x.kind] || x.kind)}</td><td class="muted">${kb(x.size)}</td><td class="nowrap"><a class="btn btn--sm" href="${esc(api.backupUrl(x.name))}">내려받기</a> <button class="btn btn--sm btn--ghost" data-bk-restore="${esc(x.name)}">이 시점으로 되돌리기</button></td></tr>`).join('')}</table></div>` : '<p class="muted">아직 백업이 없습니다.</p>'}
      ${b.backupKey ? `<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:.82rem">PC 자동 백업 키 (deploy.bat 이 배포 때마다 PC에 백업을 내려받는 데 사용)</summary><p style="font-size:.8rem;word-break:break-all;margin:6px 0"><code>${esc(b.backupKey)}</code></p></details>` : ''}`;
    $('[data-mk-backup]', box)?.addEventListener('click', async () => { try { const r = await api.makeBackup(); toast('백업을 만들었습니다: ' + r.name, 'ok'); drawBackups(); } catch (e) { fail(e); } });
    $$('[data-bk-restore]', box).forEach(btn => btn.addEventListener('click', async () => { if (!confirm(`${btn.dataset.bkRestore} 시점으로 전체 데이터를 되돌릴까요?\n\n그 이후에 등록·수정한 내용은 사라집니다. (지금 상태는 "복원 직전" 백업으로 자동 보관되어 다시 되돌릴 수 있습니다)`)) return; try { const r = await api.restoreBackup(btn.dataset.bkRestore, 'replace'); toast('되돌렸습니다: ' + Object.entries(r.counts || {}).map(([k, v]) => `${k} ${v}`).join(', '), 'ok', 7000); cache = {}; drawBackups(); } catch (e) { fail(e); } }));
  } catch (e) { box.textContent = e.message; } };
  drawBackups();
  try { const a = await api.audit(); $('[data-audit]', view).innerHTML = `<table class="table" style="font-size:.8rem">${a.slice(0, 40).map(x => `<tr><td class="nowrap">${new Date(x.at).toLocaleString('ko-KR', { hour12: false }).slice(0, 17)}</td><td>${esc(agentName(x.agentId))}</td><td>${esc(x.action)}</td><td>${esc(x.target)} ${esc(String(x.detail || '').slice(0, 40))}</td></tr>`).join('')}</table>`; } catch { $('[data-audit]', view).textContent = '-'; }
});

// ---------- 사용 안내 ----------
route('help', async view => {
  setTitle('사용 매뉴얼', '<a class="btn btn--red" href="manual.html" target="_blank">전체 매뉴얼 열기 · 인쇄</a>');
  const box = (t, items) => `<div class="card"><h2>${t}</h2><ol class="help-list">${items.map(x => `<li>${x}</li>`).join('')}</ol></div>`;
  view.innerHTML = `<div class="grid2" style="align-items:start">
    ${box('매물 등록 (1분)', ['왼쪽 <b>매물 관리</b> → 오른쪽 위 <b>+ 매물 등록</b>', '<b>지역</b>: 구 이름 일부만 입력 (예: "양천" → 서울 양천구)', '<b>브랜드</b>: 목록에서 고르면 업종·지출 비율이 자동으로 들어갑니다. 개인 매장이면 비워 두세요', '<b>월매출·권리금</b>: 만원 단위 숫자 (3500 = 3,500만원, "1억2천"도 됨). 월수익은 자동 계산되며 직접 고쳐도 됩니다', '<b>등록</b> 또는 여러 건이면 <b>등록 후 계속</b>. 쓰다가 닫혀도 다음에 "이어서 작성"으로 복구됩니다'])}
    ${box('사진', ['매물 화면 2번 칸의 <b>📷 사진 올리기</b> → 휴대폰이면 바로 촬영 가능', '컴퓨터에서는 사진 파일을 칸 위로 끌어다 놓아도 됩니다', '첫 번째 사진이 대표 사진입니다. ‹ › 버튼으로 순서를 바꿉니다', '정확한 위치가 드러나는 간판·주소 사진은 피해주세요'])}
    ${box('수정·상태 변경', ['<b>내가 등록한 매물</b>에서 제목을 누르면 수정 화면이 열립니다', '거래가 끝났거나 잠시 내릴 때는 목록의 상태 칸에서 바로 <b>거래완료 / 보류</b>로 바꾸세요', '비슷한 매물은 <b>복제</b>로 만든 뒤 숫자만 고치면 빠릅니다', '저장하면 사이트에는 1분 안에 반영됩니다'])}
    ${box('여러 명이 함께 써도 안전', ['같은 매물을 둘이 동시에 고쳐도 <b>서로 다른 칸은 자동으로 합쳐</b> 저장됩니다', '같은 칸을 다르게 고친 경우에만 두 값을 보여 주고 어느 쪽을 쓸지 묻습니다', '인터넷이 끊기거나 서버가 업데이트 중이면 <b>자동으로 다시 시도</b>합니다. 입력 내용은 화면에 그대로 남습니다', '수정하다 창이 닫혀도 그 매물을 다시 열면 <b>불러오기</b>로 이어서 저장할 수 있습니다', '모든 수정·삭제는 <b>변경 이력</b>에 남습니다. 매물 수정 화면 위 "변경 이력"에서 언제든 되돌리세요'])}
    ${box('직원 · 관리자', ['다른 직원 담당 매물은 수정할 수 없습니다. 담당 변경은 <b>메시지</b>로 관리자에게 요청', '관리자: <b>직원 계정</b>에서 직원 추가·퇴사 처리·매물 이관', '관리자: <b>브랜드 관리</b>에서 업종·평균 지출 비율을 고치면 다음 등록부터 적용', '관리자: <b>설정·백업</b>에서 사이트 정보 수정, 자동 백업 확인·시점 되돌리기, 월 1회 백업 내려받기'])}
  </div>`;
});

// ---------- 시작 ----------
(async () => {
  api = await createApi();
  try { const m = await api.me(); me = m.user; unread = m.unread; } catch { me = null; }
  if (!location.hash) location.hash = '#/dashboard';
  render();
})();
