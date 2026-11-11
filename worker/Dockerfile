FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY migrations ./migrations
COPY scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY scripts/migrate.mjs ./scripts/migrate.mjs
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/worker/main.ts"]
