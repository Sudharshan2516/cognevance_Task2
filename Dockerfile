# ---- Stage 1: install production dependencies ----
FROM node:20-alpine AS deps
WORKDIR /build
COPY app/package.json ./
RUN npm install --omit=dev && npm cache clean --force

# ---- Stage 2: minimal runtime image ----
FROM node:20-alpine
ARG APP_VERSION=dev
ARG GIT_SHA=local
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="task-tracker" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}"
ENV NODE_ENV=production PORT=3000 APP_VERSION=${APP_VERSION} GIT_SHA=${GIT_SHA} BUILD_DATE=${BUILD_DATE}
WORKDIR /usr/src/app
COPY --from=deps /build/node_modules ./node_modules
COPY app/package.json ./
COPY app/src ./src
COPY app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
