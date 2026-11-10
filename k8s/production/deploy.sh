#!/usr/bin/env bash
# Deploys educational_system to https://blueapp.store on the DigitalOcean k3s server.
#
#   ./k8s/production/deploy.sh
#
# Only the source code is uploaded; the images are built on the server, so a deploy costs a few MB
# of upload, not the gigabyte the finished images weigh. backend/.env (S3, Telegram, DeepSeek keys)
# is streamed into a Kubernetes secret and never stored on the server's disk.
# The server itself is set up once with server-setup.sh.
set -euo pipefail
cd "$(dirname "$0")/../.."

SERVER=${SERVER:-root@209.38.108.180}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/digitalocean_ed25519}
SRC=/srv/build/educational_system
remote() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SERVER" "$@"; }
kc() { remote kubectl -n education "$@"; }

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing." >&2
  exit 1
fi

echo "Uploading the source…"
remote mkdir -p "$SRC"
rsync -az --delete -e "ssh -i $SSH_KEY -o BatchMode=yes" \
  --exclude .git --exclude node_modules --exclude .next --exclude myenv --exclude .venv --exclude venv \
  --exclude '.env' --exclude '.env.*' --exclude __pycache__ --exclude staticfiles --exclude media \
  --exclude tsconfig.tsbuildinfo \
  backend frontend k8s "$SERVER:$SRC/"

echo "Building the images on the server…"
remote "cd $SRC && docker build -q -t education-backend:local backend && docker build -q -t education-frontend:local frontend"

remote kubectl apply -f "$SRC/k8s/base/namespace.yaml"

# Created once and kept: regenerating them would lock the app out of its own database and sessions.
if ! kc get secret postgres-credentials >/dev/null 2>&1; then
  kc create secret generic postgres-credentials \
    --from-literal=POSTGRES_DB=django_db \
    --from-literal=POSTGRES_USER=django_user \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)"
fi
if ! kc get secret backend-production >/dev/null 2>&1; then
  kc create secret generic backend-production --from-literal=DJANGO_SECRET_KEY="$(openssl rand -hex 48)"
fi
remote "kubectl -n education create secret generic backend-env --from-env-file=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -" < backend/.env

already_deployed=$(kc get deploy backend -o name 2>/dev/null || true)
remote kubectl apply -k "$SRC/k8s/production"
if [ -n "$already_deployed" ]; then
  # Same image tags, new contents: restart so the pods pick up the new images.
  kc rollout restart deploy/backend deploy/frontend deploy/telegram-bot
fi

kc rollout status statefulset/postgres --timeout=300s
kc rollout status deploy/backend --timeout=600s
kc rollout status deploy/frontend --timeout=300s
kc rollout status deploy/telegram-bot --timeout=300s
kc rollout status deploy/gateway --timeout=120s
remote docker image prune -f >/dev/null

echo
echo "Website: https://blueapp.store"
echo "Admin:   https://blueapp.store/back/admin/"
