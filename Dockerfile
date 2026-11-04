# Dockerfile multi-stage cho li2-oss.
#
# KHÔNG có `apk add` thư viện C nào, và đó là điều kiện có chủ ý: dependency đã được chọn để
# không dep nào phải compile native. Bản thương mại kéo `canvas` (cairo + pango + giflib) chỉ để
# render QR phía server, và báo cáo đánh giá kết luận rằng nó "KHÔNG gỡ được" vì một hằng số
# buộc mọi touch point phải render QR. Ở đây QR do `qrcode` (JS thuần) sinh, nên image chỉ cần
# node:22-alpine trần.
#
# Nếu một ngày build này cần `apk add` một thư viện C: đó là dấu hiệu một dep sai đã lọt vào,
# không phải dấu hiệu Dockerfile thiếu dòng. Xem lại `package.json` trước khi thêm.

# ───────────────────────────────────────────────────────────── 1. deps
FROM node:22-alpine AS deps
WORKDIR /app

# Chỉ copy manifest để layer `yarn install` còn cache được khi code đổi mà dep không đổi.
COPY package.json yarn.lock* ./
RUN if [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    else \
      echo 'Không có yarn.lock — cài theo package.json. Commit yarn.lock để build lặp lại được.' && \
      yarn install; \
    fi

# ───────────────────────────────────────────────────────────── 2. build
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` nạp các module server, và `lib/db.ts` throw ngay lúc import nếu thiếu DATABASE_URL.
# Giá trị dưới đây là chỗ giữ chỗ cho riêng lúc build — không có kết nối nào được mở, và nó KHÔNG
# đi vào image chạy (stage runner không copy biến này). Giá trị thật đến từ môi trường lúc chạy.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ───────────────────────────────────────────────────────────── 3. runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV STORAGE_DIR=/data/artifacts

# Chạy bằng user không phải root. `node:alpine` có sẵn user `node` (uid 1000) — dùng nó thay vì
# tạo user mới, để uid khớp với quy ước phổ biến khi người vận hành bind-mount thư mục của host.
#
# STORAGE_DIR phải ghi được bởi user này. `mkdir` + `chown` ở đây lo cho trường hợp volume Docker
# (Docker copy quyền của thư mục trong image khi tạo volume rỗng). Với bind-mount từ host thì
# quyền do host quyết định — README ghi rõ chỗ đó.
RUN mkdir -p "$STORAGE_DIR" && chown -R node:node "$STORAGE_DIR"

# `output: 'standalone'` gói sẵn node_modules cần thiết vào .next/standalone, nên image chạy
# không cần `yarn install` lần nữa.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Script DB đi theo image để `docker compose exec web node scripts/db-seed.mjs` dùng được.
# Chúng chỉ cần `pg`, mà `pg` đã nằm trong bundle standalone.
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/db ./db

USER node

EXPOSE 3000

# server.js do standalone sinh ra, không phải `next start`.
CMD ["node", "server.js"]
