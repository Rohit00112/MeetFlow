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
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Workflow

- `main` is the only long-lived branch.
- Create feature branches from `main` using prefixes such as `feat/`, `fix/`, and `chore/`.
- Open a pull request for every coherent change.
- Use conventional commit PR titles such as `feat: add meeting scheduling`.
- CI must pass before squash-merging back into `main`.
