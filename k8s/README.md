# Kubernetes

Runs the whole system (Postgres, Django, Next.js, and the Telegram bot when turned on) on a local
[kind](https://kind.sigs.k8s.io/) cluster. It costs nothing because everything runs on your own computer through Docker Desktop.

| Piece        | Kind                      | Notes                                                                 |
|--------------|---------------------------|-----------------------------------------------------------------------|
| postgres     | StatefulSet + 2Gi volume  | Credentials generated once into the `postgres-credentials` secret     |
| backend      | Deployment                | Runs migrations on start, gunicorn, static files via WhiteNoise       |
| frontend     | Deployment                | `next start`, calls the API at `/back/api` on its own origin          |
| telegram-bot | Deployment, 0 replicas    | Off by default: only one poller per bot token is allowed              |
| gateway      | nginx, NodePort 30080     | `/back/*` to Django (prefix stripped), everything else to Next.js     |

## Use

Needs Docker Desktop running, plus `kind` and `kubectl`.

```sh
./k8s/deploy.sh                      # first run creates the cluster; later runs rebuild and roll out
kind delete cluster --name education # remove everything, including the database
```

- Website: http://localhost:8080
- Admin: http://localhost:8080/back/admin/
- API: http://localhost:8080/back/api/

Secrets come from `backend/.env` (put into the `backend-env` secret on every deploy), so the S3, DeepSeek
and bot settings match local development. Non-secret settings live in the `backend-config` ConfigMap in
`backend.yaml` and take priority over the same keys in `backend/.env`.

## Common tasks

```sh
alias kc='kubectl --context kind-education -n education'

kc get pods
kc logs deploy/backend -f
kc exec -it deploy/backend -c backend -- python manage.py createsuperuser

# Load a pg_dump backup (custom format) into the cluster database
kc exec -i postgres-0 -- sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < ../db-backups/django_db-2026-10-06-before-seed.dump

# Telegram bot: only when no other copy (e.g. production) uses the same BOT_TOKEN
kc scale deploy/telegram-bot --replicas=1
```

## Moving to a real cluster

The manifests don't depend on kind. To deploy them on a hosted cluster:

1. Push both images to a registry and change `image:` in `backend.yaml`, `telegram-bot.yaml` and `frontend.yaml`.
2. In `backend.yaml`, set your domain in `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`, and set `DJANGO_FORCE_HTTPS: "1"` once the site is served over HTTPS.
3. In `gateway.yaml`, change the Service to `type: LoadBalancer`.
