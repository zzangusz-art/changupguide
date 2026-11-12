// 창업가이드 서버 — 의존성 0 (node:http + node:sqlite). 정적 사이트(dist) 서빙 + 관리자 API + 통화 알림 문자 + 자동 재빌드
// 실행: node server.mjs            (API + dist 서빙, DB: data/app.db)
//      node server.mjs --static   (dist만 서빙 — 미리보기용)
// env: PORT, SITE_URL, SITE_BASE, DATA_DIR(기본 ./data), ADMIN_PASSWORD(최초 admin 비밀번호), SMS_PROVIDER(none|aligo|solapi), 제공자별 키
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STATIC_ONLY = process.argv.includes('--static');
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DIST = path.join(ROOT, 'dist');
const PHOTO_DIR = path.join(DATA_DIR, 'photos'); // 업로드 사진 (Railway Volume 안)
const BASE = process.env.SITE_BASE ? '/' + String(process.env.SITE_BASE).replace(/^[A-Za-z]:.*?[\\/]([^\\/]+)$/, '$1').replace(/^\/+|\/+$/g, '') : '';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };

// ---------- DB ----------
let db = null, sqlite = null;
if (!STATIC_ONLY) {
  sqlite = await import('node:sqlite');
  fs.mkdirSync(DATA_DIR, { recursive: true }); fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
  db = new sqlite.DatabaseSync(path.join(DATA_DIR, 'app.db'));
  db.exec(`PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY, name TEXT, role TEXT, mobile TEXT, tel TEXT, kakao TEXT, email TEXT, photo TEXT, intro TEXT, active INTEGER DEFAULT 1, isAdmin INTEGER DEFAULT 0, pass TEXT, createdAt TEXT, updatedAt TEXT);
  CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY, data TEXT, agentId TEXT, status TEXT, updatedAt TEXT, updatedBy TEXT);
  CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, file TEXT, thumb TEXT, name TEXT, agentId TEXT, tags TEXT, w INTEGER, h INTEGER, size INTEGER, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY, type TEXT, name TEXT, phone TEXT, message TEXT, listingId TEXT, agentId TEXT, data TEXT, status TEXT, note TEXT, createdAt TEXT, updatedAt TEXT);
  CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, listingId TEXT, agentId TEXT, phone TEXT, title TEXT, url TEXT, ua TEXT, smsStatus TEXT, smsDetail TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, fromId TEXT, toId TEXT, listingId TEXT, body TEXT, readAt TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY, title TEXT, body TEXT, authorId TEXT, createdAt TEXT);
  CREATE TABLE IF NOT EXISTS notice_reads(noticeId TEXT, agentId TEXT, readAt TEXT, PRIMARY KEY(noticeId, agentId));
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, agentId TEXT, createdAt TEXT, lastAt TEXT);
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS locks(listingId TEXT PRIMARY KEY, agentId TEXT, at TEXT);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, agentId TEXT, action TEXT, target TEXT, detail TEXT, at TEXT);
  CREATE TABLE IF NOT EXISTS brands(slug TEXT PRIMARY KEY, data TEXT, updatedAt TEXT);`);
}
const now = () => new Date().toISOString();
const uid = (p = '') => p + crypto.randomBytes(8).toString('hex');
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex'); };
const checkPw = (pw, h) => { if (!h) return false; const [salt, k] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(k, 'hex'), crypto.scryptSync(pw, salt, 32)); };
const q = (sql, ...p) => db.prepare(sql).all(...p);
const q1 = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const setting = k => { const r = q1('SELECT value FROM settings WHERE key=?', k); return r ? JSON.parse(r.value) : null; };
const setSetting = (k, v) => run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, JSON.stringify(v));
const audit = (agentId, action, target, detail = '') => run('INSERT INTO audit(agentId,action,target,detail,at) VALUES(?,?,?,?,?)', agentId, action, String(target), typeof detail === 'string' ? detail : JSON.stringify(detail), now());
if (db) { seedIfEmpty(); seedBrands(); seedSite(); setTimeout(() => rebuild(), 1500); }
// 사이트 정보·추적 ID: DB에 아직 없으면 저장소의 src/data/site.json 값으로 시작
function seedSite() { const f = path.join(ROOT, 'src/data/site.json'); if (!setting('site') && fs.existsSync(f)) try { setSetting('site', JSON.parse(fs.readFileSync(f, 'utf-8'))); } catch {} } // 헬퍼(q, q1, run) 정의 뒤에 시드

function seedIfEmpty() {
  if (q1('SELECT COUNT(*) c FROM agents').c > 0) return;
  const t = now();
  // 외부(창업미디어) 수집 담당자(legacy)는 계정을 만들지 않음 — 연락처·소속 검증 전이므로
  const agents = (fs.existsSync(path.join(ROOT, 'src/data/agents.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/agents.json'), 'utf-8')) : []).filter(a => !a.legacy);
  const defaultPw = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
  run('INSERT INTO agents(id,name,role,mobile,tel,kakao,email,photo,intro,active,isAdmin,pass,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 'admin', '총괄 관리자', '대표', process.env.ADMIN_MOBILE || '', '', '', '', '', '', 1, 1, hashPw(defaultPw), t, t);
  for (const a of agents) run('INSERT OR IGNORE INTO agents(id,name,role,mobile,tel,kakao,email,photo,intro,active,isAdmin,pass,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', a.id, a.name, a.role, a.mobile, a.tel, a.kakao, a.email, a.photo, a.intro, a.active ? 1 : 0, 0, hashPw(defaultPw), t, t);
  const listings = fs.existsSync(path.join(ROOT, 'src/data/listings.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/listings.json'), 'utf-8')) : [];
  const ins = db.prepare('INSERT OR IGNORE INTO listings(id,data,agentId,status,updatedAt,updatedBy) VALUES(?,?,?,?,?,?)');
  const ownIds = new Set(agents.map(a => a.id));
  for (const l of listings) {
    if (l.agentId && !ownIds.has(l.agentId)) { l.legacyAgent = { id: l.agentId, name: l.agentName, phone: l.agentPhone }; l.agentId = ''; l.agentName = ''; l.agentPhone = ''; }
    ins.run(l.id, JSON.stringify(l), l.agentId, l.status, l.updatedAt || t, 'import');
  }
  setSetting('sms', { provider: process.env.SMS_PROVIDER || 'none', sender: process.env.SMS_SENDER || '', aligoKey: process.env.ALIGO_KEY || '', aligoUser: process.env.ALIGO_USER || '', solapiKey: process.env.SOLAPI_KEY || '', solapiSecret: process.env.SOLAPI_SECRET || '' });
  console.log(`[seed] agents ${agents.length + 1}, listings ${listings.length}. admin 초기 비밀번호: ${defaultPw} — 로그인 후 내 정보에서 바로 변경하세요.`);
}

function seedBrands() {
  if (q1('SELECT COUNT(*) c FROM brands').c > 0) return;
  const f = path.join(ROOT, 'src/data/brands.json'); if (!fs.existsSync(f)) return;
  const ins = db.prepare('INSERT OR IGNORE INTO brands(slug,data,updatedAt) VALUES(?,?,?)');
  for (const b of JSON.parse(fs.readFileSync(f, 'utf-8'))) ins.run(b.slug, JSON.stringify(b), b.updatedAt || now());
}

// ---------- 데이터 내보내기 + 재빌드 ----------
let rebuildTimer = null, building = false, pending = false;
function exportData() {
  const listings = q('SELECT data FROM listings').map(r => JSON.parse(r.data));
  const agents = q('SELECT * FROM agents').map(a => ({ id: a.id, name: a.name, role: a.role, mobile: a.mobile, tel: a.tel, kakao: a.kakao, email: a.email, photo: a.photo, intro: a.intro, active: !!a.active, isAdmin: !!a.isAdmin, listingCount: 0 })).filter(a => !a.isAdmin || a.id !== 'admin');
  for (const a of agents) a.listingCount = listings.filter(l => l.agentId === a.id && l.status === 'active').length;
  fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src/data/listings.json'), JSON.stringify(listings, null, 1));
  fs.writeFileSync(path.join(ROOT, 'src/data/agents.json'), JSON.stringify(agents.sort((a, b) => b.listingCount - a.listingCount), null, 1));
  const site = setting('site'); if (site) fs.writeFileSync(path.join(ROOT, 'src/data/site.json'), JSON.stringify(site, null, 1));
  fs.writeFileSync(path.join(ROOT, 'src/data/brands.json'), JSON.stringify(q('SELECT data FROM brands').map(r => JSON.parse(r.data)).sort((a, b) => (b.sampleCount || 0) - (a.sampleCount || 0)), null, 1));
}
function scheduleRebuild(delay = 8000) { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuild, delay); }
function rebuild() {
  if (building) { pending = true; return; }
  building = true; exportData();
  const t = Date.now();
  const child = spawn(process.execPath, [path.join(ROOT, 'build.mjs')], { env: { ...process.env, API_URL: process.env.API_URL || '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
  child.on('close', code => { building = false; setSetting('lastBuild', { at: now(), ok: code === 0, ms: Date.now() - t, log: out.slice(-2000) }); console.log(`[build] ${code === 0 ? 'ok' : 'FAIL'} ${Date.now() - t}ms`); if (code === 0) setTimeout(pingIndexNow, 5000); if (pending) { pending = false; rebuild(); } });
}

// ---------- IndexNow: 사이트가 다시 만들어지면 네이버·빙에 바뀐 주소 알림 ----------
let lastPing = 0;
async function pingIndexNow() {
  try {
    const site = (process.env.SITE_URL || '').replace(/\/$/, ''); if (!/^https:\/\//.test(site) || /railway\.app|github\.io|localhost/.test(site) || process.env.NOINDEX === '1') return;
    if (Date.now() - lastPing < 30 * 60 * 1000) return; lastPing = Date.now();
    const key = (fs.readFileSync(path.join(ROOT, 'src/data.mjs'), 'utf-8').match(/indexNowKey:\s*'([0-9a-f]{32})'/) || [])[1]; if (!key) return;
    const sm = fs.readFileSync(path.join(DIST, 'sitemap-1.xml'), 'utf-8'); const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).slice(0, 10000);
    const host = new URL(site).host; const body = JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: urls });
    for (const ep of ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow']) { const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body }).catch(e => ({ status: String(e) })); console.log(`[indexnow] ${ep} ${r.status} (${urls.length} urls)`); }
  } catch (e) { console.log('[indexnow] skip', e.message); }
}

// ---------- SMS ----------
async function sendSms(to, text) {
  const cfg = setting('sms') || { provider: 'none' };
  const digits = String(to || '').replace(/[^\d]/g, '');
  if (!digits) return { ok: false, detail: 'no number' };
  try {
    if (cfg.provider === 'aligo') {
      const body = new URLSearchParams({ key: cfg.aligoKey, user_id: cfg.aligoUser, sender: cfg.sender, receiver: digits, msg: text, msg_type: text.length > 45 ? 'LMS' : 'SMS', title: '창업가이드 통화 알림' });
      const r = await fetch('https://apis.aligo.in/send/', { method: 'POST', body }); const j = await r.json();
      return { ok: String(j.result_code) === '1', detail: JSON.stringify(j).slice(0, 300) };
    }
    if (cfg.provider === 'solapi') {
      const date = now(); const salt = crypto.randomBytes(16).toString('hex');
      const sig = crypto.createHmac('sha256', cfg.solapiSecret).update(date + salt).digest('hex');
      const r = await fetch('https://api.solapi.com/messages/v4/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `HMAC-SHA256 apiKey=${cfg.solapiKey}, date=${date}, salt=${salt}, signature=${sig}` }, body: JSON.stringify({ message: { to: digits, from: cfg.sender.replace(/[^\d]/g, ''), text } }) });
      const j = await r.json(); return { ok: r.ok, detail: JSON.stringify(j).slice(0, 300) };
    }
    return { ok: false, detail: 'provider none (log only)' };
  } catch (e) { return { ok: false, detail: String(e).slice(0, 300) }; }
}

// ---------- HTTP 유틸 ----------
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((resolve, reject) => { let b = ''; req.on('data', c => { b += c; if (b.length > 25e6) { reject(new Error('too large')); req.destroy(); } }); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } }); req.on('error', reject); });
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]));
function user(req) { const t = cookies(req).cu_sess || (req.headers.authorization || '').replace('Bearer ', ''); if (!t) return null; const s = q1('SELECT * FROM sessions WHERE token=?', t); if (!s) return null; run('UPDATE sessions SET lastAt=? WHERE token=?', now(), t); const a = q1('SELECT * FROM agents WHERE id=? AND active=1', s.agentId); return a ? { ...a, isAdmin: !!a.isAdmin, pass: undefined } : null; }
const pub = a => a && ({ id: a.id, name: a.name, role: a.role, mobile: a.mobile, tel: a.tel, kakao: a.kakao, email: a.email, photo: a.photo, intro: a.intro, active: !!a.active, isAdmin: !!a.isAdmin, createdAt: a.createdAt, updatedAt: a.updatedAt });
const canEdit = (u, l) => u.isAdmin || l.agentId === u.id || (l.createdBy === u.id && !l.agentId);

// ---------- 라우팅 ----------
async function api(req, res, url) {
  const p = url.pathname.replace(/^\/api/, ''); const m = req.method; const me = user(req);
  const need = () => { if (!me) { json(res, 401, { error: '로그인이 필요합니다' }); return false; } return true; };
  const needAdmin = () => { if (!me || !me.isAdmin) { json(res, 403, { error: '관리자 권한이 필요합니다' }); return false; } return true; };
  const body = m === 'POST' || m === 'PUT' ? await readBody(req) : {};

  // --- 공개 ---
  if (p === '/call-events' && m === 'POST') {
    const l = body.listingId ? q1('SELECT data FROM listings WHERE id=?', String(body.listingId)) : null; const ld = l ? JSON.parse(l.data) : null;
    const agent = q1('SELECT * FROM agents WHERE id=?', body.agentId || (ld && ld.agentId) || '') || (ld ? q1('SELECT * FROM agents WHERE mobile=?', ld.agentPhone) : null);
    const id = uid('c'); const t = now();
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    const text = ld ? `[창업가이드] 고객이 매물 No.${ld.id} (${ld.title})을 보고 전화 연결을 시도했습니다. ${site}${BASE}/listing/${ld.id}/ · ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })}` : `[창업가이드] 고객이 담당자 페이지에서 전화 연결을 시도했습니다. ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })}`;
    const sms = agent ? await sendSms(agent.mobile, text) : { ok: false, detail: 'agent not found' };
    run('INSERT INTO calls(id,listingId,agentId,phone,title,url,ua,smsStatus,smsDetail,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)', id, body.listingId || '', agent ? agent.id : '', agent ? agent.mobile : '', ld ? ld.title : (body.title || ''), body.url || '', (body.ua || '').slice(0, 200), sms.ok ? 'sent' : 'failed', sms.detail, t);
    return json(res, 200, { ok: true, sms: sms.ok });
  }
  if (p === '/inquiries' && m === 'POST') {
    const l = body.listingId ? q1('SELECT data FROM listings WHERE id=?', String(body.listingId)) : null; const ld = l ? JSON.parse(l.data) : null;
    const agentId = body.agentId || (ld && ld.agentId) || '';
    const id = uid('i'); const t = now();
    run('INSERT INTO inquiries(id,type,name,phone,message,listingId,agentId,data,status,note,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', id, body.type || 'sms', String(body.name || '').slice(0, 40), String(body.phone || '').slice(0, 20), String(body.message || '').slice(0, 1000), body.listingId || '', agentId, JSON.stringify(body).slice(0, 4000), 'new', '', t, t);
    const agent = agentId ? q1('SELECT * FROM agents WHERE id=?', agentId) : null;
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    if (agent) sendSms(agent.mobile, `[창업가이드] 새 ${body.type === 'buy' ? '창업 의뢰' : body.type === 'sell' ? '양도 의뢰' : '문자 상담'}: ${body.name} ${body.phone}${ld ? ` / No.${ld.id} ${ld.title}` : ''} / ${String(body.message || '').slice(0, 60)} → ${site}${BASE}/admin/`).then(r => run('UPDATE inquiries SET note=? WHERE id=?', r.ok ? '담당자 문자 발송됨' : '담당자 문자 미발송: ' + r.detail, id));
    const admin = q1('SELECT * FROM agents WHERE isAdmin=1 AND id!=? LIMIT 1', agentId); if (admin && setting('notifyAdmin')) sendSms(admin.mobile, `[창업가이드] 새 문의 (${body.type}) ${body.name} ${body.phone}`);
    return json(res, 200, { ok: true, id });
  }
  if (p === '/auth/login' && m === 'POST') {
    const a = q1('SELECT * FROM agents WHERE id=? AND active=1', String(body.id || '').trim());
    if (!a || !checkPw(String(body.password || ''), a.pass)) { audit(body.id, 'login_fail', ''); return json(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다' }); }
    const token = uid('s'); run('INSERT INTO sessions(token,agentId,createdAt,lastAt) VALUES(?,?,?,?)', token, a.id, now(), now()); audit(a.id, 'login', '');
    res.setHeader('Set-Cookie', `cu_sess=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${process.env.SITE_URL?.startsWith('https') ? '; Secure' : ''}`);
    return json(res, 200, { user: pub(a), token });
  }
  if (p === '/auth/logout' && m === 'POST') { const t = cookies(req).cu_sess; if (t) run('DELETE FROM sessions WHERE token=?', t); res.setHeader('Set-Cookie', 'cu_sess=; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
  if (p === '/me') { if (!need()) return; const unread = q1('SELECT COUNT(*) c FROM messages WHERE toId=? AND readAt IS NULL', me.id).c + q1('SELECT COUNT(*) c FROM notices n WHERE NOT EXISTS(SELECT 1 FROM notice_reads r WHERE r.noticeId=n.id AND r.agentId=?)', me.id).c; return json(res, 200, { user: pub(me), unread, demo: false }); }

  // --- 매물 ---
  if (p === '/listings' && m === 'GET') { if (!need()) return; const rows = q('SELECT data, updatedBy FROM listings ORDER BY updatedAt DESC').map(r => ({ ...JSON.parse(r.data), updatedBy: r.updatedBy })); return json(res, 200, { items: rows }); }
  if (p === '/listings' && m === 'POST') {
    if (!need()) return; const l = body.listing || body; const t = now();
    l.id = l.id && !q1('SELECT 1 FROM listings WHERE id=?', String(l.id)) ? String(l.id) : String(Math.max(800000, ...q('SELECT id FROM listings').map(r => Number(r.id) || 0)) + 1);
    if (!me.isAdmin || !l.agentId) l.agentId = me.id;
    const ag = q1('SELECT * FROM agents WHERE id=?', l.agentId); if (ag) { l.agentName = ag.name; l.agentPhone = ag.mobile; }
    l.createdAt = t; l.updatedAt = t; l.status = l.status || 'active'; l.createdBy = me.id; l.source = 'own'; if (!me.isAdmin) delete l.verified;
    // 중복 경고: 같은 담당자·같은 지역·브랜드·권리금
    const dup = q('SELECT data FROM listings WHERE agentId=? AND status!=?', l.agentId, 'archived').map(r => JSON.parse(r.data)).find(x => x.sido === l.sido && x.gugun === l.gugun && (x.brand || x.kind2) === (l.brand || l.kind2) && x.premium === l.premium && x.sales === l.sales);
    run('INSERT INTO listings(id,data,agentId,status,updatedAt,updatedBy) VALUES(?,?,?,?,?,?)', l.id, JSON.stringify(l), l.agentId, l.status, t, me.id); audit(me.id, 'listing_create', l.id, l.title); scheduleRebuild();
    return json(res, 200, { item: l, duplicateOf: dup ? dup.id : null });
  }
  // --- 일괄 변경 (관리자): 담당자·상태·검증 ---
  if (p === '/listings/bulk' && m === 'POST') {
    if (!needAdmin()) return; const ids = (body.ids || []).map(String).slice(0, 2000); const patch = body.patch || {}; let n = 0;
    const ag = patch.agentId ? q1('SELECT * FROM agents WHERE id=?', patch.agentId) : null; if (patch.agentId && !ag) return json(res, 400, { error: '없는 담당자' });
    for (const id of ids) {
      const row = q1('SELECT data FROM listings WHERE id=?', id); if (!row) continue; const l = JSON.parse(row.data);
      if (ag) { l.agentId = ag.id; l.agentName = ag.name; l.agentPhone = ag.mobile; }
      if (patch.status && ['active', 'held', 'done', 'archived'].includes(patch.status)) l.status = patch.status;
      if (patch.verified != null) l.verified = !!patch.verified;
      l.updatedAt = now(); run('UPDATE listings SET data=?,agentId=?,status=?,updatedAt=?,updatedBy=? WHERE id=?', JSON.stringify(l), l.agentId, l.status, l.updatedAt, me.id, id); n++;
    }
    if (ag) run('INSERT INTO messages(id,fromId,toId,listingId,body,readAt,createdAt) VALUES(?,?,?,?,?,?,?)', uid('m'), me.id, ag.id, '', `매물 ${n}건이 ${ag.name}님 담당으로 배정되었습니다.`, null, now());
    audit(me.id, 'listing_bulk', ids.length, patch); scheduleRebuild(); return json(res, 200, { ok: true, n });
  }
  let mm;
  if ((mm = p.match(/^\/listings\/([^/]+)$/))) {
    if (!need()) return; const row = q1('SELECT * FROM listings WHERE id=?', mm[1]); if (!row) return json(res, 404, { error: '없는 매물' }); const cur = JSON.parse(row.data);
    if (m === 'GET') { const lock = q1('SELECT * FROM locks WHERE listingId=? AND agentId!=? AND at>?', mm[1], me.id, new Date(Date.now() - 120000).toISOString()); return json(res, 200, { item: cur, lock: lock ? { agentId: lock.agentId, name: (q1('SELECT name FROM agents WHERE id=?', lock.agentId) || {}).name, at: lock.at } : null }); }
    if (!canEdit(me, cur)) return json(res, 403, { error: '본인 담당 매물만 수정할 수 있습니다. 담당자 변경은 관리자에게 요청하세요.' });
    if (m === 'PUT') {
      const l = body.listing || body;
      if (body.baseUpdatedAt && body.baseUpdatedAt !== cur.updatedAt) return json(res, 409, { error: `다른 사용자(${row.updatedBy})가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.`, current: cur });
      if (!me.isAdmin) l.agentId = cur.agentId; const ag = q1('SELECT * FROM agents WHERE id=?', l.agentId); if (ag) { l.agentName = ag.name; l.agentPhone = ag.mobile; }
      l.id = cur.id; l.createdAt = cur.createdAt; l.createdBy = cur.createdBy; l.source = cur.source; l.legacyAgent = cur.legacyAgent; if (!me.isAdmin) l.verified = cur.verified; l.updatedAt = now();
      run('UPDATE listings SET data=?,agentId=?,status=?,updatedAt=?,updatedBy=? WHERE id=?', JSON.stringify(l), l.agentId, l.status, l.updatedAt, me.id, l.id); run('DELETE FROM locks WHERE listingId=?', l.id); audit(me.id, 'listing_update', l.id, l.title); scheduleRebuild();
      return json(res, 200, { item: l });
    }
    if (m === 'DELETE') { cur.status = 'archived'; cur.updatedAt = now(); run('UPDATE listings SET data=?,status=?,updatedAt=?,updatedBy=? WHERE id=?', JSON.stringify(cur), 'archived', cur.updatedAt, me.id, cur.id); audit(me.id, 'listing_archive', cur.id); scheduleRebuild(); return json(res, 200, { ok: true }); }
  }
  if ((mm = p.match(/^\/listings\/([^/]+)\/lock$/)) && m === 'POST') { if (!need()) return; run('INSERT INTO locks(listingId,agentId,at) VALUES(?,?,?) ON CONFLICT(listingId) DO UPDATE SET agentId=excluded.agentId, at=excluded.at', mm[1], me.id, now()); return json(res, 200, { ok: true }); }

  // --- 사진 ---
  if (p === '/photos' && m === 'GET') { if (!need()) return; return json(res, 200, { items: q('SELECT * FROM photos ORDER BY createdAt DESC').map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })) }); }
  if (p === '/photos' && m === 'POST') {
    if (!need()) return; const { name, data, tags = [], w, h } = body; const mt = String(data || '').match(/^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/); if (!mt) return json(res, 400, { error: '이미지 데이터가 올바르지 않습니다' });
    const buf = Buffer.from(mt[3], 'base64'); if (buf.length > 8e6) return json(res, 400, { error: '8MB 이하로 올려주세요' });
    const id = uid('p'); const ext = mt[2] === 'jpeg' ? 'jpg' : mt[2]; const file = `photos/u_${id}.${ext}`;
    fs.mkdirSync(path.join(PHOTO_DIR, 'thumb'), { recursive: true }); fs.writeFileSync(path.join(PHOTO_DIR, `u_${id}.${ext}`), buf);
    // 썸네일: 클라이언트가 보낸 thumb(data URL) 우선, 없으면 원본 복사
    const th = String(body.thumb || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); fs.writeFileSync(path.join(PHOTO_DIR, 'thumb', `u_${id}.${ext}`), th ? Buffer.from(th[2], 'base64') : buf);
    run('INSERT INTO photos(id,file,thumb,name,agentId,tags,w,h,size,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)', id, file, file.replace('photos/', 'photos/thumb/'), String(name || '').slice(0, 80), me.id, JSON.stringify(tags), w || 0, h || 0, buf.length, now()); audit(me.id, 'photo_upload', id, name);
    return json(res, 200, { item: { id, file, thumb: file.replace('photos/', 'photos/thumb/'), name, agentId: me.id, tags } });
  }
  if ((mm = p.match(/^\/photos\/([^/]+)$/)) && m === 'DELETE') { if (!need()) return; const ph = q1('SELECT * FROM photos WHERE id=?', mm[1]); if (!ph) return json(res, 404, {}); if (!me.isAdmin && ph.agentId !== me.id) return json(res, 403, { error: '본인이 올린 사진만 삭제할 수 있습니다' }); const used = q('SELECT id FROM listings WHERE data LIKE ? AND status!=?', `%${ph.file}%`, 'archived'); if (used.length) return json(res, 400, { error: `매물 ${used.map(u => u.id).join(', ')}에서 사용 중입니다` }); run('DELETE FROM photos WHERE id=?', mm[1]); for (const f of [ph.file, ph.thumb]) { try { fs.unlinkSync(path.join(ROOT, 'public', f)); } catch {} } return json(res, 200, { ok: true }); }

  // --- 담당자 ---
  if (p === '/agents' && m === 'GET') { if (!need()) return; return json(res, 200, { items: q('SELECT * FROM agents ORDER BY isAdmin DESC, name').map(pub) }); }
  if (p === '/agents' && m === 'POST') { if (!needAdmin()) return; const a = body; if (!a.id || !/^[a-z0-9_]{3,20}$/i.test(a.id)) return json(res, 400, { error: '아이디는 영문·숫자 3~20자' }); if (q1('SELECT 1 FROM agents WHERE id=?', a.id)) return json(res, 400, { error: '이미 있는 아이디' }); const t = now(); run('INSERT INTO agents(id,name,role,mobile,tel,kakao,email,photo,intro,active,isAdmin,pass,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', a.id, a.name, a.role || '창업전문가', a.mobile, a.tel || '', a.kakao || '', a.email || '', a.photo || '', a.intro || '', 1, a.isAdmin ? 1 : 0, hashPw(a.password || 'changeme1234'), t, t); audit(me.id, 'agent_create', a.id); scheduleRebuild(); return json(res, 200, { item: pub(q1('SELECT * FROM agents WHERE id=?', a.id)) }); }
  if ((mm = p.match(/^\/agents\/([^/]+)$/)) && m === 'PUT') {
    if (!need()) return; const id = mm[1]; if (!me.isAdmin && me.id !== id) return json(res, 403, { error: '본인 정보만 수정할 수 있습니다' }); const a = body; const cur = q1('SELECT * FROM agents WHERE id=?', id); if (!cur) return json(res, 404, {});
    if (a.password) { if (!me.isAdmin && !checkPw(String(a.currentPassword || ''), cur.pass)) return json(res, 400, { error: '현재 비밀번호가 올바르지 않습니다' }); run('UPDATE agents SET pass=? WHERE id=?', hashPw(a.password), id); audit(me.id, 'password_change', id); }
    run('UPDATE agents SET name=?,role=?,mobile=?,tel=?,kakao=?,email=?,photo=?,intro=?,active=?,isAdmin=?,updatedAt=? WHERE id=?', a.name ?? cur.name, a.role ?? cur.role, a.mobile ?? cur.mobile, a.tel ?? cur.tel, a.kakao ?? cur.kakao, a.email ?? cur.email, a.photo ?? cur.photo, a.intro ?? cur.intro, me.isAdmin && a.active != null ? (a.active ? 1 : 0) : cur.active, me.isAdmin && a.isAdmin != null ? (a.isAdmin ? 1 : 0) : cur.isAdmin, now(), id);
    // 담당자 이름·번호 변경 → 매물에 반영
    const ag = q1('SELECT * FROM agents WHERE id=?', id); for (const r of q('SELECT id,data FROM listings WHERE agentId=?', id)) { const l = JSON.parse(r.data); l.agentName = ag.name; l.agentPhone = ag.mobile; run('UPDATE listings SET data=? WHERE id=?', JSON.stringify(l), r.id); }
    audit(me.id, 'agent_update', id); scheduleRebuild(); return json(res, 200, { item: pub(ag) });
  }
  if ((mm = p.match(/^\/listings\/([^/]+)\/reassign$/)) && m === 'POST') { if (!needAdmin()) return; const row = q1('SELECT * FROM listings WHERE id=?', mm[1]); if (!row) return json(res, 404, {}); const l = JSON.parse(row.data); const ag = q1('SELECT * FROM agents WHERE id=?', body.agentId); if (!ag) return json(res, 400, { error: '없는 담당자' }); const prev = l.agentId; l.agentId = ag.id; l.agentName = ag.name; l.agentPhone = ag.mobile; l.updatedAt = now(); run('UPDATE listings SET data=?,agentId=?,updatedAt=?,updatedBy=? WHERE id=?', JSON.stringify(l), ag.id, l.updatedAt, me.id, l.id); run('INSERT INTO messages(id,fromId,toId,listingId,body,readAt,createdAt) VALUES(?,?,?,?,?,?,?)', uid('m'), me.id, ag.id, l.id, `매물 No.${l.id} (${l.title}) 담당이 ${prev}에서 ${ag.name}님으로 변경되었습니다.`, null, now()); if (prev && prev !== ag.id) run('INSERT INTO messages(id,fromId,toId,listingId,body,readAt,createdAt) VALUES(?,?,?,?,?,?,?)', uid('m'), me.id, prev, l.id, `매물 No.${l.id} (${l.title}) 담당이 ${ag.name}님으로 이관되었습니다.`, null, now()); audit(me.id, 'listing_reassign', l.id, `${prev}→${ag.id}`); scheduleRebuild(); return json(res, 200, { item: l }); }

  if ((mm = p.match(/^\/agents\/([^/]+)\/transfer$/)) && m === 'POST') {
    if (!needAdmin()) return; const from = mm[1]; const to = q1('SELECT * FROM agents WHERE id=?', String(body.toId || '')); if (!to) return json(res, 400, { error: '이관받을 직원을 선택하세요' });
    const rows = q("SELECT data FROM listings WHERE agentId=? AND status!='archived'", from); for (const r of rows) { const l = JSON.parse(r.data); l.agentId = to.id; l.agentName = to.name; l.agentPhone = to.mobile; l.updatedAt = now(); run('UPDATE listings SET data=?,agentId=?,updatedAt=?,updatedBy=? WHERE id=?', JSON.stringify(l), to.id, l.updatedAt, me.id, l.id); }
    run("UPDATE inquiries SET agentId=? WHERE agentId=? AND status IN ('new','contacted')", to.id, from);
    run('INSERT INTO messages(id,fromId,toId,listingId,body,readAt,createdAt) VALUES(?,?,?,?,?,?,?)', uid('m'), me.id, to.id, '', `${from} 직원의 매물 ${rows.length}건과 진행 중 문의가 ${to.name}님에게 이관되었습니다.`, null, now());
    audit(me.id, 'agent_transfer', from, `→${to.id} ${rows.length}건`); scheduleRebuild(); return json(res, 200, { ok: true, n: rows.length });
  }

  // --- 브랜드 관리 ---
  if (p === '/brands' && m === 'GET') { if (!need()) return; return json(res, 200, { items: q('SELECT data FROM brands').map(r => JSON.parse(r.data)) }); }
  if ((p === '/brands' && m === 'POST') || ((mm = p.match(/^\/brands\/([^/]+)$/)) && m === 'PUT')) {
    if (!needAdmin()) return; const b = body.brand || body; const slug = m === 'PUT' ? decodeURIComponent(mm[1]) : String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return json(res, 400, { error: '영문 주소(slug)를 입력하세요' }); if (m === 'POST' && q1('SELECT 1 FROM brands WHERE slug=?', slug)) return json(res, 400, { error: '이미 있는 브랜드 주소' });
    const cur = m === 'PUT' ? JSON.parse((q1('SELECT data FROM brands WHERE slug=?', slug) || { data: '{}' }).data) : {};
    const it = { ...cur, ...b, slug, updatedAt: now(), updatedBy: me.id }; if (!it.name) return json(res, 400, { error: '브랜드명을 입력하세요' }); run('INSERT INTO brands(slug,data,updatedAt) VALUES(?,?,?) ON CONFLICT(slug) DO UPDATE SET data=excluded.data, updatedAt=excluded.updatedAt', slug, JSON.stringify(it), it.updatedAt);
    audit(me.id, m === 'POST' ? 'brand_create' : 'brand_update', slug, b.name); scheduleRebuild(); return json(res, 200, { item: it });
  }
  if ((mm = p.match(/^\/brands\/([^/]+)$/)) && m === 'DELETE') { if (!needAdmin()) return; run('DELETE FROM brands WHERE slug=?', decodeURIComponent(mm[1])); audit(me.id, 'brand_delete', mm[1]); scheduleRebuild(); return json(res, 200, { ok: true }); }

  // --- 백업·복원 (관리자) ---
  if (p === '/backup' && m === 'GET') {
    if (!needAdmin()) return; const tables = ['agents', 'listings', 'brands', 'photos', 'inquiries', 'calls', 'messages', 'notices', 'notice_reads', 'settings', 'audit'];
    const dump = { app: 'changupguide', version: 1, at: now(), tables: Object.fromEntries(tables.map(t => [t, q(`SELECT * FROM ${t}`)])) };
    audit(me.id, 'backup', ''); res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="changupguide-backup-${now().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(dump));
  }
  if (p === '/restore' && m === 'POST') {
    if (!needAdmin()) return; const d = body.backup || body; const mode = body.mode === 'replace' ? 'replace' : 'merge';
    // 매물 JSON 배열만 올린 경우: 매물 불러오기(같은 번호는 덮어씀)
    const tables = Array.isArray(d) ? { listings: d.map(l => ({ id: String(l.id), data: JSON.stringify({ source: 'import', ...l, id: String(l.id) }), agentId: l.agentId || '', status: l.status || 'active', updatedAt: l.updatedAt || now(), updatedBy: me.id })) } : d.tables;
    if (!tables || typeof tables !== 'object') return json(res, 400, { error: '백업 파일 형식이 아닙니다' });
    const allow = { agents: 'id', listings: 'id', brands: 'slug', photos: 'id', inquiries: 'id', calls: 'id', messages: 'id', notices: 'id', notice_reads: null, settings: 'key', audit: null };
    const cnt = {}; db.exec('BEGIN');
    try {
      for (const [t, rows] of Object.entries(tables)) {
        if (!(t in allow) || !Array.isArray(rows)) continue; if (mode === 'replace' && t !== 'agents') db.exec(`DELETE FROM ${t}`);
        const cols = q(`PRAGMA table_info(${t})`).map(c => c.name).filter(c => !(t === 'audit' && c === 'id')); let n = 0;
        for (const r of rows) { const use = cols.filter(c => c in r); if (!use.length) continue; run(`INSERT OR REPLACE INTO ${t}(${use.join(',')}) VALUES(${use.map(() => '?').join(',')})`, ...use.map(c => r[c] == null ? null : typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])); n++; }
        cnt[t] = n;
      }
      if (!q1('SELECT 1 FROM agents WHERE id=? AND isAdmin=1 AND active=1', me.id)) throw new Error('복원 후 현재 관리자 계정이 사라지거나 비활성화됩니다. 백업 파일을 확인하세요.');
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); return json(res, 400, { error: String(e.message || e) }); }
    audit(me.id, 'restore', mode, cnt); scheduleRebuild(100); return json(res, 200, { ok: true, counts: cnt });
  }

  // --- 문의·통화 ---
  if (p === '/inquiries' && m === 'GET') { if (!need()) return; const rows = me.isAdmin ? q('SELECT * FROM inquiries ORDER BY createdAt DESC LIMIT 500') : q('SELECT * FROM inquiries WHERE agentId=? OR agentId=\'\' ORDER BY createdAt DESC LIMIT 300', me.id); return json(res, 200, { items: rows.map(r => ({ ...r, data: JSON.parse(r.data || '{}') })) }); }
  if ((mm = p.match(/^\/inquiries\/([^/]+)$/)) && m === 'PUT') { if (!need()) return; const cur = q1('SELECT * FROM inquiries WHERE id=?', mm[1]); if (!cur) return json(res, 404, {}); if (!me.isAdmin && cur.agentId && cur.agentId !== me.id) return json(res, 403, { error: '담당 문의만 처리할 수 있습니다' }); run('UPDATE inquiries SET status=?,note=?,agentId=?,updatedAt=? WHERE id=?', body.status || cur.status, body.note ?? cur.note, me.isAdmin && body.agentId != null ? body.agentId : (cur.agentId || me.id), now(), mm[1]); audit(me.id, 'inquiry_update', mm[1], body.status); return json(res, 200, { ok: true }); }
  if (p === '/calls' && m === 'GET') { if (!need()) return; return json(res, 200, { items: me.isAdmin ? q('SELECT * FROM calls ORDER BY createdAt DESC LIMIT 500') : q('SELECT * FROM calls WHERE agentId=? ORDER BY createdAt DESC LIMIT 300', me.id) }); }

  // --- 메시지·공지 (양방향 소통) ---
  if (p === '/messages' && m === 'GET') { if (!need()) return; const rows = q('SELECT * FROM messages WHERE fromId=? OR toId=? OR (toId=\'*\') ORDER BY createdAt DESC LIMIT 500', me.id, me.id); run('UPDATE messages SET readAt=? WHERE toId=? AND readAt IS NULL', now(), me.id); return json(res, 200, { items: rows }); }
  if (p === '/messages' && m === 'POST') { if (!need()) return; const to = String(body.toId || ''); if (!to) return json(res, 400, { error: '받는 사람' }); if (to === '*' && !me.isAdmin) return json(res, 403, { error: '전체 메시지는 관리자만' }); const id = uid('m'); run('INSERT INTO messages(id,fromId,toId,listingId,body,readAt,createdAt) VALUES(?,?,?,?,?,?,?)', id, me.id, to, body.listingId || '', String(body.body || '').slice(0, 2000), null, now()); const ag = to !== '*' ? q1('SELECT * FROM agents WHERE id=?', to) : null; if (ag && body.sms) sendSms(ag.mobile, `[창업가이드 관리자] ${me.name}: ${String(body.body).slice(0, 70)}`); return json(res, 200, { ok: true, id }); }
  if (p === '/notices' && m === 'GET') { if (!need()) return; const rows = q('SELECT n.*, (SELECT COUNT(*) FROM notice_reads r WHERE r.noticeId=n.id) reads, EXISTS(SELECT 1 FROM notice_reads r WHERE r.noticeId=n.id AND r.agentId=?) readByMe FROM notices n ORDER BY createdAt DESC LIMIT 100', me.id); return json(res, 200, { items: rows }); }
  if (p === '/notices' && m === 'POST') { if (!needAdmin()) return; const id = uid('n'); run('INSERT INTO notices(id,title,body,authorId,createdAt) VALUES(?,?,?,?,?)', id, String(body.title || '').slice(0, 100), String(body.body || '').slice(0, 4000), me.id, now()); if (body.sms) for (const a of q('SELECT * FROM agents WHERE active=1 AND isAdmin=0')) sendSms(a.mobile, `[창업가이드 공지] ${body.title}`); return json(res, 200, { ok: true, id }); }
  if ((mm = p.match(/^\/notices\/([^/]+)\/read$/)) && m === 'POST') { if (!need()) return; run('INSERT OR IGNORE INTO notice_reads(noticeId,agentId,readAt) VALUES(?,?,?)', mm[1], me.id, now()); return json(res, 200, { ok: true }); }

  // --- 글 발행 ---
  if (p === '/posts' && m === 'GET') { if (!need()) return; const dir = path.join(ROOT, 'content/posts'); const items = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => { const p2 = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); return { slug: p2.slug, title: p2.title, date: p2.date, status: p2.status, listingId: p2.listingId, category: p2.category }; }).sort((a, b) => b.date.localeCompare(a.date)) : []; return json(res, 200, { items }); }
  if (p === '/posts/generate' && m === 'POST') { if (!needAdmin()) return; exportData(); const child = spawn(process.execPath, [path.join(ROOT, 'tools/make_posts.mjs'), '--count', String(body.count || 3), ...(body.force ? ['--force'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] }); let out = ''; child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d); child.on('close', code => { scheduleRebuild(1000); json(res, 200, { ok: code === 0, log: out }); }); return; }
  if ((mm = p.match(/^\/posts\/([^/]+)$/)) && m === 'PUT') { if (!needAdmin()) return; const f = path.join(ROOT, 'content/posts', mm[1] + '.json'); if (!fs.existsSync(f)) return json(res, 404, {}); const p2 = JSON.parse(fs.readFileSync(f, 'utf-8')); Object.assign(p2, { title: body.title ?? p2.title, status: body.status ?? p2.status, body: body.body ?? p2.body, desc: body.desc ?? p2.desc, updated: now() }); fs.writeFileSync(f, JSON.stringify(p2, null, 1)); scheduleRebuild(); return json(res, 200, { ok: true }); }

  // --- 설정·운영 ---
  if (p === '/settings' && m === 'GET') { if (!needAdmin()) return; const s = setting('sms') || {}; return json(res, 200, { sms: { ...s, aligoKey: s.aligoKey ? '••••' + String(s.aligoKey).slice(-4) : '', solapiSecret: s.solapiSecret ? '••••' : '' }, notifyAdmin: !!setting('notifyAdmin'), site: setting('site') || {}, lastBuild: setting('lastBuild'), siteUrl: process.env.SITE_URL || '', base: BASE }); }
  if (p === '/settings' && m === 'PUT') { if (!needAdmin()) return; if (body.sms) { const cur = setting('sms') || {}; const s = { ...cur, ...body.sms }; if (String(body.sms.aligoKey || '').startsWith('••••')) s.aligoKey = cur.aligoKey; if (String(body.sms.solapiSecret || '').startsWith('••••')) s.solapiSecret = cur.solapiSecret; setSetting('sms', s); } if (body.notifyAdmin != null) setSetting('notifyAdmin', !!body.notifyAdmin); if (body.site) { const cur = setting('site') || {}; const v = {}; for (const k of ['phone', 'email', 'hours', 'gaId', 'gtmId', 'naverWa', 'clarityId', 'googleVerification', 'naverVerification', 'bingVerification']) v[k] = String(body.site[k] ?? cur[k] ?? '').trim().replace(/[<>"'`]/g, '').slice(0, 120); setSetting('site', v); scheduleRebuild(); } audit(me.id, 'settings', ''); return json(res, 200, { ok: true }); }
  if (p === '/settings/test-sms' && m === 'POST') { if (!needAdmin()) return; const r = await sendSms(body.to || me.mobile, '[창업가이드] 문자 발송 테스트입니다.'); return json(res, 200, r); }
  if (p === '/rebuild' && m === 'POST') { if (!needAdmin()) return; scheduleRebuild(100); return json(res, 200, { ok: true }); }
  if (p === '/audit' && m === 'GET') { if (!needAdmin()) return; return json(res, 200, { items: q('SELECT * FROM audit ORDER BY id DESC LIMIT 300') }); }
  if (p === '/stats' && m === 'GET') { if (!need()) return; const mine = me.isAdmin ? '' : ` AND agentId='${me.id.replace(/'/g, '')}'`; return json(res, 200, { listings: q1(`SELECT COUNT(*) c FROM listings WHERE status='active'${mine}`).c, held: q1(`SELECT COUNT(*) c FROM listings WHERE status='held'${mine}`).c, newInquiries: q1(`SELECT COUNT(*) c FROM inquiries WHERE status='new'${me.isAdmin ? '' : ` AND (agentId='${me.id.replace(/'/g, '')}' OR agentId='')`}`).c, callsToday: q1(`SELECT COUNT(*) c FROM calls WHERE createdAt>=?${mine}`, new Date(Date.now() - 86400000).toISOString()).c, lastBuild: setting('lastBuild') }); }
  json(res, 404, { error: 'not found' });
}

// ---------- 정적 ----------
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  if (p.includes('..')) { res.writeHead(400); return res.end(); }
  let file = path.join(DIST, p);
  if (p.endsWith('/')) file = path.join(file, 'index.html');
  else if (!path.extname(file) && fs.existsSync(path.join(file, 'index.html'))) { res.writeHead(301, { Location: BASE + p + '/' + url.search }); return res.end(); }
  if ((!fs.existsSync(file) || fs.statSync(file).isDirectory()) && p.startsWith('/photos/')) { const up = path.join(PHOTO_DIR, p.slice('/photos/'.length)); if (up.startsWith(PHOTO_DIR) && fs.existsSync(up) && fs.statSync(up).isFile()) file = up; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(DIST, '404.html'); res.statusCode = 404; }
  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', ext === '.html' || ext === '.json' || ext === '.xml' ? 'no-cache' : 'public, max-age=86400');
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const apiPath = BASE && url.pathname.startsWith(BASE + '/api') ? url.pathname.slice(BASE.length) : url.pathname;
  if (apiPath.startsWith('/api/')) {
    if (STATIC_ONLY) return json(res, 503, { error: 'static preview — API 없음' });
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*'); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try { await api(req, res, new URL(apiPath + url.search, 'http://x')); } catch (e) { console.error(e); json(res, 500, { error: String(e.message || e) }); }
    return;
  }
  serveStatic(req, res, url);
}).listen(PORT, () => console.log(`창업가이드 ${STATIC_ONLY ? '정적 미리보기' : 'API+정적'} 서버: http://localhost:${PORT}${BASE}/  (dist: ${fs.existsSync(DIST) ? 'ok' : '없음 — node build.mjs 먼저'})`));
