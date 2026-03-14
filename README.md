## Getting Started

Install dependencies with `pnpm`:

```bash
pnpm install
```

Run the local checks used by CI:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Start the development server:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm prisma migrate deploy
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

`DATABASE_URL` in `.env` is for running the Next.js app on your host machine.
`DOCKER_DATABASE_URL` is used only by the `web` container inside Docker Compose.

## Docker Stack

Copy the local environment template and start the full development stack:

```bash
cp .env.example .env
pnpm docker:up
```

The Docker stack includes:

- `web` for the Next.js app
- `postgres` for Prisma data storage
- `redis` for realtime service coordination
- `livekit` for WebRTC SFU infrastructure
- `coturn` for TURN/STUN relay support
- `minio` for recording object storage
- `egress` for recording pipeline scaffolding
- `transcription` as the local captions service stub

## Workflow

- `main` is the only long-lived branch.
- Create feature branches from `main` using prefixes such as `feat/`, `fix/`, and `chore/`.
- Open a pull request for every coherent change.
- Use conventional commit PR titles such as `feat: add meeting scheduling`.
- CI must pass before squash-merging back into `main`.
