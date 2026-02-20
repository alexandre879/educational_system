#!/bin/sh
set -e

echo "Waiting for database..."

# You must have DB_HOST + DB_PORT env vars set in DO
until python - <<'PY'
import os, socket, sys
host = os.getenv("DB_HOST")
port = int(os.getenv("DB_PORT", "5432"))
if not host:
    print("DB_HOST is missing"); sys.exit(1)

try:
    socket.create_connection((host, port), timeout=3)
    sys.exit(0)
except Exception as e:
    print("DB not ready:", e)
    sys.exit(1)
PY
do
  sleep 2
done

echo "Database is up ✅"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn..."
exec gunicorn configuration.wsgi:application --bind 0.0.0.0:${PORT:-8000}