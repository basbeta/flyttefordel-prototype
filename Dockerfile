FROM node:22-alpine AS base

# Alpine ships no OpenSSL by default. Prisma 5.x's native schema-engine
# binary needs libssl to start at all — without it, `prisma migrate deploy`
# fails immediately with a non-JSON engine response and the container
# restart-loops on the identical failure every time.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
