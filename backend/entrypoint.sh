# #!/bin/sh
# set -e

# echo "Starting backend entrypoint..."

# # --- sanity checks ---
# if [ -z "$DB_HOST" ]; then
#   echo "ERROR: DB_HOST is not set"
#   exit 1
# fi

# if [ -z "$DB_PORT" ]; then
#   export DB_PORT=5432
# fi

# echo "Waiting for DB at $DB_HOST:$DB_PORT ..."

# # wait until db port is reachable
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

# # run migrations
# python manage.py migrate --noinput

# # start gunicorn
# echo "Starting gunicorn..."
# exec gunicorn configuration.wsgi:application --bind 0.0.0.0:${PORT:-8000}





#!/bin/sh
set -e

echo "Starting backend entrypoint..."

if [ -z "$DB_HOST" ]; then
  echo "ERROR: DB_HOST is not set"
  exit 1
fi

if [ -z "$DB_PORT" ]; then
  export DB_PORT=5432
fi

echo "Waiting for DB at $DB_HOST:$DB_PORT ..."

until python - <<'PY'
import os, socket, sys
host = os.getenv("DB_HOST")
port = int(os.getenv("DB_PORT", "5432"))
try:
    socket.create_connection((host, port), timeout=3)
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
do
  echo "DB not ready yet... retrying in 2s"
  sleep 2
done

echo "DB is ready ✅"

python manage.py migrate --noinput

# IMPORTANT: do NOT start gunicorn here
exec "$@"