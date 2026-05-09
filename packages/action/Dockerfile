FROM oven/bun:1

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /action

# The build context for a GitHub Docker action is the directory containing
# action.yml (the repo root), so we reference files inside packages/action/.
# The action package has no workspace dependencies, so we install it
# stand-alone from its own package.json (no monorepo lockfile needed).
COPY packages/action/package.json packages/action/tsconfig.json ./
COPY packages/action/src ./src

RUN bun install --production

ENTRYPOINT ["bun", "run", "/action/src/index.ts"]
