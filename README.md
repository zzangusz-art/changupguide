# 창업가이드 홈페이지

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

## 업체 요청 반영 (2026-11-11)
- 브랜드: 창업가이드 (사업자 211-07-92865, 대표 박병창). 회사 정보는 `src/data.mjs` SITE에서 관리. 로고는 `python tools/make_logo.py` (OG_FONT 필요)로 재생성.
- 외부(창업미디어) 수집 데이터: 매물 `source: "changupmedia.com"`, 담당자 `legacy: true`. 담당자 계정·연락처는 공개하지 않고, 해당 매물은 회사 대표번호로 연결.
  - 미리보기: `SHOW_LEGACY=1`(기본) — 수집 매물도 표시. **정식 오픈: `SHOW_LEGACY=0`** — 자체 등록 매물 + 관리자에서 "검증 완료" 표시한 매물만 공개.
- 인사이트 자동 글: 자체 등록(또는 검증 완료) 매물만 글감으로 사용. 기존 수집 매물 기반 글은 초안(비공개)으로 전환.
- 관리자: 간소화 매물 등록(지역·브랜드 자동완성, 브랜드 기본값 자동 적용, 자동 제목 수정 가능, 등록 후 계속·복제), 내가 등록한 매물, 브랜드 관리, 직원 계정(퇴사 처리·매물 이관·직원별 현황), 일괄 담당 변경·검증, 백업·복원·매물 불러오기.
- 브랜드 기본값 초기 데이터: `node tools/make_brands.mjs` → `src/data/brands.json` (기존 매물 평균, 관리자가 고친 값은 유지).

## 서버 배포 (관리자 실사용)
관리자 로그인·등록·저장은 서버(`server.mjs`)가 있어야 동작합니다. GitHub Pages는 정적 미리보기 + 데모 관리자(브라우저 저장)만 됩니다.
1. Node 24 이상 서버(VPS·클라우드) 또는 Docker: `docker build -t changupguide . && docker run -d -p 80:8787 -v cg-data:/app/data -e SITE_URL=https://도메인 -e ADMIN_PASSWORD=초기비번 -e SHOW_LEGACY=0 changupguide`
2. 첫 실행 때 `admin` 계정(비밀번호 ADMIN_PASSWORD)과 매물·브랜드가 DB에 들어갑니다. 로그인 후 직원 계정을 만들고 비밀번호를 바로 바꾸세요.
3. 사이트와 관리자는 같은 도메인에서 서비스해야 로그인 쿠키가 동작합니다 (`https://도메인/admin/`).
4. 백업: 관리자 → 설정·백업 → "백업 내려받기" (주 1회 이상). 복원·매물 JSON 불러오기도 같은 화면.
