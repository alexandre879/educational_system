#!/bin/sh
set -e

echo "🚀 Starting backend entrypoint..."

# -----------------------------------
# Wait for database (DATABASE_URL)
# -----------------------------------
if [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL for DB connection..."

  until python - <<'PY'
import os, sys
from urllib.parse import urlparse
import socket

parsed = urlparse(os.getenv("DATABASE_URL"))

try:
    socket.create_connection((parsed.hostname, parsed.port or 5432), timeout=3)
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
  do
    echo "⏳ Waiting for database..."
    sleep 2
  done

  echo "✅ Database is ready"
else
  echo "⚠️ DATABASE_URL not set, skipping DB wait"
fi

# -----------------------------------
# Django setup
# -----------------------------------
echo "📦 Running migrations..."
python manage.py migrate --noinput

echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "🔥 Starting main process: $*"
exec "$@"
