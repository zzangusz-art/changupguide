# 창업가이드 — 사이트(정적) + 관리자 API 한 컨테이너. DB·업로드는 /app/data 볼륨에 보관
FROM node:24-slim
WORKDIR /app
COPY . .
ENV PORT=8787 DATA_DIR=/app/data NODE_ENV=production
RUN node build.mjs
VOLUME ["/app/data"]
EXPOSE 8787
CMD ["node", "server.mjs"]
