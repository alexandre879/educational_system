# # #!/bin/sh
# # set -e

# # echo "Starting backend entrypoint..."

# # # --- sanity checks ---
# # if [ -z "$DB_HOST" ]; then
# #   echo "ERROR: DB_HOST is not set"
# #   exit 1
# # fi

# # if [ -z "$DB_PORT" ]; then
# #   export DB_PORT=5432
# # fi

# # echo "Waiting for DB at $DB_HOST:$DB_PORT ..."

# # # wait until db port is reachable
# # until python - <<'PY'
# # import os, socket, sys
# # host = os.getenv("DB_HOST")
# # port = int(os.getenv("DB_PORT", "5432"))
# # try:
# #     socket.create_connection((host, port), timeout=3)
# #     sys.exit(0)
# # except Exception:
# #     sys.exit(1)
# # PY
# # do
# #   echo "DB not ready yet... retrying in 2s"
# #   sleep 2
# # done

# # echo "DB is ready ✅"

# # # run migrations
# # python manage.py migrate --noinput

# # # start gunicorn
# # echo "Starting gunicorn..."
# # exec gunicorn configuration.wsgi:application --bind 0.0.0.0:${PORT:-8000}





# #!/bin/sh
# set -e

# echo "Starting backend entrypoint..."

# if [ -z "$DB_HOST" ]; then
#   echo "ERROR: DB_HOST is not set"
#   exit 1
# fi

# if [ -z "$DB_PORT" ]; then
#   export DB_PORT=5432
# fi

# echo "Waiting for DB at $DB_HOST:$DB_PORT ..."

# until python - <<'PY'
# import os, socket, sys
# host = os.getenv("DB_HOST")
# port = int(os.getenv("DB_PORT", "5432"))
# try:
#     socket.create_connection((host, port), timeout=3)
#     sys.exit(0)
# except Exception:
#     sys.exit(1)
# PY
# do
#   echo "DB not ready yet... retrying in 2s"
#   sleep 2
# done

# echo "DB is ready ✅"

# python manage.py migrate --noinput

# # IMPORTANT: do NOT start gunicorn here
# exec "$@"





#!/bin/sh
set -e

echo "🚀 Starting backend entrypoint..."

# -----------------------------------
# Wait for database
# Supports DATABASE_URL (DO Managed DB)
# -----------------------------------

if [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL for DB connection..."

  until python - <<'PY'
import os, sys
from urllib.parse import urlparse
import socket

url = os.getenv("DATABASE_URL")
if not url:
    sys.exit(1)

parsed = urlparse(url)
host = parsed.hostname
port = parsed.port or 5432

try:
    socket.create_connection((host, port), timeout=3)
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

echo "🔥 Starting main process..."

# IMPORTANT:
# DO App Platform will pass gunicorn as Run Command
exec "$@"