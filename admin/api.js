// 관리자 데이터 계층 — RemoteApi(서버 /api) 와 LocalApi(데모: 브라우저 저장소) 가 같은 메서드를 제공합니다.
const API = (window.CU_API || '').replace(/__API_URL__/, '').replace(/\/$/, '');
const now = () => new Date().toISOString();
const uid = (p = '') => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export class RemoteApi {
  constructor() { this.demo = false; this.base = API; }
  async req(path, method = 'GET', body) {
    // 서버 재배포(약 10~40초)·순간 끊김 동안에는 자동으로 다시 시도 — 입력한 내용이 날아가지 않도록
    let r, wait = [1500, 3000, 5000, 8000, 12000];
    for (let i = 0; ; i++) {
      try { r = await fetch(this.base + '/api' + path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); if (![502, 503, 504].includes(r.status) || i >= wait.length) break; }
      catch (e) { if (i >= wait.length) { const err = new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 저장하세요. (작성 내용은 이 화면에 그대로 있습니다)'); err.status = 0; throw err; } }
      window.dispatchEvent(new CustomEvent('cu-retry', { detail: i + 1 })); await new Promise(res => setTimeout(res, wait[i]));
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || `오류 ${r.status}`); e.status = r.status; e.data = j; throw e; }
    return j;
  }
  async init() { return true; }
  login(id, password) { return this.req('/auth/login', 'POST', { id, password }); }
  logout() { return this.req('/auth/logout', 'POST', {}); }
  me() { return this.req('/me'); }
  stats() { return this.req('/stats'); }
  listings() { return this.req('/listings').then(r => r.items); }
  getListing(id) { return this.req(`/listings/${id}`); }
  createListing(l) { return this.req('/listings', 'POST', { listing: l }); }
  updateListing(l, baseUpdatedAt, baseItem, force) { return this.req(`/listings/${l.id}`, 'PUT', { listing: l, baseUpdatedAt, baseItem, force: !!force }); }
  listingHistory(id) { return this.req(`/listings/${id}/history`); }
  revertListing(id, hid) { return this.req(`/listings/${id}/history/${hid}/restore`, 'POST', {}); }
  backups() { return this.req('/backups'); }
  makeBackup() { return this.req('/backups', 'POST', {}); }
  restoreBackup(name, mode) { return this.req(`/backups/${encodeURIComponent(name)}/restore`, 'POST', { mode }); }
  backupUrl(name) { return `${this.base}/api/backups/${encodeURIComponent(name)}`; }
  archiveListing(id) { return this.req(`/listings/${id}`, 'DELETE'); }
  reassign(id, agentId) { return this.req(`/listings/${id}/reassign`, 'POST', { agentId }); }
  lock(id) { return this.req(`/listings/${id}/lock`, 'POST', {}); }
  photos() { return this.req('/photos').then(r => r.items); }
  uploadPhoto(p) { return this.req('/photos', 'POST', p).then(r => r.item); }
  deletePhoto(id) { return this.req(`/photos/${id}`, 'DELETE'); }
  agents() { return this.req('/agents').then(r => r.items); }
  createAgent(a) { return this.req('/agents', 'POST', a); }
  updateAgent(id, a) { return this.req(`/agents/${id}`, 'PUT', a); }
  inquiries() { return this.req('/inquiries').then(r => r.items); }
  updateInquiry(id, patch) { return this.req(`/inquiries/${id}`, 'PUT', patch); }
  calls() { return this.req('/calls').then(r => r.items); }
  messages() { return this.req('/messages').then(r => r.items); }
  sendMessage(m) { return this.req('/messages', 'POST', m); }
  notices() { return this.req('/notices').then(r => r.items); }
  postNotice(n) { return this.req('/notices', 'POST', n); }
  readNotice(id) { return this.req(`/notices/${id}/read`, 'POST', {}); }
  posts() { return this.req('/posts').then(r => r.items); }
  generatePosts(o) { return this.req('/posts/generate', 'POST', o || {}); }
  updatePost(slug, patch) { return this.req(`/posts/${slug}`, 'PUT', patch); }
  settings() { return this.req('/settings'); }
  saveSettings(s) { return this.req('/settings', 'PUT', s); }
  testSms(to) { return this.req('/settings/test-sms', 'POST', { to }); }
  rebuild() { return this.req('/rebuild', 'POST', {}); }
  audit() { return this.req('/audit').then(r => r.items); }
  bulkListings(ids, patch) { return this.req('/listings/bulk', 'POST', { ids, patch }); }
  transferAgent(id, toId) { return this.req(`/agents/${id}/transfer`, 'POST', { toId }); }
  brands() { return this.req('/brands').then(r => r.items); }
  saveBrand(b, isNew) { return isNew ? this.req('/brands', 'POST', { brand: b }) : this.req(`/brands/${encodeURIComponent(b.slug)}`, 'PUT', { brand: b }); }
  deleteBrand(slug) { return this.req(`/brands/${encodeURIComponent(slug)}`, 'DELETE'); }
  async backup() { const r = await fetch(this.base + '/api/backup', { credentials: 'include' }); if (!r.ok) throw new Error('백업 실패 ' + r.status); return r.blob(); }
  restore(backup, mode) { return this.req('/restore', 'POST', { backup, mode }); }
}

// ---------- 데모 (서버 없이 GitHub Pages 미리보기) ----------
export class LocalApi {
  constructor() { this.demo = true; this.key = 'cu-admin-demo-v2'; this.db = null; this.user = null; }
  async init() {
    try { this.db = JSON.parse(localStorage.getItem(this.key)); } catch {}
    if (!this.db) {
      const [listings, agents, posts, brands] = await Promise.all(['listings', 'agents', 'posts', 'brands'].map(n => fetch(`seed/${n}.json`).then(r => r.json()).catch(() => [])));
      // 외부(창업미디어) 수집 매장은 담당 미배정 상태로 시작 (담당자 연락처 검증 전)
      const own = new Set(agents.map(a => a.id)); for (const l of listings) if (!own.has(l.agentId)) { l.agentId = ''; l.agentName = ''; l.agentPhone = ''; }
      this.db = { listings, brands, agents: [{ id: 'admin', name: '총괄 관리자', role: '대표', mobile: '', tel: '', kakao: '', email: '', photo: '', intro: '', active: true, isAdmin: true }, { id: 'staff1', name: '데모 직원', role: '창업전문가', mobile: '010-0000-0000', tel: '', kakao: '', email: '', photo: '', intro: '', active: true, isAdmin: false }, ...agents.map(a => ({ ...a, isAdmin: false }))], photos: [], inquiries: [], calls: [], messages: [], notices: [{ id: 'n1', title: '관리자 사용 안내', body: '매장은 본인 담당만 수정할 수 있습니다. 담당 변경은 관리자에게 메시지로 요청하세요. 사진은 "사진 라이브러리"에 올려두면 매장 등록 때 골라 쓸 수 있습니다.', authorId: 'admin', createdAt: now(), reads: [] }], posts, settings: { sms: { provider: 'none', sender: '' }, notifyAdmin: true }, audit: [] };
      // 데모용 샘플 문의·통화
      const l0 = listings.find(l => l.status === 'active'); if (l0) {
        this.db.inquiries.push({ id: 'i1', type: 'sms', name: '김예비', phone: '010-1234-5678', message: '직접 볼 수 있나요? 금액 조정 가능한가요?', listingId: l0.id, agentId: l0.agentId, data: {}, status: 'new', note: '', createdAt: now(), updatedAt: now() });
        this.db.calls.push({ id: 'c1', listingId: l0.id, agentId: l0.agentId, phone: l0.agentPhone, title: l0.title, url: '', ua: 'iPhone', smsStatus: 'demo', smsDetail: '데모 — 서버 연결 시 실제 문자 발송', createdAt: now() });
      }
      // 사진 라이브러리: 기존 매장 사진을 라이브러리 항목으로
      const seen = new Set();
      for (const l of listings) for (const p of (l.images || [])) if (!seen.has(p) && seen.size < 400) { seen.add(p); this.db.photos.push({ id: 'p' + seen.size, file: p, thumb: p.replace('photos/', 'photos/thumb/'), name: `No.${l.id}`, agentId: l.agentId, tags: [l.brand || l.kind2].filter(Boolean), createdAt: l.createdAt }); }
      this.save();
    }
    this.user = this.db.agents.find(a => a.id === sessionStorage.getItem('cu-demo-user')) || null;
    return true;
  }
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.db)); } catch (e) { console.warn('저장 실패(용량)', e); } }
  reset() { localStorage.removeItem(this.key); sessionStorage.removeItem('cu-demo-user'); }
  canEdit(u, l) { return u.isAdmin || l.agentId === u.id || (l.createdBy === u.id && !l.agentId); }
  need() { if (!this.user) throw new Error('로그인이 필요합니다'); return this.user; }
  admin() { const u = this.need(); if (!u.isAdmin) throw new Error('관리자 권한이 필요합니다'); return u; }
  log(action, target, detail = '') { this.db.audit.unshift({ id: this.db.audit.length + 1, agentId: this.user?.id, action, target: String(target), detail, at: now() }); this.db.audit = this.db.audit.slice(0, 300); }
  async login(id, password) { const a = this.db.agents.find(x => x.id === id && x.active !== false); if (!a || password !== '1234') throw new Error('아이디 또는 비밀번호가 올바르지 않습니다 (데모: 비밀번호 1234)'); this.user = a; sessionStorage.setItem('cu-demo-user', a.id); this.log('login', ''); return { user: a }; }
  async logout() { this.user = null; sessionStorage.removeItem('cu-demo-user'); return {}; }
  async me() { const u = this.need(); const unread = this.db.messages.filter(m => m.toId === u.id && !m.readAt).length + this.db.notices.filter(n => !(n.reads || []).includes(u.id)).length; return { user: u, unread, demo: true }; }
  async stats() { const u = this.need(); const mine = l => u.isAdmin || l.agentId === u.id; return { listings: this.db.listings.filter(l => l.status === 'active' && mine(l)).length, held: this.db.listings.filter(l => l.status === 'held' && mine(l)).length, newInquiries: this.db.inquiries.filter(i => i.status === 'new' && (u.isAdmin || i.agentId === u.id || !i.agentId)).length, callsToday: this.db.calls.filter(c => mine(c) && Date.now() - new Date(c.createdAt) < 86400000).length, lastBuild: { at: now(), ok: true, ms: 0, log: '데모 모드 — 저장 즉시 반영된 것으로 표시' } }; }
  async listings() { this.need(); return [...this.db.listings].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
  async getListing(id) { this.need(); const l = this.db.listings.find(x => x.id === String(id)); if (!l) throw new Error('없는 매장'); return { item: l, lock: null }; }
  async createListing(l) { const u = this.need(); l.id = l.id && !this.db.listings.some(x => x.id === String(l.id)) ? String(l.id) : String(Math.max(800000, ...this.db.listings.map(x => Number(x.id) || 0)) + 1); if (!u.isAdmin || !l.agentId) l.agentId = u.id; const ag = this.db.agents.find(a => a.id === l.agentId); if (ag) { l.agentName = ag.name; l.agentPhone = ag.mobile; } l.createdAt = l.updatedAt = now(); l.status = l.status || 'active'; l.createdBy = u.id; l.source = 'own'; if (!u.isAdmin) delete l.verified; const dup = this.db.listings.find(x => x.agentId === l.agentId && x.status !== 'archived' && x.sido === l.sido && x.gugun === l.gugun && (x.brand || x.kind2) === (l.brand || l.kind2) && x.premium === l.premium && x.sales === l.sales); this.db.listings.unshift(l); this.log('listing_create', l.id, l.title); this.save(); return { item: l, duplicateOf: dup ? dup.id : null }; }
  async updateListing(l, baseUpdatedAt) { const u = this.need(); const i = this.db.listings.findIndex(x => x.id === String(l.id)); if (i < 0) throw new Error('없는 매장'); const cur = this.db.listings[i]; if (!this.canEdit(u, cur)) throw new Error('본인 담당 매장만 수정할 수 있습니다. 담당자 변경은 관리자에게 요청하세요.'); if (baseUpdatedAt && baseUpdatedAt !== cur.updatedAt) { const e = new Error('다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.'); e.status = 409; e.data = { current: cur }; throw e; } if (!u.isAdmin) l.agentId = cur.agentId; const ag = this.db.agents.find(a => a.id === l.agentId); if (ag) { l.agentName = ag.name; l.agentPhone = ag.mobile; } l.createdAt = cur.createdAt; l.createdBy = cur.createdBy; l.source = cur.source; if (!u.isAdmin) l.verified = cur.verified; l.updatedAt = now(); l.updatedBy = u.id; this.db.listings[i] = l; this.log('listing_update', l.id, l.title); this.save(); return { item: l }; }
  async archiveListing(id) { const u = this.need(); const l = this.db.listings.find(x => x.id === String(id)); if (!l) throw new Error('없는 매장'); if (!this.canEdit(u, l)) throw new Error('본인 담당 매장만'); l.status = 'archived'; l.updatedAt = now(); this.log('listing_archive', id); this.save(); return { ok: true }; }
  async reassign(id, agentId) { const u = this.admin(); const l = this.db.listings.find(x => x.id === String(id)); const ag = this.db.agents.find(a => a.id === agentId); if (!l || !ag) throw new Error('없음'); const prev = l.agentId; l.agentId = ag.id; l.agentName = ag.name; l.agentPhone = ag.mobile; l.updatedAt = now(); this.db.messages.unshift({ id: uid('m'), fromId: u.id, toId: ag.id, listingId: l.id, body: `매장 No.${l.id} (${l.title}) 담당이 ${prev}에서 ${ag.name}님으로 변경되었습니다.`, readAt: null, createdAt: now() }); if (prev && prev !== ag.id) this.db.messages.unshift({ id: uid('m'), fromId: u.id, toId: prev, listingId: l.id, body: `매장 No.${l.id} (${l.title}) 담당이 ${ag.name}님으로 이관되었습니다.`, readAt: null, createdAt: now() }); this.log('listing_reassign', id, `${prev}→${ag.id}`); this.save(); return { item: l }; }
  async lock() { return { ok: true }; }
  async listingHistory() { return { items: [], current: null }; }
  async revertListing() { throw new Error('데모 모드에서는 지원하지 않습니다'); }
  async backups() { return { items: [], storage: { persistent: true, demo: true }, backupKey: '' }; }
  async makeBackup() { throw new Error('데모 모드에서는 지원하지 않습니다'); }
  async restoreBackup() { throw new Error('데모 모드에서는 지원하지 않습니다'); }
  backupUrl() { return '#'; }
  async photos() { this.need(); return [...this.db.photos].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
  async uploadPhoto(p) { const u = this.need(); const it = { id: uid('p'), file: p.data, thumb: p.thumb || p.data, name: p.name, agentId: u.id, tags: p.tags || [], w: p.w, h: p.h, createdAt: now(), inline: true }; this.db.photos.unshift(it); this.log('photo_upload', it.id, p.name); this.save(); return it; }
  async deletePhoto(id) { const u = this.need(); const ph = this.db.photos.find(p => p.id === id); if (!ph) return {}; if (!u.isAdmin && ph.agentId !== u.id) throw new Error('본인이 올린 사진만 삭제할 수 있습니다'); const used = this.db.listings.filter(l => l.status !== 'archived' && (l.images || []).includes(ph.file)); if (used.length) throw new Error(`매장 ${used.map(l => l.id).join(', ')}에서 사용 중입니다`); this.db.photos = this.db.photos.filter(p => p.id !== id); this.save(); return { ok: true }; }
  async agents() { this.need(); return this.db.agents; }
  async createAgent(a) { this.admin(); if (!/^[a-z0-9_]{3,20}$/i.test(a.id || '')) throw new Error('아이디는 영문·숫자 3~20자'); if (this.db.agents.some(x => x.id === a.id)) throw new Error('이미 있는 아이디'); const it = { id: a.id, name: a.name, role: a.role || '창업전문가', mobile: a.mobile, tel: a.tel || '', kakao: a.kakao || '', email: a.email || '', photo: a.photo || '', intro: a.intro || '', active: true, isAdmin: !!a.isAdmin, createdAt: now() }; this.db.agents.push(it); this.log('agent_create', a.id); this.save(); return { item: it }; }
  async updateAgent(id, a) { const u = this.need(); if (!u.isAdmin && u.id !== id) throw new Error('본인 정보만 수정할 수 있습니다'); const cur = this.db.agents.find(x => x.id === id); if (!cur) throw new Error('없음'); for (const k of ['name', 'role', 'mobile', 'tel', 'kakao', 'email', 'photo', 'intro']) if (a[k] != null) cur[k] = a[k]; if (u.isAdmin) { if (a.active != null) cur.active = !!a.active; if (a.isAdmin != null) cur.isAdmin = !!a.isAdmin; } if (a.password) this.log('password_change', id); for (const l of this.db.listings) if (l.agentId === id) { l.agentName = cur.name; l.agentPhone = cur.mobile; } this.log('agent_update', id); this.save(); return { item: cur }; }
  async inquiries() { const u = this.need(); return this.db.inquiries.filter(i => u.isAdmin || i.agentId === u.id || !i.agentId); }
  async updateInquiry(id, patch) { const u = this.need(); const i = this.db.inquiries.find(x => x.id === id); if (!i) throw new Error('없음'); if (!u.isAdmin && i.agentId && i.agentId !== u.id) throw new Error('담당 문의만 처리할 수 있습니다'); Object.assign(i, { status: patch.status || i.status, note: patch.note ?? i.note, agentId: u.isAdmin && patch.agentId != null ? patch.agentId : (i.agentId || u.id), updatedAt: now() }); this.save(); return { ok: true }; }
  async calls() { const u = this.need(); return this.db.calls.filter(c => u.isAdmin || c.agentId === u.id); }
  async messages() { const u = this.need(); const rows = this.db.messages.filter(m => m.fromId === u.id || m.toId === u.id || m.toId === '*'); for (const m of rows) if (m.toId === u.id && !m.readAt) m.readAt = now(); this.save(); return rows; }
  async sendMessage(m) { const u = this.need(); if (m.toId === '*' && !u.isAdmin) throw new Error('전체 메시지는 관리자만'); const it = { id: uid('m'), fromId: u.id, toId: m.toId, listingId: m.listingId || '', body: m.body, readAt: null, createdAt: now() }; this.db.messages.unshift(it); this.save(); return { ok: true, id: it.id }; }
  async notices() { const u = this.need(); return this.db.notices.map(n => ({ ...n, reads: (n.reads || []).length, readByMe: (n.reads || []).includes(u.id) ? 1 : 0 })); }
  async postNotice(n) { const u = this.admin(); this.db.notices.unshift({ id: uid('n'), title: n.title, body: n.body, authorId: u.id, createdAt: now(), reads: [] }); this.save(); return { ok: true }; }
  async readNotice(id) { const u = this.need(); const n = this.db.notices.find(x => x.id === id); if (n) { n.reads = n.reads || []; if (!n.reads.includes(u.id)) n.reads.push(u.id); } this.save(); return { ok: true }; }
  async posts() { this.need(); return this.db.posts; }
  async generatePosts() { this.admin(); return { ok: true, log: '데모 모드에서는 글 생성이 서버(또는 GitHub Actions)에서만 실행됩니다. 실제 운영에서는 매일 09:05·13:05·18:05에 자동 발행됩니다.' }; }
  async updatePost(slug, patch) { this.admin(); const p = this.db.posts.find(x => x.slug === slug); if (p) Object.assign(p, patch); this.save(); return { ok: true }; }
  async settings() { this.admin(); return { ...this.db.settings, lastBuild: null, siteUrl: location.origin + (window.CU_BASE || '').replace('__SITE_BASE__', ''), base: '' }; }
  async saveSettings(s) { this.admin(); if (s.sms) this.db.settings.sms = { ...this.db.settings.sms, ...s.sms }; if (s.notifyAdmin != null) this.db.settings.notifyAdmin = !!s.notifyAdmin; if (s.site) this.db.settings.site = { ...(this.db.settings.site || {}), ...s.site }; this.save(); return { ok: true }; }
  async testSms() { this.admin(); return { ok: false, detail: '데모 모드 — 서버 연결 후 발송됩니다' }; }
  async rebuild() { this.admin(); return { ok: true }; }
  async audit() { this.admin(); return this.db.audit; }
  async bulkListings(ids, patch) { const u = this.admin(); const ag = patch.agentId ? this.db.agents.find(a => a.id === patch.agentId) : null; let n = 0; for (const l of this.db.listings) { if (!ids.includes(l.id)) continue; if (ag) { l.agentId = ag.id; l.agentName = ag.name; l.agentPhone = ag.mobile; } if (patch.status) l.status = patch.status; if (patch.verified != null) l.verified = !!patch.verified; l.updatedAt = now(); l.updatedBy = u.id; n++; } if (ag) this.db.messages.unshift({ id: uid('m'), fromId: u.id, toId: ag.id, listingId: '', body: `매장 ${n}건이 ${ag.name}님 담당으로 배정되었습니다.`, readAt: null, createdAt: now() }); this.log('listing_bulk', n, JSON.stringify(patch)); this.save(); return { ok: true, n }; }
  async transferAgent(id, toId) { const u = this.admin(); const to = this.db.agents.find(a => a.id === toId); if (!to) throw new Error('이관받을 직원을 선택하세요'); let n = 0; for (const l of this.db.listings) if (l.agentId === id && l.status !== 'archived') { l.agentId = to.id; l.agentName = to.name; l.agentPhone = to.mobile; l.updatedAt = now(); n++; } for (const i of this.db.inquiries) if (i.agentId === id && ['new', 'contacted'].includes(i.status)) i.agentId = to.id; this.db.messages.unshift({ id: uid('m'), fromId: u.id, toId: to.id, listingId: '', body: `${id} 직원의 매장 ${n}건과 진행 중 문의가 ${to.name}님에게 이관되었습니다.`, readAt: null, createdAt: now() }); this.log('agent_transfer', id, `→${toId} ${n}건`); this.save(); return { ok: true, n }; }
  async brands() { this.need(); return this.db.brands || (this.db.brands = []); }
  async saveBrand(b, isNew) { const u = this.admin(); this.db.brands ||= []; const slug = isNew ? String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') : b.slug; if (!slug || !b.name) throw new Error('브랜드명과 영문 주소(slug)를 입력하세요'); const i = this.db.brands.findIndex(x => x.slug === slug); if (isNew && i >= 0) throw new Error('이미 있는 브랜드 주소'); const it = { ...(i >= 0 ? this.db.brands[i] : {}), ...b, slug, updatedAt: now(), updatedBy: u.id }; if (i >= 0) this.db.brands[i] = it; else this.db.brands.unshift(it); this.log(isNew ? 'brand_create' : 'brand_update', slug, b.name); this.save(); return { item: it }; }
  async deleteBrand(slug) { this.admin(); this.db.brands = (this.db.brands || []).filter(b => b.slug !== slug); this.log('brand_delete', slug); this.save(); return { ok: true }; }
  async backup() { this.admin(); return new Blob([JSON.stringify({ app: 'changupguide', version: 1, demo: true, at: now(), tables: { listings: this.db.listings.map(l => ({ id: l.id, data: JSON.stringify(l), agentId: l.agentId, status: l.status, updatedAt: l.updatedAt })), brands: (this.db.brands || []).map(b => ({ slug: b.slug, data: JSON.stringify(b), updatedAt: b.updatedAt })), inquiries: this.db.inquiries } })], { type: 'application/json' }); }
  async restore(d, mode) { this.admin(); const t = Array.isArray(d) ? { listings: d.map(l => ({ id: String(l.id), data: JSON.stringify(l) })) } : d.tables; if (!t) throw new Error('백업 파일 형식이 아닙니다'); const cnt = {}; if (t.listings) { const rows = t.listings.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r); if (mode === 'replace') this.db.listings = rows; else for (const l of rows) { const i = this.db.listings.findIndex(x => x.id === l.id); if (i >= 0) this.db.listings[i] = l; else this.db.listings.unshift(l); } cnt.listings = rows.length; } if (t.brands) { const rows = t.brands.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r); this.db.brands = mode === 'replace' ? rows : [...rows, ...(this.db.brands || []).filter(b => !rows.some(r => r.slug === b.slug))]; cnt.brands = rows.length; } this.log('restore', mode, JSON.stringify(cnt)); this.save(); return { ok: true, counts: cnt }; }
}

export const PROD_ADMIN = 'https://www.changupguide.co.kr/admin/';
export async function createApi() {
  // GitHub Pages 미리보기의 관리자는 브라우저에만 저장되어 직원 입력이 사라질 수 있음 → 운영 관리자로 보냄
  if (/github\.io$/.test(location.hostname) && !new URLSearchParams(location.search).has('demo')) { location.replace(PROD_ADMIN); return new Promise(() => {}); }
  // GitHub Pages 미리보기만 데모, 그 외(Railway·정식 도메인·로컬 서버)는 같은 주소의 /api 에 연결
  if (API || !/github\.io$/.test(location.hostname) && !location.pathname.includes('/changupguide/')) {
    const a = new RemoteApi();
    try { const r = await fetch(a.base + '/api/me', { credentials: 'include' }); if (r.status !== 503 && r.status !== 404 && r.headers.get('content-type')?.includes('json')) return a; } catch {}
  }
  const l = new LocalApi(); await l.init(); return l;
}
