# quietgram

quietgram is a private, minimal Instagram client: Instagram without reels, without an infinite feed and without algorithmic bait. It shows only what you chose to follow, in a finite and deliberately calm interface, and puts you in control of when the feed refreshes.

It is a personal project built for two users (the author and a friend). It is not a product, it is not affiliated with Instagram or Meta, and it is not meant to be hosted for the public.

## What it does

- **Finite feed ("Posta")**: posts from the accounts you care about, with three feed modes: friends plus manual exceptions, everyone you follow, or creators above a follower threshold. No reels, no suggestions.
- **Manual refresh**: pull-to-refresh with a cooldown, instead of background polling. An optional daily time budget locks the feed when it runs out (off by default).
- **Stories**: a read-only stories bar.
- **Profiles**: account pages with grid, avatars, follower counts and recent posts.
- **Messages**: read direct message threads, with sending behind a feature flag.
- **Saved posts**: browse the posts you saved on Instagram.
- **Interactions**: like, save and comment, disabled by default and guarded by a profile switch, a server flag and an hourly cap.
- **Quiet presentation**: monochrome UI, optional black-and-white media, drawers instead of modal dialogs, installable as a PWA.

## How it works

Instagram offers no official API for personal feeds, saved posts or messages, so the project talks to Instagram on behalf of the logged in owner using the unofficial private API.

```
Browser extension ---- session cookies ----+
                                           v
 Next.js app on Cloudflare Workers ---- signed requests ----> ig-engine (FastAPI + instagrapi)
   tRPC, Better Auth, D1 (Drizzle)                                     |
                                                                       v
                                                                   Instagram
```

- **Web app** (`apps/web`): Next.js 16 and React 19 deployed to Cloudflare Workers through OpenNext. Data lives in Cloudflare D1 via Drizzle ORM. The API layer is tRPC with TanStack Query, authentication is Better Auth with passkeys and an email allowlist, the UI is built on shadcn and Base UI with `motion` for animation. A cron trigger runs a session keep-alive every six hours.
- **ig-engine** (`apps/ig-engine`): a Python FastAPI service wrapping `instagrapi`. Every request from the web app is HMAC-signed with a timestamp and replay protection. It paces and rate-limits calls to Instagram, supports credential login with TOTP two-factor codes, and keeps its session state on a mounted volume. It runs as a non-root container.
- **Browser extension** (`apps/extension`): a Manifest V3 extension for Chrome and Firefox that reads the Instagram session cookies and pairs them with the web app through a short-lived code. Cookies and stored credentials are encrypted with AES-GCM before reaching the database.
- **Shared packages**: `packages/db` (schema and migrations), `packages/ig` (typed Instagram web client used as fallback source) and `packages/config` (shared TypeScript config).

## Repository layout

```
apps/
  web/          Next.js app and Cloudflare Worker entry
  ig-engine/    FastAPI service and its Dockerfile
  extension/    Chrome and Firefox extension
packages/
  db/           Drizzle schema and D1 migrations
  ig/           Instagram web client
  config/       shared tsconfig
```

## Getting started

Requirements: Node.js 24, pnpm 12, Python 3.12 with [uv](https://docs.astral.sh/uv/), and a Cloudflare account for deployment.

```sh
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/ig-engine/.env.example apps/ig-engine/.env
```

Fill in the secrets in both files. `IG_ENGINE_SECRET` in the web app must match `ENGINE_SECRET` in the engine. `COOKIE_KEY` is a base64 encoded 32 byte AES key, and `ALLOWED_EMAILS` lists who can sign in.

Run the web app:

```sh
pnpm --filter @nodistraction/web dev
```

Run the engine:

```sh
cd apps/ig-engine
uv sync
uv run uvicorn ig_engine.app:create_app --factory --port 8000
```

Build the extension against your app origin:

```sh
APP_ORIGIN=https://your-app.example pnpm --filter @nodistraction/extension build
TARGET=firefox APP_ORIGIN=https://your-app.example pnpm --filter @nodistraction/extension build
```

Create the D1 database, set its id in `apps/web/wrangler.jsonc`, apply the migrations with `wrangler d1 migrations apply`, then deploy with `pnpm --filter @nodistraction/web deploy`.

## Docker image for the engine

Tagged releases publish a multi-architecture image (`linux/amd64`, `linux/arm64`) to the GitHub Container Registry, and optionally to Docker Hub:

```sh
docker run -d --name ig-engine \
  --env-file apps/ig-engine/.env \
  -p 127.0.0.1:8095:8000 \
  -v "$PWD/data:/data" \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  ghcr.io/fapakslapa/quietgram-ig-engine:latest
```

Expose it to the web app through a tunnel or reverse proxy of your choice and set `IG_ENGINE_URL` accordingly.

## Development

```sh
pnpm lint        # Biome
pnpm typecheck   # TypeScript and mypy
pnpm test        # Vitest and pytest
pnpm build
```

Engine checks run with `uv run ruff check`, `uv run mypy` and `uv run pytest` from `apps/ig-engine`.

## Continuous integration and releases

- Pull requests and pushes to `development` run lint, typecheck, tests, the production build, the engine checks and a Docker build.
- Pushes to `main` run the same checks, then [release-please](https://github.com/googleapis/release-please) maintains a release pull request derived from conventional commits. Merging it creates the GitHub release and tag, and publishes the engine image.
- Publishing to Docker Hub is enabled by setting the repository variable `DOCKERHUB_IMAGE` and the secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

## Disclaimer

This project uses unofficial, reverse-engineered Instagram endpoints, which violates Instagram's Terms of Use and can lead to rate limiting or account suspension. It is published for educational purposes only, comes with no warranty, and should only ever be used with your own account.

## License

MIT, see [LICENSE](LICENSE).
