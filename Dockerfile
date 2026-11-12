# 창업가이드 — 사이트(정적) + 관리자 API 한 컨테이너
# Railway: 서비스에 Volume을 /app/data 로 연결하세요 (DB·업로드 사진 보관). Dockerfile의 VOLUME 지시어는 Railway에서 금지라 쓰지 않음
FROM node:24-slim
WORKDIR /app
COPY . .
# PORT는 Railway가 주입(8080). 로컬 docker run 시 -e PORT=8787
ENV DATA_DIR=/app/data NODE_ENV=production
RUN node build.mjs
EXPOSE 8787
CMD ["node", "server.mjs"]
