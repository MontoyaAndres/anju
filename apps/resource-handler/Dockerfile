FROM node:24-alpine
WORKDIR /repo

# Workspace skeleton — every workspace package.json is needed for npm install
COPY package.json package-lock.json ./
COPY packages/tsconfig packages/tsconfig
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY apps/api/package.json apps/api/
COPY apps/mcp/package.json apps/mcp/
COPY apps/web/package.json apps/web/
COPY apps/resource-handler/package.json apps/resource-handler/

RUN npm install --no-audit --no-fund

# Sources we actually need to build
COPY packages/db packages/db
COPY packages/utils packages/utils
COPY apps/resource-handler apps/resource-handler

RUN npm --workspace @anju/utils run build
RUN npm --workspace @anju/db run build
RUN npm --workspace @anju/resource-handler run build

WORKDIR /repo/apps/resource-handler
ENV NODE_ENV=production
ENV PORT=8082
EXPOSE 8082
CMD ["node", "dist/server.js"]
