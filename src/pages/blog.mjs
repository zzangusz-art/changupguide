// 창업 인사이트(블로그): content/posts/*.json → 목록·상세 페이지
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from '../data.mjs';
import { layout, esc, u, abs, ICONS, ILLO, listingCard, breadcrumb, faqBlock, ctaBand, img, imgPath, badge } from '../lib/html.mjs';
import { fmtDate } from '../lib/text.mjs';

export function loadPosts() {
  const dir = path.resolve('content/posts'); if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
    .filter(p => p.status !== 'draft').sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// 아주 작은 마크다운 → HTML (##, ###, 표, 목록, 인용, 굵게)
export function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((.+?)\)/g, (m, t, h) => `<a href="${h.startsWith('/') ? u(h) : h}">${t}</a>`);
  while (i < lines.length) {
    const l = lines[i];
    if (/^### /.test(l)) { out.push(`<h3>${inline(l.slice(4))}</h3>`); i++; continue; }
    if (/^## /.test(l)) { const t = l.slice(3); out.push(`<h2 id="${esc(t.replace(/[^\p{L}\p{N}]+/gu, '-'))}">${inline(t)}</h2>`); i++; continue; }
    if (/^> /.test(l)) { out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`); i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; } const cells = r => r.split('|').slice(1, -1).map(c => c.trim()); const head = cells(rows[0]); const body = rows.slice(2).map(cells); out.push(`<table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue; }
    if (/^- /.test(l)) { const items = []; while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; } out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); continue; }
    if (/^\d+\. /.test(l)) { const items = []; while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; } out.push(`<ol style="list-style:decimal;padding-left:20px">${items.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`); continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(## |### |> |\||- |\d+\. )/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function blogPages(ctx) {
  const { posts, listings, agents } = ctx; const out = [];
  const cats = [...new Set(posts.map(p => p.category).filter(Boolean))];
  const list = (items, path, title, desc, h1, crumbName) => ({ path, priority: 0.7, changefreq: 'daily', html: layout({ title, desc, path, active: 'blog',
    ld: [{ '@context': 'https://schema.org', '@type': 'Blog', name: `${SITE.name} 창업 인사이트`, url: abs('/blog/'), publisher: { '@id': abs('/#org') }, blogPost: items.slice(0, 20).map(p => ({ '@type': 'BlogPosting', headline: p.title, url: abs(`/blog/${p.slug}/`), datePublished: p.date })) }],
    body: `<div class="wrap">${breadcrumb([{ name: '홈', href: '/' }, { name: '창업 인사이트', href: '/blog/' }, ...(crumbName ? [{ name: crumbName, href: path }] : [])])}<section class="sec sec--tight" style="padding-top:6px"><p class="eyebrow">INSIGHTS · 매일 3편 발행</p><h1 class="h1">${h1}</h1><p style="font-weight:700;margin:10px 0 18px">지역·브랜드·예산을 기준으로 실제 매물을 분석합니다. 광고 문구가 아니라 숫자로 읽는 창업 정보입니다.</p>
      <div class="chips" style="margin-bottom:22px"><a class="chip ${!crumbName ? 'is-on' : ''}" href="${u('/blog/')}">전체 ${posts.length}</a>${cats.map(c => `<a class="chip ${crumbName === c ? 'is-on' : ''}" href="${u(`/blog/category/${encodeURIComponent(c)}/`)}">${esc(c)} ${posts.filter(p => p.category === c).length}</a>`).join('')}</div>
      ${items.length ? `<div class="post-grid">${items.map(p => `<a class="post-card reveal" href="${u(`/blog/${p.slug}/`)}"><div class="post-card__cover">${p.cover ? img(p.cover, p.title, { w: 600, h: 338 }) : ILLO.shop}</div><div class="post-card__body">${p.category ? badge(p.category, 'yellow') : ''}<h3>${esc(p.title)}</h3><p class="muted" style="font-size:.9rem">${esc(p.desc)}</p><div class="post-card__meta"><span>${esc(fmtDate(p.date))}</span><span>·</span><span>${esc(p.author || '창업가이드 편집팀')}</span></div></div></a>`).join('')}</div>` : '<p class="results__empty">첫 글을 준비 중입니다.</p>'}
    </section></div>${ctaBand({ title: '글에서 본 매물, 담당자에게 바로 물어보세요' })}` }) });
  out.push(list(posts, '/blog/', `창업 인사이트 | 지역·브랜드·예산으로 읽는 창업 매물 분석 — 창업가이드`, '매일 3편. 인천 메가커피, 강남 카페, 송파 치킨집처럼 지역·브랜드·예산 기준으로 실제 양도양수 매물의 월매출·월수익·권리금을 분석합니다.', '창업 <span class="hl">인사이트</span>'));
  for (const c of cats) out.push(list(posts.filter(p => p.category === c), `/blog/category/${encodeURIComponent(c)}/`, `${c} | 창업 인사이트 — 창업가이드`, `${c} 관련 창업 분석 글 모음.`, `${esc(c)}`, c));

  for (const [i, p] of posts.entries()) {
    const l = p.listingId ? listings.find(x => x.id === String(p.listingId)) : null;
    const related = p.relatedIds ? p.relatedIds.map(id => listings.find(x => x.id === String(id))).filter(Boolean) : (l ? (ctx.byBrand[l.brandSlug] || []).filter(x => x.id !== l.id).slice(0, 4) : posts.slice(0, 0));
    const agent = l ? agents.find(a => a.id === l.agentId) : null;
    const prev = posts[i + 1], next = posts[i - 1];
    const toc = (p.body.match(/^## .+$/gm) || []).map(h => h.slice(3));
    const html = md(p.body);
    out.push({ path: `/blog/${p.slug}/`, priority: 0.7, changefreq: 'monthly', lastmod: p.updated || p.date, html: layout({ title: `${p.title} — 창업가이드`, desc: p.desc, path: `/blog/${p.slug}/`, active: 'blog', type: 'article', og: p.cover ? abs('/' + p.cover) : undefined, keywords: p.keywords || [],
      ld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': abs(`/blog/${p.slug}/#post`), headline: p.title, description: p.desc, datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'ko-KR', image: p.cover ? abs('/' + p.cover) : abs('/og.png'), author: { '@type': 'Organization', name: p.author || `${SITE.name} 편집팀`, url: abs('/about/') }, publisher: { '@id': abs('/#org') }, mainEntityOfPage: abs(`/blog/${p.slug}/`), keywords: (p.keywords || []).join(', '), about: l ? { '@id': abs(`/listing/${l.id}/#product`) } : undefined, wordCount: p.body.length }],
      body: `<div class="wrap"><article class="article">${breadcrumb([{ name: '홈', href: '/' }, { name: '창업 인사이트', href: '/blog/' }, ...(p.category ? [{ name: p.category, href: `/blog/category/${encodeURIComponent(p.category)}/` }] : []), { name: p.title, href: `/blog/${p.slug}/` }])}
        <header class="article__head">${p.category ? badge(p.category, 'yellow') : ''}<h1>${esc(p.title)}</h1><div class="article__meta"><span>${esc(fmtDate(p.date))}</span><span>·</span><span>${esc(p.author || '창업가이드 편집팀')}</span>${p.updated ? `<span>·</span><span>갱신 ${esc(fmtDate(p.updated))}</span>` : ''}</div></header>
        ${p.cover ? `<div class="article__cover">${img(p.cover, p.title, { lazy: false, w: 1200, h: 675 })}</div>` : ''}
        ${p.summary ? `<div class="summary-box"><h2>핵심 요약</h2><ul>${p.summary.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
        ${toc.length > 2 ? `<nav class="toc" aria-label="목차"><strong>목차</strong><ol>${toc.map(t => `<li><a href="#${esc(t.replace(/[^\p{L}\p{N}]+/gu, '-'))}">${esc(t)}</a></li>`).join('')}</ol></nav>` : ''}
        <div class="prose">${html}</div>
        ${l ? `<section class="d-sec"><h2 class="h2">이 글에서 다룬 매물</h2><div class="grid" style="grid-template-columns:1fr;max-width:420px">${listingCard(l, { eager: false })}</div>${agent ? `<p style="font-weight:700;margin-top:12px">담당 ${esc(agent.name)} ${esc(agent.role)} · <a href="tel:${esc(agent.mobile.replace(/^0/, '+82-'))}" data-call="${esc(l.id)}" data-agent="${esc(agent.id)}" data-phone="${esc(agent.mobile)}" data-title="${esc(l.title)}">${esc(agent.mobile)}</a></p>` : ''}</section>` : ''}
        ${p.faq ? `<section class="d-sec">${faqBlock(p.faq, { title: '이 글의 Q&A' })}</section>` : ''}
        ${related.length ? `<section class="d-sec"><h2 class="h2">함께 볼 매물</h2><div class="grid">${related.slice(0, 4).map(x => listingCard(x)).join('')}</div></section>` : ''}
        <div class="author-card"><div style="width:56px;flex:none">${ILLO.coins}</div><div><strong>${esc(p.author || '창업가이드 편집팀')}</strong><p class="muted" style="margin:0;font-size:.88rem">이 글은 창업가이드에 등록된 실제 매물 데이터(월매출·월수익·권리금)를 기준으로 작성되었습니다. 숫자는 등록 시점 기준이며, 최신 조건은 담당 창업전문가에게 확인하세요.</p></div></div>
        <nav class="pager" style="justify-content:space-between" aria-label="이전·다음 글">${prev ? `<a href="${u(`/blog/${prev.slug}/`)}" style="min-width:0;padding:8px 14px">‹ ${esc(prev.title.slice(0, 28))}…</a>` : '<span></span>'}${next ? `<a href="${u(`/blog/${next.slug}/`)}" style="min-width:0;padding:8px 14px">${esc(next.title.slice(0, 28))}… ›</a>` : ''}</nav>
      </article></div>${ctaBand({ title: '이 조건으로 매물을 찾아드릴까요?' })}` }) });
  }
  return out;
}
