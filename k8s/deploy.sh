#!/usr/bin/env bash
# Builds the images and deploys the whole system to a local kind cluster (free, runs on this machine).
# Usage: ./k8s/deploy.sh          Re-run it after code changes to rebuild and roll out.
# Tear down: kind delete cluster --name education
set -euo pipefail
cd "$(dirname "$0")/.."

CLUSTER=education
NAMESPACE=education
kc() { kubectl --context "kind-$CLUSTER" -n "$NAMESPACE" "$@"; }

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing: copy backend/.env.example to backend/.env and fill it in." >&2
  exit 1
fi

if ! kind get clusters | grep -qx "$CLUSTER"; then
  kind create cluster --config k8s/kind-config.yaml
fi

docker build -t education-backend:local backend
docker build -t education-frontend:local frontend
kind load docker-image education-backend:local education-frontend:local --name "$CLUSTER"

kubectl --context "kind-$CLUSTER" apply -f k8s/base/namespace.yaml

# Secrets come from local files and are never written into the manifests.
if ! kc get secret postgres-credentials >/dev/null 2>&1; then
  kc create secret generic postgres-credentials \
    --from-literal=POSTGRES_DB=django_db \
    --from-literal=POSTGRES_USER=django_user \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 24)"
fi
kc create secret generic backend-env --from-env-file=backend/.env --dry-run=client -o yaml | kc apply -f -

already_deployed=$(kc get deploy backend -o name 2>/dev/null || true)
kubectl --context "kind-$CLUSTER" apply -k k8s
if [ -n "$already_deployed" ]; then
  # Same image tags, new contents: restart so the pods pick up the rebuilt images.
  kc rollout restart deploy/backend deploy/frontend deploy/telegram-bot
fi

kc rollout status statefulset/postgres --timeout=180s
kc rollout status deploy/backend --timeout=300s
kc rollout status deploy/frontend --timeout=180s
kc rollout status deploy/gateway --timeout=120s

echo
echo "Website: http://localhost:8080"
echo "Admin:   http://localhost:8080/back/admin/"
echo "API:     http://localhost:8080/back/api/"
