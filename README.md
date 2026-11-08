# 창업미디어 홈페이지

양도양수 창업 매물 사이트. 정적 빌더(Node, 의존성 0) + 관리자 SPA + API 서버(node:http + node:sqlite).

## 구조
```
build.mjs            정적 빌드 → dist/   (매물·허브·블로그·sitemap·llms.txt·검색 인덱스)
server.mjs           API+정적 서버 (관리자, 통화알림 문자, 자동 재빌드)  |  --static 이면 dist만 서빙
src/data.mjs         사실 정보 단일 원본 (회사 정보, 카테고리, 테마, 브랜드 사전, 히어로, FAQ, SEO)
src/lib/text.mjs     자동 제목·검색 해석(지역+브랜드+예산)·금액 포맷 (빌더·브라우저 공용)
src/lib/html.mjs     레이아웃·컴포넌트·JSON-LD
src/pages/*.mjs      홈 / 매물 상세 / 허브(브랜드·지역·테마·예산·업종·키워드·담당자) / 회사·의뢰·FAQ / 블로그
src/data/*.json      listings.json(1,939건) · agents.json(20명)  ← 서버 모드에서는 SQLite가 원본, 저장 시 여기로 내보냄
content/posts/*.json 창업 인사이트 글 (하루 3편 자동 생성)
public/              CSS·JS·사진(photos/, photos/thumb/)·OG·로고
admin/               관리자 SPA (index.html, admin.js, api.js) — 서버 없으면 데모 모드
tools/               import_legacy.mjs(기존 사이트 이관) · make_posts.mjs(글 생성) · photos.py(사진 수집) · brand_images.py(OG) · check_links.mjs
.github/workflows    pages.yml(빌드·배포) · posts.yml(09:05/13:05/18:05 KST 글 발행)
```

## 명령
```
node build.mjs                                    # dist/ 생성 (env: SITE_URL, SITE_BASE, NOINDEX, API_URL, CNAME)
node server.mjs --static                          # dist 미리보기  http://localhost:8787
node server.mjs                                   # 운영 서버 (관리자 API, data/app.db)
node tools/make_posts.mjs --count 3               # 오늘 글 3편 생성
node tools/check_links.mjs                        # 내부 링크 검사
```

## 미리보기 → 정식 도메인 전환
GitHub 저장소 Settings → Variables 에 `SITE_URL=https://changupguide.co.kr`, `SITE_BASE=` (빈 값), `NOINDEX=0`, `CNAME=changupguide.co.kr` 을 넣고 다시 배포. DNS 는 GitHub Pages 안내대로 A/CNAME 설정.

## 관리자·문자 발송 운영 (서버 모드)
- 서버 1대(Railway 등)에서 `node server.mjs` 실행. 환경변수: `SITE_URL`, `ADMIN_PASSWORD`(최초 비밀번호), `DATA_DIR`(영구 볼륨), `SMS_PROVIDER`(aligo|solapi) + 키.
- 정적 사이트를 GitHub Pages 에 두고 서버는 API만 쓰려면 빌드 시 `API_URL=https://api.changupguide.co.kr` 지정.
- 로그인 계정: `admin` + 담당자 20명(아이디 = 기존 사이트 담당자 ID). 초기 비밀번호는 `ADMIN_PASSWORD`(미지정 시 changeme1234) — 첫 로그인 후 변경.
- 권한: 담당자는 본인 매물만 수정, 관리자는 전체 + 담당 이관(양쪽에 메시지 자동 발송). 동시 수정은 updatedAt 비교로 거부(409).
