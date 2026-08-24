FROM node:24-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cli/package.json apps/cli/package.json
COPY packages/agent-core/package.json packages/agent-core/package.json
COPY packages/mcp-azure/package.json packages/mcp-azure/package.json
COPY packages/mcp-github/package.json packages/mcp-github/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENTRYPOINT ["node", "--import", "tsx", "apps/cli/src/index.ts"]
