# Contributing to Sample Browser

Thanks for taking an interest. This project is developed inside a private
mono repo and published here as a snapshot, which shapes a couple of the
rules below — please read the last section before opening a PR.

## Getting set up

**Stack:** a FastAPI backend (`backend/`) and a Next.js frontend
(`frontend/`), run together with Docker Compose.

```bash
git clone https://github.com/geoffmyers/sample-browser.git
cd sample-browser
cp .env.example .env          # then edit: AUDIO_PATH, DATA_PATH, DOMAIN
docker compose -f docker-compose.example.yml up --build
```

`AUDIO_PATH` is mounted **read-only** — the browser indexes your sample
library, it never writes to it. `DATA_PATH` holds the index and needs to be
writable.

To work on one half without Docker:

```bash
cd backend  && python3 -m venv .venv && source .venv/bin/activate \
            && pip install -r requirements.txt
cd frontend && npm install && npm run dev
```

## Checks

<!-- CHECKS:START -->
Every push and pull request runs these checks in GitHub Actions
([`.github/workflows/checks.yml`](.github/workflows/checks.yml)), and every release has passed them.
To run one yourself, use the same commands from the directory shown.

**backend tests** (Python 3.12, from `backend/`):

```bash
python -m venv /tmp/venv
. /tmp/venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements-dev.txt
python -m pytest -q
```

**frontend build** (Node.js 22, from `frontend/`):

```bash
npm ci
npm run lint
npm run build
```

<!-- CHECKS:END -->

<!-- RELEASES:START -->
### Container images

Every push to `main` builds these for `linux/amd64` and `linux/arm64` and
pushes them to the GitHub Container Registry ([`.github/workflows/images.yml`](.github/workflows/images.yml)),
tagged `latest` and `sha-<commit>`:

- [`ghcr.io/geoffmyers/sample-browser-api`](https://github.com/geoffmyers/sample-browser/pkgs/container/sample-browser-api): `Dockerfile` in `backend/`
- [`ghcr.io/geoffmyers/sample-browser-web`](https://github.com/geoffmyers/sample-browser/pkgs/container/sample-browser-web): `Dockerfile` in `frontend/`

<!-- RELEASES:END -->

The backend tests cover filename parsing, including the example table in the
README; add a case there when you change what the parser recognises.

## Before you open a pull request

- Keep the change focused. One concern per PR is much easier to review.
- Match the surrounding style rather than introducing a new one. There is no
  separate style guide; the existing code is the guide.
- Update the README if you change behaviour a user can see.
- Explain **why** in the commit message, not just what. The diff already says
  what changed.

## Reporting a bug

Open an issue with what you did, what you expected, and what happened instead.
Version numbers and the exact command or steps help more than anything else.
If it is a crash, include the full error rather than a summary of it.

## Security

Please do **not** open a public issue for a security problem. Report it
privately through GitHub's *Report a vulnerability* button on the Security tab.

## How this repo is published

This project lives in a private mono repo. Each publish adds **one commit** on
top of the history here, so the history grows with every release, but one
commit here can stand for many upstream changes. Two consequences:

- Pull requests are reviewed here and applied upstream, then arrive back in the
  next published commit, which credits your authorship in its message. The pull
  request is closed with a link to that commit rather than merged, because the
  next publish is built from the upstream tree and would undo a change made
  only here.
- Operator configuration is deliberately excluded from the snapshot — the
  production `docker-compose.yml` among it. Use `docker-compose.example.yml`,
  which is the same deployment with neutral defaults.

## Licence

By contributing you agree that your contribution is licensed under the same
terms as this project — see [LICENSE.md](LICENSE.md).
