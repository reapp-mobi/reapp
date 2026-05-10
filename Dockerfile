FROM node:lts-alpine3.21 AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

FROM base AS installer

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder

COPY --from=installer /usr/src/app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate && pnpm build && pnpm prune --production --ignore-scripts

FROM base AS runner

ARG APP_ENV=production

LABEL logging=promtail
LABEL app=reapp-back
LABEL env=${APP_ENV}

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

RUN mkdir -p uploads temp_uploads

COPY start.sh ./

RUN chmod +x ./start.sh

USER node

ENTRYPOINT ["./start.sh"]