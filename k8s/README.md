# Kubernetes

Production runs on DigitalOcean (see [Production](#production) below). This folder also runs the whole system (Postgres, Django, Next.js, and the Telegram bot when turned on) on a local
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

## Production

educational_system and ppops share one k3s server on DigitalOcean: `k3s-1`, 4 GB, 2 CPUs, Amsterdam,
`209.38.108.180`, about $28.80/month including weekly backups. The firewall (`k3s-web`) only lets in ports
22, 80 and 443.

| Site                      | Address                                  |
|---------------------------|------------------------------------------|
| School website and API    | <https://blueapp.store>                  |
| School admin              | <https://blueapp.store/back/admin/>      |
| ppops website             | <https://newhousemodern.shop>             |
| ppops admin platform      | <https://newhousemodern.shop/admin>       |

`base/` is shared with the local kind cluster; `production/` only adds the domain, HTTPS, the Telegram bot and
small memory limits. Traefik, built into k3s, gets the Let's Encrypt certificates and redirects http to https.

```sh
./k8s/production/deploy.sh                 # deploy the school (ppops: ./k8s/deploy.sh in its own repo)

ssh -i ~/.ssh/digitalocean_ed25519 root@209.38.108.180    # then kubectl works on the server:
kubectl get pods -A
kubectl -n education logs deploy/backend -f
```

- A deploy uploads only the source and builds the images on the server, so it costs a few MB of upload, not a
  gigabyte. Expect about 10 to 20 minutes when the website or its packages change.
- `backend/.env` holds the S3, Telegram and DeepSeek keys. `deploy.sh` streams it into the `backend-env` secret, so
  after changing a key in that file, run `deploy.sh` again.
- `DJANGO_SECRET_KEY` and the database passwords were generated once, on the server. Don't delete those secrets:
  `postgres-credentials`, `backend-production`, and ppops' `ppops-postgres` and `ppops-secrets`.
- 2 GB is too small for both projects: the server swaps constantly and services crash. Don't size it back down.
- The server was set up once with `production/server-setup.sh`, which is safe to run again.
- Production is the one copy of the Telegram bot. Don't run `run_bot.py` elsewhere with the same `BOT_TOKEN`.
