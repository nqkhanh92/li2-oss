FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
#this for node-canvas
RUN apk add --no-cache make gcc g++ python3 pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev librsvg-dev curl

WORKDIR /app

# node-canvas ships no musl prebuilt, so node-gyp compiles it and first downloads Node
# headers from unofficial-builds.nodejs.org. That mirror takes ~30s and times the build out.
# Fetch it here with retries and a generous timeout, then hand the file to node-gyp.
RUN NODE_VER="$(node -v)" && \
    curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors \
      --connect-timeout 30 --max-time 900 \
      -o /tmp/node-headers.tar.gz \
      "https://unofficial-builds.nodejs.org/download/release/${NODE_VER}/node-${NODE_VER}-headers.tar.gz"
ENV npm_config_tarball=/tmp/node-headers.tar.gz

# Nothing here reads .env: yarn install has no install hooks, and the builder stage's
# COPY . . already brings env files in for the build. Copying them here only busted this
# layer's cache on every env edit, which is what re-triggered the canvas compile.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM base AS builder
#this for node-canvas
RUN apk add --no-cache make gcc g++ python3 pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev librsvg-dev
# Runtime dependencies for node-canvas
RUN apk add --no-cache cairo pango libjpeg-turbo librsvg

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096

# `NEXT_PUBLIC_*` được Next inline vào bundle LÚC BUILD, nên chúng phải có mặt ở đây chứ không
# phải lúc chạy. Bản deploy nội bộ lấy chúng từ `.env.production` mà `COPY . .` mang vào; bản
# self-host không có file đó nên truyền qua `--build-arg`.
#
# Mặc định `cloud` — kho này LÀ bản thương mại, không đặt gì thì không đổi hành vi.
# ⚠ Phải export CÓ ĐIỀU KIỆN. Một `ENV FOO=` rỗng vẫn tính là "đã đặt", và Next **không ghi đè**
# biến đã có trong môi trường bằng giá trị trong `.env.production` — nên khai ENV thẳng ở đây sẽ
# âm thầm xoá cấu hình của bản deploy nội bộ. Chỉ export khi build-arg thực sự có giá trị.
ARG NEXT_PUBLIC_EDITION=
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_APP_BASE_URL=
ARG NEXT_PUBLIC_CASDOOR_BASE=
ARG NEXT_PUBLIC_CASDOOR_APP_URL=
ARG NEXT_PUBLIC_CASDOOR_ORG_NAME=
ARG NEXT_PUBLIC_CASDOOR_APP_NAME=
ARG NEXT_PUBLIC_CASDOOR_CLIENT_ID=
ARG NEXT_PUBLIC_CASDOOR_BASE64_CERT=
ARG NEXT_PUBLIC_MAPBOX_TOKEN=

# Giá trị GIẢ, chỉ sống trong stage builder này. `next build` chạy giai đoạn "collect page
# data", tức là NẠP mã server thật — và mã đó dựng client Supabase lẫn Redis ngay lúc import.
# Thiếu chúng thì build chết với "Your project's URL and Key are required to create a Supabase
# client!" và `ERR_SOCKET_BAD_PORT`.
#
# An toàn vì ba lý do: (1) chúng KHÔNG phải `NEXT_PUBLIC_*` nên Next không nhúng vào bundle;
# (2) mã server đọc chúng lúc CHẠY, từ môi trường container; (3) stage `runner` là một `FROM`
# khác nên không thừa kế ENV này.
#
# Trước đây build vẫn qua được là nhờ `COPY . .` vô tình mang `.env.local` của máy lập trình
# vào — nghĩa là image mang theo cấu hình instance của người build. `.dockerignore` đã chặn.
ENV SUPABASE_URL=http://supabase.build-placeholder.invalid
ENV SUPABASE_ANON_KEY=build-placeholder
ENV SUPABASE_SERVICE_KEY=build-placeholder
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379

RUN set -eu; \
    for v in NEXT_PUBLIC_EDITION NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_APP_BASE_URL \
             NEXT_PUBLIC_CASDOOR_BASE NEXT_PUBLIC_CASDOOR_APP_URL \
             NEXT_PUBLIC_CASDOOR_ORG_NAME \
             NEXT_PUBLIC_CASDOOR_APP_NAME NEXT_PUBLIC_CASDOOR_CLIENT_ID \
             NEXT_PUBLIC_CASDOOR_BASE64_CERT NEXT_PUBLIC_MAPBOX_TOKEN; do \
      eval "val=\${$v}"; \
      [ -n "$val" ] && export "$v=$val" || true; \
    done; \
    yarn build

# Production image, copy all the files and run next
FROM base AS runner
# Runtime dependencies for node-canvas
RUN apk add --no-cache cairo pango libjpeg-turbo librsvg

WORKDIR /app

RUN mkdir -p /app/logs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV PORT 3000

ENV HOSTNAME '0.0.0.0'

CMD ["node", "server.js"]