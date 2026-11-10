#!/usr/bin/env bash
# Automatic deploys (CD): GitHub Actions runs this on the server after CI passes on main.
#
# Installed as /usr/local/bin/blueapp-deploy. GitHub's deploy key in /root/.ssh/authorized_keys is
# locked to it (command="/usr/local/bin/blueapp-deploy",restrict ...), so that key can do nothing
# else: it can only ask for a commit of main to be deployed. The commit comes in SSH_ORIGINAL_COMMAND.
#
# The code is fetched from GitHub here, so nothing secret goes through GitHub: the app's secrets
# (backend-env, backend-production, postgres-credentials) are already in the cluster and are left
# as they are. To change one of them, run k8s/production/deploy.sh from your Mac.
set -euo pipefail
# A dropped connection (e.g. GitHub cancelling the job) must not stop a deploy half way.
trap '' HUP

REPO=https://github.com/alexandre879/educational_system.git
DIR=/srv/git/educational_system
STATE=/srv/git/educational_system.deployed
SHA=${SSH_ORIGINAL_COMMAND:-}

if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "blueapp-deploy only accepts a full commit sha of main." >&2
  exit 2
fi

# One deploy at a time: a second one waits for the first.
mkdir -p /srv/git
exec 9>/srv/git/.deploy.lock
flock 9

if [ ! -d "$DIR/.git" ]; then
  git clone --quiet "$REPO" "$DIR"
fi
cd "$DIR"
git fetch --quiet --prune origin main

if ! git merge-base --is-ancestor "$SHA" origin/main; then
  echo "Refusing to deploy $SHA: it is not on main." >&2
  exit 3
fi
# Two quick pushes can finish CI out of order; never go back to an older commit.
if [ -s "$STATE" ] && [ "$(cat "$STATE")" != "$SHA" ] && git merge-base --is-ancestor "$SHA" "$(cat "$STATE")"; then
  echo "A newer commit ($(cat "$STATE")) is already deployed; skipping $SHA."
  exit 0
fi

git checkout --quiet --force --detach "$SHA"
echo "Building $(git log -1 --format='%h %s')"
docker build -q -t education-backend:local backend
docker build -q -t education-frontend:local frontend

kubectl apply -k k8s/production
kubectl -n education rollout restart deploy/backend deploy/frontend deploy/telegram-bot
kubectl -n education rollout status statefulset/postgres --timeout=300s
kubectl -n education rollout status deploy/backend --timeout=600s
kubectl -n education rollout status deploy/frontend --timeout=300s
kubectl -n education rollout status deploy/telegram-bot --timeout=300s
docker image prune -f >/dev/null

echo "$SHA" > "$STATE"
echo "Deployed $SHA to https://blueapp.store"
