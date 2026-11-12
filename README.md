# 창업가이드 홈페이지

양도양수 창업 매장 사이트. 정적 빌더(Node, 의존성 0) + 관리자 SPA + API 서버(node:http + node:sqlite).

## 구조
```
build.mjs            정적 빌드 → dist/   (매장·허브·블로그·sitemap·llms.txt·검색 인덱스)
server.mjs           API+정적 서버 (관리자, 통화알림 문자, 자동 재빌드)  |  --static 이면 dist만 서빙
src/data.mjs         사실 정보 단일 원본 (회사 정보, 카테고리, 테마, 브랜드 사전, 히어로, FAQ, SEO)
src/lib/text.mjs     자동 제목·검색 해석(지역+브랜드+예산)·금액 포맷 (빌더·브라우저 공용)
src/lib/html.mjs     레이아웃·컴포넌트·JSON-LD
src/pages/*.mjs      홈 / 매장 상세 / 허브(브랜드·지역·테마·예산·업종·키워드·담당자) / 회사·의뢰·FAQ / 블로그
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
- 권한: 담당자는 본인 매장만 수정, 관리자는 전체 + 담당 이관(양쪽에 메시지 자동 발송). 동시 수정은 updatedAt 비교로 거부(409).

## 업체 요청 반영 (2026-11-11)
- 브랜드: 창업가이드 (사업자 211-07-92865, 대표 박병창). 회사 정보는 `src/data.mjs` SITE에서 관리. 로고는 `python tools/make_logo.py` (OG_FONT 필요)로 재생성.
- 외부(창업미디어) 수집 데이터: 매장 `source: "changupmedia.com"`, 담당자 `legacy: true`. 담당자 계정·연락처는 공개하지 않고, 해당 매장은 회사 대표번호로 연결.
  - 미리보기: `SHOW_LEGACY=1`(기본) — 수집 매장도 표시. **정식 오픈: `SHOW_LEGACY=0`** — 자체 등록 매장 + 관리자에서 "검증 완료" 표시한 매장만 공개.
- 인사이트 자동 글: 자체 등록(또는 검증 완료) 매장만 글감으로 사용. 기존 수집 매장 기반 글은 초안(비공개)으로 전환.
- 관리자: 간소화 매장 등록(지역·브랜드 자동완성, 브랜드 기본값 자동 적용, 자동 제목 수정 가능, 등록 후 계속·복제), 내가 등록한 매장, 브랜드 관리, 직원 계정(퇴사 처리·매장 이관·직원별 현황), 일괄 담당 변경·검증, 백업·복원·매장 불러오기.
- 브랜드 기본값 초기 데이터: `node tools/make_brands.mjs` → `src/data/brands.json` (기존 매장 평균, 관리자가 고친 값은 유지).

## 서버 배포 (관리자 실사용)
관리자 로그인·등록·저장은 서버(`server.mjs`)가 있어야 동작합니다. GitHub Pages는 정적 미리보기 + 데모 관리자(브라우저 저장)만 됩니다.
1. Node 24 이상 서버(VPS·클라우드) 또는 Docker: `docker build -t changupguide . && docker run -d -p 80:8787 -v cg-data:/app/data -e SITE_URL=https://도메인 -e ADMIN_PASSWORD=초기비번 -e SHOW_LEGACY=0 changupguide`
2. 첫 실행 때 `admin` 계정(비밀번호 ADMIN_PASSWORD)과 매장·브랜드가 DB에 들어갑니다. 로그인 후 직원 계정을 만들고 비밀번호를 바로 바꾸세요.
3. 사이트와 관리자는 같은 도메인에서 서비스해야 로그인 쿠키가 동작합니다 (`https://도메인/admin/`).
4. 백업: 관리자 → 설정·백업 → "백업 내려받기" (주 1회 이상). 복원·매장 JSON 불러오기도 같은 화면.

## 운영 주소 (2026-11-12)
- 사이트: https://www.changupguide.co.kr (Railway, GitHub main 푸시 시 자동 배포)
- 관리자: https://www.changupguide.co.kr/admin/ (짧은 주소 /login/)
- 초기 관리자 계정: `admin` / 비밀번호는 Railway → Deployments → 첫 배포 Deploy Logs의 `[seed] admin 초기 비밀번호` 줄 (로그인 후 즉시 변경)
- `changupguide.co.kr`(www 없음)은 Cloudflare에서 www로 301 리다이렉트 필요 (Railway 플랜의 커스텀 도메인 1개 제한)
- 배포: `deploy.bat` 실행(또는 Claude Code 작업 종료 시 자동) → 커밋·푸시 → Railway·GitHub Pages 재배포

## 데이터 안전 · 여러 직원 동시 사용 (2026-11-12)
- 운영 데이터는 전부 Railway 볼륨(`DATA_DIR=/app/data`) 안에만 있습니다: `app.db`(매장·계정·문의·변경 이력), `photos/`, `posts/`(인사이트 글), `export/`(빌드용 JSON), `backups/`(자동 백업). 코드 배포로 지워지지 않습니다.
- 서버는 저장소의 `src/data`·`content/posts`를 **덮어쓰지 않습니다**(빌드는 `CU_DATA_DIR`·`CU_POSTS_DIR` 사용). 로컬에서 서버를 돌려도 테스트 데이터가 커밋되지 않습니다.
- 저장소 → 운영 반영(양방향의 반대쪽): 배포 때 저장소에 **새로 생긴** 매장 번호·브랜드·글·비어 있던 사이트 설정만 DB에 추가합니다. 직원이 고친 값은 덮어쓰지 않고, 한 번 가져온 항목은 `repoSeen`에 기록해 관리자가 지운 것이 되살아나지 않습니다.
- 동시 수정: 저장 시 원본(baseItem)과 비교해 서로 다른 칸은 자동 합치기, 같은 칸 충돌만 선택 창. 편집 중 표시 1분마다 갱신. 수정 중 내용은 브라우저에 임시 보관.
- 재시도: 관리자 화면은 끊김·502/503/504 때 약 30초간 자동 재시도, 매장 등록은 `clientKey`로 중복 등록 방지.
- 변경 이력: 수정·삭제·일괄변경·담당 변경·이관·복원 직전 상태를 `listing_history`에 보관(매장당 60개), 관리자 화면 "변경 이력"에서 되돌리기.
- 자동 백업(`backups/*.json.gz`): 부팅 때 10개, 1시간마다(변경 있을 때) 48개, 매일 45개, 복원 직전 10개, 수동 20개. 설정·백업 화면에서 내려받기·시점 되돌리기.
- PC 백업: `deploy.bat`이 배포 전에 `tools/pc-backup.ps1`로 운영 백업을 `7. 창업미디어/backups/`(저장소 밖)에 저장(최근 60개). 키 파일 `backups/backup-key.txt` = Railway 변수 `BACKUP_KEY`.
- 관리자 비밀번호 분실: Railway 변수 `ADMIN_RESET_PASSWORD`(8자 이상) → 재배포 시 admin 비밀번호 변경(같은 값은 한 번만 적용).
- 사용 매뉴얼: `/admin/manual.html` (관리자 왼쪽 메뉴 "사용 매뉴얼", 로그인 화면 링크, 인쇄·PDF 가능).
- GitHub Pages 미리보기의 관리자(github.io)는 정식 관리자로 자동 이동합니다(`?demo`를 붙이면 데모).
