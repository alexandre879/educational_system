# set -e

# echo "🚀 Starting backend entrypoint..."


# if [ -n "$DATABASE_URL" ]; then
#   echo "Using DATABASE_URL for DB connection..."

#   until python - <<'PY'
# import os, sys
# from urllib.parse import urlparse
# import socket

# url = os.getenv("DATABASE_URL")
# if not url:
#     sys.exit(1)

# parsed = urlparse(url)
# host = parsed.hostname
# port = parsed.port or 5432

# try:
#     socket.create_connection((host, port), timeout=3)
#     sys.exit(0)
# except Exception:
#     sys.exit(1)
# PY
#   do
#     echo "⏳ Waiting for database..."
#     sleep 2
#   done

#   echo "✅ Database is ready"

# else
#   echo "⚠️ DATABASE_URL not set, skipping DB wait"
# fi


# echo "📦 Running migrations..."
# python manage.py migrate --noinput

# echo "📁 Collecting static files..."
# python manage.py collectstatic --noinput

# echo "🔥 Starting main process..."

# exec "$@"







set -e

echo "🚀 Starting backend entrypoint..."

if [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL for DB connection..."

  until python - <<'PY'
import os, sys
from urllib.parse import urlparse
import socket

url = os.getenv("DATABASE_URL")
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

echo "🧠 Making migrations..."
python manage.py makemigrations --noinput

echo "📦 Running migrations..."
python manage.py migrate --noinput

echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "🔥 Starting main process..."
exec "$@"