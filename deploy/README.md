# Deploying Ferrin Instruments

The shop runs as four Docker containers on one server:

| Container | What it does |
|---|---|
| `db` | PostgreSQL 17. Data in the Docker volume `ferrin_pgdata`. Not reachable from outside. |
| `app` | The shop, API and admin panel (Node). Only reachable through the tunnel, plus `127.0.0.1:18300` on the server itself. |
| `tunnel` | Cloudflare Tunnel. Makes an outbound connection to Cloudflare, which serves the site publicly over HTTPS. No ports are opened on the server or its firewall. |
| `backup` | Dumps the database every 24 hours into `deploy/backups/`, keeping 14 days. |

Everything below runs as a normal user in the `docker` group; no sudo is needed.

## First deployment

```bash
git clone https://github.com/saadkhalid-git/ferrin-site.git ~/ferrin
cd ~/ferrin/deploy
cp .env.production.example .env && chmod 600 .env
# Fill in .env: POSTGRES_PASSWORD (openssl rand -hex 24), the same password inside DATABASE_URL,
# AUTH_SECRET (openssl rand -base64 48), HOST_UID/HOST_GID (id -u / id -g), ADMIN_EMAIL, ADMIN_PASSWORD.
mkdir -p backups
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app node prisma/seed.js            # import the catalogue (first time only)
docker compose -f docker-compose.prod.yml exec app node scripts/create-admin.mjs  # create the admin from .env
```

Find the public address (temporary tunnel):

```bash
docker compose -f docker-compose.prod.yml logs tunnel | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

Put it in `.env` as `APPLICATION_URL`, then `docker compose -f docker-compose.prod.yml up -d app`.

A temporary `trycloudflare.com` address changes every time the tunnel container restarts. Use your own domain for anything customers rely on.

## Using your own domain

1. Create a free Cloudflare account and add your domain. You can buy one through Cloudflare Registrar.
2. Go to Zero Trust → Networks → Tunnels → Create a tunnel (type Cloudflared). Give it a name and copy the **token**.
3. Under the tunnel's Public hostnames, add `www.your-domain.com` (and the bare domain) → service `http://app:3000`.
4. In `deploy/.env` set:
   ```
   TUNNEL_TOKEN=<the token>
   TUNNEL_COMMAND=tunnel --no-autoupdate run
   APPLICATION_URL=https://www.your-domain.com
   ```
5. Apply: `docker compose -f docker-compose.prod.yml up -d`.

Optional: protect `/admin` with Cloudflare Access (Zero Trust → Access → Applications), which is free for up to 50 users.

## Updating

```bash
cd ~/ferrin && git pull
cd deploy && docker compose -f docker-compose.prod.yml up -d --build
```

Database migrations run automatically when the app container starts.

## Backups

- Backups go to `~/ferrin/deploy/backups/ferrin-YYYYMMDD-HHMMSS.sql.gz`.
- Make one now: `docker compose -f docker-compose.prod.yml exec backup /bin/sh /scripts/backup.sh once`
- Restore one (replaces the current data):
  ```bash
  gunzip -c backups/<file>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ```
- Copy backups off the server regularly, for example with `scp` to your laptop.

## Useful commands

```bash
docker compose -f docker-compose.prod.yml ps               # status and health
docker compose -f docker-compose.prod.yml logs -f app      # app logs
docker compose -f docker-compose.prod.yml restart app      # restart the app
docker compose -f docker-compose.prod.yml down             # stop everything (data is kept)
curl -s http://127.0.0.1:18300/healthz                     # health check from the server
```

To open the admin panel over SSH without the tunnel: `ssh -L 18300:127.0.0.1:18300 office`, then browse to http://localhost:18300/admin.
